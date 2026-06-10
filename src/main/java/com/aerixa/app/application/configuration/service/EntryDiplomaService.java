package com.aerixa.app.application.configuration.service;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditAction;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEntityType;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEvent;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditOutcome;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.dto.CreateEntryDiplomaRequest;
import com.aerixa.app.application.configuration.dto.EntryDiplomaImportResultResponse;
import com.aerixa.app.application.configuration.dto.EntryDiplomaResponse;
import com.aerixa.app.application.configuration.dto.UpdateEntryDiplomaRequest;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.ConfigurationPermissions;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.configuration.entity.EntryDiploma;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.infrastructure.configuration.repository.EntryDiplomaJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.EstablishmentJpaRepository;
import com.aerixa.app.infrastructure.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.Normalizer;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EntryDiplomaService {

    private final EntryDiplomaJpaRepository entryDiplomaJpaRepository;
    private final EstablishmentJpaRepository establishmentJpaRepository;
    private final UserRepository userRepository;
    private final ConfigurationPermissionGuard configurationPermissionGuard;
    private final ConfigurationAuditPublisher configurationAuditPublisher;

    @Transactional
    public EntryDiplomaResponse create(UUID actorUserId, CreateEntryDiplomaRequest request, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ENTRY_DIPLOMAS_CREATE);

        try {
            UUID establishmentId = validateCreateRequest(request);
            assertEstablishmentAccess(actor, establishmentId);

            final String code;
            if (request.getCode() != null && !request.getCode().isBlank()) {
                code = request.getCode().trim().toUpperCase();
                if (entryDiplomaJpaRepository.existsByEstablishmentIdAndCodeIgnoreCase(establishmentId, code)) {
                    throw new IllegalArgumentException("Un diplome avec ce code existe deja pour cet etablissement");
                }
            } else {
                code = generateUniqueCode(request.getLabel().trim(), establishmentId);
            }

            Integer rankOrder = request.getRankOrder() != null ? request.getRankOrder() : 0;

            EntryDiploma entryDiploma = EntryDiploma.builder()
                    .establishmentId(establishmentId)
                    .code(code)
                    .label(request.getLabel().trim())
                    .rankOrder(rankOrder)
                    .active(true)
                    .createdByUserId(actor.getId())
                    .createdByLabel(actor.getEmail())
                    .build();

            EntryDiploma saved = entryDiplomaJpaRepository.save(entryDiploma);
            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.CREATE, saved.getId(), correlationId,
                    Map.of("after", toMap(saved)));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), request == null ? null : request.getEstablishmentId(), ConfigurationAuditAction.CREATE,
                    null, correlationId, "ENTRY_DIPLOMA_CREATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public List<EntryDiplomaResponse> list(UUID actorUserId, UUID establishmentId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ENTRY_DIPLOMAS_LIST);
        assertEstablishmentAccess(actor, establishmentId);

        List<EntryDiploma> diplomas = entryDiplomaJpaRepository.findAllByEstablishmentId(establishmentId,
                Sort.by(Sort.Direction.ASC, "rankOrder").and(Sort.by(Sort.Direction.ASC, "label")));

        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.LIST, null, correlationId,
                Map.of("count", diplomas.size()));

        return diplomas.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public EntryDiplomaResponse getById(UUID actorUserId, UUID establishmentId, UUID entryDiplomaId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ENTRY_DIPLOMAS_READ);
        assertEstablishmentAccess(actor, establishmentId);

        EntryDiploma entryDiploma = resolveByIdAndEstablishment(entryDiplomaId, establishmentId);
        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.READ, entryDiploma.getId(), correlationId, Map.of());
        return toResponse(entryDiploma);
    }

    @Transactional
    public EntryDiplomaResponse update(UUID actorUserId,
                                       UUID establishmentId,
                                       UUID entryDiplomaId,
                                       UpdateEntryDiplomaRequest request,
                                       String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ENTRY_DIPLOMAS_UPDATE);
        assertEstablishmentAccess(actor, establishmentId);

        EntryDiploma entryDiploma = resolveByIdAndEstablishment(entryDiplomaId, establishmentId);

        try {
            Map<String, Object> before = toMap(entryDiploma);
            applyUpdate(entryDiploma, request);
            entryDiploma.setUpdatedByUserId(actor.getId());
            entryDiploma.setUpdatedByLabel(actor.getEmail());
            EntryDiploma saved = entryDiplomaJpaRepository.save(entryDiploma);

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE, saved.getId(), correlationId,
                    Map.of("before", before, "after", toMap(saved)));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE,
                    entryDiplomaId, correlationId, "ENTRY_DIPLOMA_UPDATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public void delete(UUID actorUserId, UUID establishmentId, UUID entryDiplomaId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ENTRY_DIPLOMAS_DELETE);
        assertEstablishmentAccess(actor, establishmentId);

        EntryDiploma entryDiploma = resolveByIdAndEstablishment(entryDiplomaId, establishmentId);

        try {
            Map<String, Object> before = toMap(entryDiploma);
            entryDiplomaJpaRepository.delete(entryDiploma);

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE, entryDiplomaId, correlationId,
                    Map.of("before", before));
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE,
                    entryDiplomaId, correlationId, "ENTRY_DIPLOMA_DELETE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public EntryDiplomaResponse activate(UUID actorUserId, UUID establishmentId, UUID entryDiplomaId, String correlationId) {
        return changeActivation(actorUserId, establishmentId, entryDiplomaId, true,
                ConfigurationPermissions.ENTRY_DIPLOMAS_ACTIVATE, ConfigurationAuditAction.ACTIVATE, correlationId);
    }

    @Transactional
    public EntryDiplomaResponse deactivate(UUID actorUserId, UUID establishmentId, UUID entryDiplomaId, String correlationId) {
        return changeActivation(actorUserId, establishmentId, entryDiplomaId, false,
                ConfigurationPermissions.ENTRY_DIPLOMAS_DEACTIVATE, ConfigurationAuditAction.DEACTIVATE, correlationId);
    }

    @Transactional
    public void hardDelete(UUID actorUserId, UUID establishmentId, UUID entryDiplomaId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ENTRY_DIPLOMAS_HARD_DELETE);
        assertEstablishmentAccess(actor, establishmentId);

        EntryDiploma entryDiploma = entryDiplomaJpaRepository.findByIdAndEstablishmentId(entryDiplomaId, establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Diplome d'entree introuvable"));

        try {
            Map<String, Object> before = toMap(entryDiploma);
            entryDiplomaJpaRepository.hardDeleteByIdAndEstablishmentId(entryDiplomaId, establishmentId);

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.HARD_DELETE, entryDiplomaId, correlationId,
                    Map.of("before", before));
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.HARD_DELETE,
                    entryDiplomaId, correlationId, "ENTRY_DIPLOMA_HARD_DELETE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public byte[] exportToExcel(UUID actorUserId, UUID establishmentId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ENTRY_DIPLOMAS_EXPORT);
        assertEstablishmentAccess(actor, establishmentId);

        List<EntryDiploma> diplomas = entryDiplomaJpaRepository.findAllByEstablishmentId(establishmentId,
                Sort.by(Sort.Direction.ASC, "rankOrder").and(Sort.by(Sort.Direction.ASC, "label")));

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("entry-diplomas");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("code");
            header.createCell(1).setCellValue("label");
            header.createCell(2).setCellValue("rankOrder");
            header.createCell(3).setCellValue("active");
            header.createCell(4).setCellValue("createdAt");

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            int rowIndex = 1;
            for (EntryDiploma diploma : diplomas) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(diploma.getCode());
                row.createCell(1).setCellValue(diploma.getLabel());
                row.createCell(2).setCellValue(diploma.getRankOrder() != null ? diploma.getRankOrder() : 0);
                row.createCell(3).setCellValue(diploma.isActive() ? "true" : "false");
                row.createCell(4).setCellValue(diploma.getCreatedAt() != null ? formatter.format(diploma.getCreatedAt()) : "");
            }

            for (int i = 0; i <= 4; i++) sheet.autoSizeColumn(i);
            workbook.write(out);

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.EXPORT, null, correlationId,
                    Map.of("count", diplomas.size()));

            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de generer l'export Excel des diplomes d'entree", ex);
        }
    }

    @Transactional(readOnly = true)
    public byte[] generateImportTemplate() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("import-entry-diplomas");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("code");
            header.createCell(1).setCellValue("label*");
            header.createCell(2).setCellValue("rankOrder");
            header.createCell(3).setCellValue("active");

            Row sample = sheet.createRow(1);
            sample.createCell(0).setCellValue("BAC");
            sample.createCell(1).setCellValue("Baccalauréat");
            sample.createCell(2).setCellValue(1);
            sample.createCell(3).setCellValue("true");

            Sheet meta = workbook.createSheet("metadata");
            meta.createRow(0).createCell(0).setCellValue("code: identifiant unique du diplome (optionnel, genere automatiquement depuis le label si vide)");
            meta.createRow(1).createCell(0).setCellValue("rankOrder: entier positif, rang d'elevation academique");
            meta.createRow(2).createCell(0).setCellValue("active: true ou false (defaut: true si vide)");

            for (int i = 0; i <= 3; i++) sheet.autoSizeColumn(i);
            meta.autoSizeColumn(0);

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de generer le template d'import Excel", ex);
        }
    }

    @Transactional
    public EntryDiplomaImportResultResponse importFromExcel(UUID actorUserId, UUID establishmentId, MultipartFile file, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ENTRY_DIPLOMAS_IMPORT);
        assertEstablishmentAccess(actor, establishmentId);

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier d'import est vide");
        }

        DataFormatter formatter = new DataFormatter();
        int totalRows = 0;
        int created = 0;
        List<String> errors = new ArrayList<>();

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                String code = readCell(row, 0, formatter).trim().toUpperCase();
                String label = readCell(row, 1, formatter).trim();

                if (code.isEmpty() && label.isEmpty()) continue;

                totalRows++;
                try {
                    if (label.isEmpty()) throw new IllegalArgumentException("label obligatoire");

                    String rankRaw = readCell(row, 2, formatter).trim();
                    Integer rankOrder = rankRaw.isEmpty() ? 0 : Integer.parseInt(rankRaw);

                    String activeRaw = readCell(row, 3, formatter).trim().toLowerCase();
                    boolean active = activeRaw.isEmpty() || activeRaw.equals("true") || activeRaw.equals("1");

                    String finalCode = code.isEmpty() ? generateUniqueCode(label, establishmentId) : code;

                    if (!code.isEmpty() && entryDiplomaJpaRepository.existsByEstablishmentIdAndCodeIgnoreCase(establishmentId, code)) {
                        errors.add("Ligne " + (i + 1) + ": code '" + code + "' deja utilise");
                        continue;
                    }

                    EntryDiploma diploma = EntryDiploma.builder()
                            .establishmentId(establishmentId)
                            .code(finalCode)
                            .label(label)
                            .rankOrder(rankOrder)
                            .active(active)
                            .createdByUserId(actor.getId())
                            .createdByLabel(actor.getEmail())
                            .build();
                    entryDiplomaJpaRepository.save(diploma);
                    created++;
                } catch (Exception ex) {
                    errors.add("Ligne " + (i + 1) + ": " + ex.getMessage());
                }
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de lire le fichier d'import", ex);
        }

        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.IMPORT, null, correlationId,
                Map.of("totalRows", totalRows, "created", created, "failed", errors.size()));

        return EntryDiplomaImportResultResponse.builder()
                .totalRows(totalRows)
                .created(created)
                .failed(errors.size())
                .errors(errors)
                .build();
    }

    private String readCell(Row row, int index, DataFormatter formatter) {
        org.apache.poi.ss.usermodel.Cell cell = row.getCell(index);
        return cell == null ? "" : formatter.formatCellValue(cell);
    }

    private EntryDiplomaResponse changeActivation(UUID actorUserId,
                                                  UUID establishmentId,
                                                  UUID entryDiplomaId,
                                                  boolean targetActive,
                                                  String permission,
                                                  ConfigurationAuditAction action,
                                                  String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, permission);
        assertEstablishmentAccess(actor, establishmentId);

        EntryDiploma entryDiploma = resolveByIdAndEstablishment(entryDiplomaId, establishmentId);
        try {
            boolean before = entryDiploma.isActive();
            entryDiploma.setActive(targetActive);
            EntryDiploma saved = entryDiplomaJpaRepository.save(entryDiploma);

            publishSuccess(actor.getId(), establishmentId, action, saved.getId(), correlationId,
                    Map.of("before", Map.of("active", before), "after", Map.of("active", saved.isActive())));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, action, entryDiplomaId, correlationId,
                    action == ConfigurationAuditAction.ACTIVATE ? "ENTRY_DIPLOMA_ACTIVATE_FAILED" : "ENTRY_DIPLOMA_DEACTIVATE_FAILED",
                    ex);
            throw ex;
        }
    }

    private UUID validateCreateRequest(CreateEntryDiplomaRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("La requete est obligatoire");
        }
        if (request.getEstablishmentId() == null) {
            throw new IllegalArgumentException("establishmentId est obligatoire");
        }
        if (request.getLabel() == null || request.getLabel().isBlank()) {
            throw new IllegalArgumentException("Le label est obligatoire");
        }
        if (request.getRankOrder() != null) {
            validateRankOrder(request.getRankOrder());
        }
        return request.getEstablishmentId();
    }

    private String generateUniqueCode(String label, UUID establishmentId) {
        String normalized = Normalizer.normalize(label, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toUpperCase()
                .replaceAll("[^A-Z0-9]", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_+|_+$", "");
        if (normalized.length() > 25) {
            normalized = normalized.substring(0, 25).replaceAll("_+$", "");
        }
        if (normalized.isEmpty()) {
            normalized = "DIPLOME";
        }
        String candidate = normalized;
        int counter = 1;
        while (entryDiplomaJpaRepository.existsByEstablishmentIdAndCodeIgnoreCase(establishmentId, candidate)) {
            candidate = normalized + "_" + counter;
            counter++;
        }
        return candidate;
    }

    private void applyUpdate(EntryDiploma entryDiploma, UpdateEntryDiplomaRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("La requete est obligatoire");
        }
        if (request.getLabel() != null) {
            if (request.getLabel().isBlank()) {
                throw new IllegalArgumentException("Le label ne peut pas etre vide");
            }
            entryDiploma.setLabel(request.getLabel().trim());
        }
        if (request.getRankOrder() != null) {
            validateRankOrder(request.getRankOrder());
            entryDiploma.setRankOrder(request.getRankOrder());
        }
    }

    private void validateRankOrder(Integer rankOrder) {
        if (rankOrder == null || rankOrder <= 0) {
            throw new IllegalArgumentException("rankOrder doit etre un entier strictement positif");
        }
    }

    private EntryDiploma resolveByIdAndEstablishment(UUID entryDiplomaId, UUID establishmentId) {
        return entryDiplomaJpaRepository.findByIdAndEstablishmentId(entryDiplomaId, establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Diplome d'entree introuvable"));
    }

    private void assertEstablishmentAccess(User actor, UUID establishmentId) {
        Establishment establishment = establishmentJpaRepository.findById(establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Etablissement introuvable"));

        if (!actor.hasRole("SUPER_ADMIN") && !actor.getId().equals(establishment.getCreatedByUserId())) {
            throw new com.aerixa.app.domain.auth.exception.PermissionDeniedException("establishments:scope");
        }
    }

    private User actor(UUID actorUserId) {
        return userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
    }

    private EntryDiplomaResponse toResponse(EntryDiploma entryDiploma) {
        return EntryDiplomaResponse.builder()
                .id(entryDiploma.getId())
                .establishmentId(entryDiploma.getEstablishmentId())
                .code(entryDiploma.getCode())
                .label(entryDiploma.getLabel())
                .rankOrder(entryDiploma.getRankOrder())
                .active(entryDiploma.isActive())
                .createdAt(entryDiploma.getCreatedAt())
                .updatedAt(entryDiploma.getUpdatedAt())
                .createdByUserId(entryDiploma.getCreatedByUserId())
                .createdByLabel(entryDiploma.getCreatedByLabel())
                .updatedByUserId(entryDiploma.getUpdatedByUserId())
                .updatedByLabel(entryDiploma.getUpdatedByLabel())
                .build();
    }

    private Map<String, Object> toMap(EntryDiploma entryDiploma) {
        return Map.of(
                "id", entryDiploma.getId().toString(),
                "establishmentId", entryDiploma.getEstablishmentId().toString(),
                "code", entryDiploma.getCode(),
                "label", entryDiploma.getLabel(),
                "rankOrder", entryDiploma.getRankOrder(),
                "active", entryDiploma.isActive()
        );
    }

    private void publishSuccess(UUID actorId,
                                UUID establishmentId,
                                ConfigurationAuditAction action,
                                UUID entityId,
                                String correlationId,
                                Map<String, Object> payloadDiff) {
        configurationAuditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.ENTRY_DIPLOMA)
                .entityId(entityId)
                .correlationId(normalizeCorrelationId(correlationId))
                .outcome(ConfigurationAuditOutcome.SUCCESS)
                .payloadDiff(payloadDiff)
                .build());
    }

    private void publishFailure(UUID actorId,
                                UUID establishmentId,
                                ConfigurationAuditAction action,
                                UUID entityId,
                                String correlationId,
                                String reasonCode,
                                RuntimeException exception) {
        configurationAuditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId == null ? UUID.fromString("00000000-0000-0000-0000-000000000000") : establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.ENTRY_DIPLOMA)
                .entityId(entityId)
                .correlationId(normalizeCorrelationId(correlationId))
                .outcome(ConfigurationAuditOutcome.FAILURE)
                .reasonCode(reasonCode)
                .errorMessage(exception.getMessage())
                .payloadDiff(Map.of())
                .build());
    }

    private String normalizeCorrelationId(String correlationId) {
        return correlationId == null || correlationId.isBlank() ? UUID.randomUUID().toString() : correlationId.trim();
    }
}
