package com.aerixa.app.application.configuration.service;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditAction;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEntityType;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEvent;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditOutcome;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.dto.AcademicLevelImportResultResponse;
import com.aerixa.app.application.configuration.dto.AcademicLevelResponse;
import com.aerixa.app.application.configuration.dto.CreateAcademicLevelRequest;
import com.aerixa.app.application.configuration.dto.EntryDiplomaResponse;
import com.aerixa.app.application.configuration.dto.UpdateAcademicLevelRequest;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.ConfigurationPermissions;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.configuration.entity.AcademicLevel;
import com.aerixa.app.domain.configuration.entity.EntryDiploma;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.infrastructure.configuration.repository.AcademicLevelJpaRepository;
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
public class AcademicLevelService {

    private final AcademicLevelJpaRepository academicLevelJpaRepository;
    private final EntryDiplomaJpaRepository entryDiplomaJpaRepository;
    private final EstablishmentJpaRepository establishmentJpaRepository;
    private final UserRepository userRepository;
    private final ConfigurationPermissionGuard configurationPermissionGuard;
    private final ConfigurationAuditPublisher configurationAuditPublisher;

    @Transactional
    public AcademicLevelResponse create(UUID actorUserId, CreateAcademicLevelRequest request, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ACADEMIC_LEVELS_CREATE);

        try {
            UUID establishmentId = validateCreateRequest(request);
            assertEstablishmentAccess(actor, establishmentId);

            final String code;
            if (request.getCode() != null && !request.getCode().isBlank()) {
                code = request.getCode().trim().toUpperCase();
                if (academicLevelJpaRepository.existsByEstablishmentIdAndCodeIgnoreCase(establishmentId, code)) {
                    throw new IllegalArgumentException("Un niveau academique avec ce code existe deja pour cet etablissement");
                }
            } else {
                code = generateUniqueCode(request.getLabel().trim(), establishmentId);
            }

            Integer rankOrder = request.getRankOrder() != null ? request.getRankOrder() : 1;
            validateRankOrder(rankOrder);
            if (academicLevelJpaRepository.existsByEstablishmentIdAndRankOrder(establishmentId, rankOrder)) {
                throw new IllegalArgumentException("Ce rang est deja utilise par un autre niveau academique");
            }

            AcademicLevel academicLevel = AcademicLevel.builder()
                    .establishmentId(establishmentId)
                    .code(code)
                    .label(request.getLabel().trim())
                    .rankOrder(rankOrder)
                    .active(true)
                    .createdByUserId(actor.getId())
                    .createdByLabel(actor.getEmail())
                    .build();

            AcademicLevel saved = academicLevelJpaRepository.save(academicLevel);
            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.CREATE, saved.getId(), correlationId,
                    Map.of("after", toMap(saved)));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), request == null ? null : request.getEstablishmentId(), ConfigurationAuditAction.CREATE,
                    null, correlationId, "ACADEMIC_LEVEL_CREATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public List<AcademicLevelResponse> list(UUID actorUserId, UUID establishmentId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ACADEMIC_LEVELS_LIST);
        assertEstablishmentAccess(actor, establishmentId);

        List<AcademicLevel> levels = academicLevelJpaRepository.findAllByEstablishmentId(establishmentId,
                Sort.by(Sort.Direction.ASC, "rankOrder").and(Sort.by(Sort.Direction.ASC, "label")));

        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.LIST, null, correlationId,
                Map.of("count", levels.size()));
        return levels.stream().map(this::toResponseWithCount).toList();
    }

    @Transactional(readOnly = true)
    public AcademicLevelResponse getById(UUID actorUserId, UUID establishmentId, UUID academicLevelId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ACADEMIC_LEVELS_READ);
        assertEstablishmentAccess(actor, establishmentId);

        AcademicLevel level = resolveByIdAndEstablishment(academicLevelId, establishmentId);
        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.READ, level.getId(), correlationId, Map.of());
        return toResponseWithCount(level);
    }

    @Transactional
    public AcademicLevelResponse update(UUID actorUserId,
                                        UUID establishmentId,
                                        UUID academicLevelId,
                                        UpdateAcademicLevelRequest request,
                                        String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ACADEMIC_LEVELS_UPDATE);
        assertEstablishmentAccess(actor, establishmentId);

        AcademicLevel level = resolveByIdAndEstablishment(academicLevelId, establishmentId);

        try {
            Map<String, Object> before = toMap(level);
            applyUpdate(level, request);
            level.setUpdatedByUserId(actor.getId());
            level.setUpdatedByLabel(actor.getEmail());
            AcademicLevel saved = academicLevelJpaRepository.save(level);

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE, saved.getId(), correlationId,
                    Map.of("before", before, "after", toMap(saved)));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE,
                    academicLevelId, correlationId, "ACADEMIC_LEVEL_UPDATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public void delete(UUID actorUserId, UUID establishmentId, UUID academicLevelId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ACADEMIC_LEVELS_DELETE);
        assertEstablishmentAccess(actor, establishmentId);

        AcademicLevel level = resolveByIdAndEstablishment(academicLevelId, establishmentId);

        try {
            Map<String, Object> before = toMap(level);
            academicLevelJpaRepository.delete(level);

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE, academicLevelId, correlationId,
                    Map.of("before", before));
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE,
                    academicLevelId, correlationId, "ACADEMIC_LEVEL_DELETE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public void hardDelete(UUID actorUserId, UUID establishmentId, UUID academicLevelId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ACADEMIC_LEVELS_HARD_DELETE);
        assertEstablishmentAccess(actor, establishmentId);

        AcademicLevel level = academicLevelJpaRepository.findByIdAndEstablishmentId(academicLevelId, establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Niveau academique introuvable"));

        try {
            Map<String, Object> before = toMap(level);
            academicLevelJpaRepository.hardDeleteByIdAndEstablishmentId(academicLevelId, establishmentId);

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.HARD_DELETE, academicLevelId, correlationId,
                    Map.of("before", before));
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.HARD_DELETE,
                    academicLevelId, correlationId, "ACADEMIC_LEVEL_HARD_DELETE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public AcademicLevelResponse activate(UUID actorUserId, UUID establishmentId, UUID academicLevelId, String correlationId) {
        return changeActivation(actorUserId, establishmentId, academicLevelId, true,
                ConfigurationPermissions.ACADEMIC_LEVELS_ACTIVATE, ConfigurationAuditAction.ACTIVATE, correlationId);
    }

    @Transactional
    public AcademicLevelResponse deactivate(UUID actorUserId, UUID establishmentId, UUID academicLevelId, String correlationId) {
        return changeActivation(actorUserId, establishmentId, academicLevelId, false,
                ConfigurationPermissions.ACADEMIC_LEVELS_DEACTIVATE, ConfigurationAuditAction.DEACTIVATE, correlationId);
    }

    @Transactional(readOnly = true)
    public byte[] exportToExcel(UUID actorUserId, UUID establishmentId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ACADEMIC_LEVELS_EXPORT);
        assertEstablishmentAccess(actor, establishmentId);

        List<AcademicLevel> levels = academicLevelJpaRepository.findAllByEstablishmentId(establishmentId,
                Sort.by(Sort.Direction.ASC, "rankOrder").and(Sort.by(Sort.Direction.ASC, "label")));

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("academic-levels");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("code");
            header.createCell(1).setCellValue("label");
            header.createCell(2).setCellValue("rankOrder");
            header.createCell(3).setCellValue("active");
            header.createCell(4).setCellValue("createdAt");

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            int rowIndex = 1;
            for (AcademicLevel level : levels) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(level.getCode());
                row.createCell(1).setCellValue(level.getLabel());
                row.createCell(2).setCellValue(level.getRankOrder() != null ? level.getRankOrder() : 0);
                row.createCell(3).setCellValue(level.isActive() ? "true" : "false");
                row.createCell(4).setCellValue(level.getCreatedAt() != null ? formatter.format(level.getCreatedAt()) : "");
            }

            for (int i = 0; i <= 4; i++) sheet.autoSizeColumn(i);
            workbook.write(out);

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.EXPORT, null, correlationId,
                    Map.of("count", levels.size()));

            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de generer l'export Excel des niveaux academiques", ex);
        }
    }

    @Transactional(readOnly = true)
    public byte[] generateImportTemplate() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("import-academic-levels");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("label*");
            header.createCell(1).setCellValue("rankOrder*");
            header.createCell(2).setCellValue("active");

            Row sample = sheet.createRow(1);
            sample.createCell(0).setCellValue("Licence 1");
            sample.createCell(1).setCellValue(1);
            sample.createCell(2).setCellValue("true");

            Sheet meta = workbook.createSheet("metadata");
            meta.createRow(0).createCell(0).setCellValue("label: intitule du niveau academique (obligatoire)");
            meta.createRow(1).createCell(0).setCellValue("rankOrder: entier strictement positif, ordre du niveau (obligatoire)");
            meta.createRow(2).createCell(0).setCellValue("active: true ou false (defaut: true si vide)");
            meta.createRow(3).createCell(0).setCellValue("Le code est genere automatiquement depuis le label");

            for (int i = 0; i <= 2; i++) sheet.autoSizeColumn(i);
            meta.autoSizeColumn(0);

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de generer le template d'import Excel", ex);
        }
    }

    @Transactional
    public AcademicLevelImportResultResponse importFromExcel(UUID actorUserId, UUID establishmentId, MultipartFile file, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ACADEMIC_LEVELS_IMPORT);
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

                String label = readCell(row, 0, formatter).trim();
                String rankRaw = readCell(row, 1, formatter).trim();

                if (label.isEmpty() && rankRaw.isEmpty()) continue;

                totalRows++;
                try {
                    if (label.isEmpty()) throw new IllegalArgumentException("label obligatoire");
                    if (rankRaw.isEmpty()) throw new IllegalArgumentException("rankOrder obligatoire");

                    int rankOrder = Integer.parseInt(rankRaw);
                    validateRankOrder(rankOrder);

                    String activeRaw = readCell(row, 2, formatter).trim().toLowerCase();
                    boolean active = activeRaw.isEmpty() || activeRaw.equals("true") || activeRaw.equals("1");

                    String code = generateUniqueCode(label, establishmentId);

                    if (academicLevelJpaRepository.existsByEstablishmentIdAndRankOrder(establishmentId, rankOrder)) {
                        errors.add("Ligne " + (i + 1) + ": rang " + rankOrder + " deja utilise");
                        continue;
                    }

                    AcademicLevel level = AcademicLevel.builder()
                            .establishmentId(establishmentId)
                            .code(code)
                            .label(label)
                            .rankOrder(rankOrder)
                            .active(active)
                            .createdByUserId(actor.getId())
                            .createdByLabel(actor.getEmail())
                            .build();
                    academicLevelJpaRepository.save(level);
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

        return AcademicLevelImportResultResponse.builder()
                .totalRows(totalRows)
                .created(created)
                .failed(errors.size())
                .errors(errors)
                .build();
    }

    @Transactional
    public void attachEntryDiploma(UUID actorUserId, UUID establishmentId, UUID academicLevelId, UUID entryDiplomaId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ACADEMIC_LEVELS_ATTACH_ENTRY_DIPLOMA);
        assertEstablishmentAccess(actor, establishmentId);

        resolveByIdAndEstablishment(academicLevelId, establishmentId);

        entryDiplomaJpaRepository.findByIdAndEstablishmentId(entryDiplomaId, establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Diplome d'entree introuvable ou n'appartient pas a cet etablissement"));

        try {
            academicLevelJpaRepository.attachEntryDiploma(academicLevelId, entryDiplomaId, actor.getId());

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE, academicLevelId, correlationId,
                    Map.of("action", "attach_entry_diploma", "entryDiplomaId", entryDiplomaId.toString()));
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE,
                    academicLevelId, correlationId, "ACADEMIC_LEVEL_ATTACH_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public void detachEntryDiploma(UUID actorUserId, UUID establishmentId, UUID academicLevelId, UUID entryDiplomaId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ACADEMIC_LEVELS_DETACH_ENTRY_DIPLOMA);
        assertEstablishmentAccess(actor, establishmentId);

        resolveByIdAndEstablishment(academicLevelId, establishmentId);

        try {
            academicLevelJpaRepository.detachEntryDiploma(academicLevelId, entryDiplomaId);

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE, academicLevelId, correlationId,
                    Map.of("action", "detach_entry_diploma", "entryDiplomaId", entryDiplomaId.toString()));
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE,
                    academicLevelId, correlationId, "ACADEMIC_LEVEL_DETACH_FAILED", ex);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public List<EntryDiplomaResponse> listEntryDiplomas(UUID actorUserId, UUID establishmentId, UUID academicLevelId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ACADEMIC_LEVELS_READ);
        assertEstablishmentAccess(actor, establishmentId);

        resolveByIdAndEstablishment(academicLevelId, establishmentId);

        List<EntryDiploma> diplomas = entryDiplomaJpaRepository.findByAcademicLevelId(academicLevelId);
        return diplomas.stream().map(this::toEntryDiplomaResponse).toList();
    }

    // ── private helpers ──────────────────────────────────────────────────────────

    private AcademicLevelResponse changeActivation(UUID actorUserId,
                                                   UUID establishmentId,
                                                   UUID academicLevelId,
                                                   boolean targetActive,
                                                   String permission,
                                                   ConfigurationAuditAction action,
                                                   String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, permission);
        assertEstablishmentAccess(actor, establishmentId);

        AcademicLevel level = resolveByIdAndEstablishment(academicLevelId, establishmentId);
        try {
            boolean before = level.isActive();
            level.setActive(targetActive);
            AcademicLevel saved = academicLevelJpaRepository.save(level);

            publishSuccess(actor.getId(), establishmentId, action, saved.getId(), correlationId,
                    Map.of("before", Map.of("active", before), "after", Map.of("active", saved.isActive())));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, action, academicLevelId, correlationId,
                    action == ConfigurationAuditAction.ACTIVATE ? "ACADEMIC_LEVEL_ACTIVATE_FAILED" : "ACADEMIC_LEVEL_DEACTIVATE_FAILED",
                    ex);
            throw ex;
        }
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
            normalized = "NIVEAU";
        }
        String candidate = normalized;
        int counter = 1;
        while (academicLevelJpaRepository.existsByEstablishmentIdAndCodeIgnoreCase(establishmentId, candidate)) {
            candidate = normalized + "_" + counter;
            counter++;
        }
        return candidate;
    }

    private UUID validateCreateRequest(CreateAcademicLevelRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("La requete est obligatoire");
        }
        if (request.getEstablishmentId() == null) {
            throw new IllegalArgumentException("establishmentId est obligatoire");
        }
        if (request.getLabel() == null || request.getLabel().isBlank()) {
            throw new IllegalArgumentException("Le label est obligatoire");
        }
        return request.getEstablishmentId();
    }

    private void applyUpdate(AcademicLevel level, UpdateAcademicLevelRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("La requete est obligatoire");
        }
        if (request.getLabel() != null) {
            if (request.getLabel().isBlank()) {
                throw new IllegalArgumentException("Le label ne peut pas etre vide");
            }
            level.setLabel(request.getLabel().trim());
        }
        if (request.getRankOrder() != null) {
            validateRankOrder(request.getRankOrder());
            if (academicLevelJpaRepository.existsByEstablishmentIdAndRankOrderAndIdNot(
                    level.getEstablishmentId(), request.getRankOrder(), level.getId())) {
                throw new IllegalArgumentException("Ce rang est deja utilise par un autre niveau academique");
            }
            level.setRankOrder(request.getRankOrder());
        }
    }

    private void validateRankOrder(Integer rankOrder) {
        if (rankOrder == null || rankOrder <= 0) {
            throw new IllegalArgumentException("rankOrder doit etre un entier strictement positif");
        }
    }

    private AcademicLevel resolveByIdAndEstablishment(UUID academicLevelId, UUID establishmentId) {
        return academicLevelJpaRepository.findByIdAndEstablishmentId(academicLevelId, establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Niveau academique introuvable"));
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

    private AcademicLevelResponse toResponse(AcademicLevel level) {
        return AcademicLevelResponse.builder()
                .id(level.getId())
                .establishmentId(level.getEstablishmentId())
                .code(level.getCode())
                .label(level.getLabel())
                .rankOrder(level.getRankOrder())
                .active(level.isActive())
                .createdAt(level.getCreatedAt())
                .updatedAt(level.getUpdatedAt())
                .createdByUserId(level.getCreatedByUserId())
                .createdByLabel(level.getCreatedByLabel())
                .updatedByUserId(level.getUpdatedByUserId())
                .updatedByLabel(level.getUpdatedByLabel())
                .build();
    }

    private AcademicLevelResponse toResponseWithCount(AcademicLevel level) {
        AcademicLevelResponse response = toResponse(level);
        response.setEntryDiplomasCount((int) academicLevelJpaRepository.countEntryDiplomas(level.getId()));
        return response;
    }

    private EntryDiplomaResponse toEntryDiplomaResponse(EntryDiploma d) {
        return EntryDiplomaResponse.builder()
                .id(d.getId())
                .establishmentId(d.getEstablishmentId())
                .code(d.getCode())
                .label(d.getLabel())
                .rankOrder(d.getRankOrder())
                .active(d.isActive())
                .createdAt(d.getCreatedAt())
                .updatedAt(d.getUpdatedAt())
                .createdByUserId(d.getCreatedByUserId())
                .createdByLabel(d.getCreatedByLabel())
                .updatedByUserId(d.getUpdatedByUserId())
                .updatedByLabel(d.getUpdatedByLabel())
                .build();
    }

    private Map<String, Object> toMap(AcademicLevel level) {
        return Map.of(
                "id", level.getId().toString(),
                "establishmentId", level.getEstablishmentId().toString(),
                "code", level.getCode(),
                "label", level.getLabel(),
                "rankOrder", level.getRankOrder(),
                "active", level.isActive()
        );
    }

    private String readCell(Row row, int index, DataFormatter formatter) {
        org.apache.poi.ss.usermodel.Cell cell = row.getCell(index);
        return cell == null ? "" : formatter.formatCellValue(cell);
    }

    private void publishSuccess(UUID actorId, UUID establishmentId, ConfigurationAuditAction action,
                                UUID entityId, String correlationId, Map<String, Object> payloadDiff) {
        configurationAuditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.ACADEMIC_LEVEL)
                .entityId(entityId)
                .correlationId(normalizeCorrelationId(correlationId))
                .outcome(ConfigurationAuditOutcome.SUCCESS)
                .payloadDiff(payloadDiff)
                .build());
    }

    private void publishFailure(UUID actorId, UUID establishmentId, ConfigurationAuditAction action,
                                UUID entityId, String correlationId, String reasonCode, RuntimeException exception) {
        configurationAuditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId == null ? UUID.fromString("00000000-0000-0000-0000-000000000000") : establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.ACADEMIC_LEVEL)
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
