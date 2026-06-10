package com.aerixa.app.application.configuration.service;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditAction;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEntityType;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEvent;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditOutcome;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.dto.CreateProgramTrackRequest;
import com.aerixa.app.application.configuration.dto.ProgramTrackResponse;
import com.aerixa.app.application.configuration.dto.UpdateProgramTrackRequest;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.ConfigurationPermissions;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.domain.configuration.entity.ProgramTrack;
import com.aerixa.app.infrastructure.configuration.repository.EstablishmentJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.ProgramTrackJpaRepository;
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
public class ProgramTrackService {

    private final ProgramTrackJpaRepository programTrackJpaRepository;
    private final EstablishmentJpaRepository establishmentJpaRepository;
    private final UserRepository userRepository;
    private final ConfigurationPermissionGuard configurationPermissionGuard;
    private final ConfigurationAuditPublisher configurationAuditPublisher;

    @Transactional
    public ProgramTrackResponse create(UUID actorUserId, CreateProgramTrackRequest request, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.PROGRAM_TRACKS_CREATE);

        try {
            UUID establishmentId = validateCreateRequest(request);
            assertEstablishmentAccess(actor, establishmentId);

            final String code;
            if (request.getCode() != null && !request.getCode().isBlank()) {
                code = request.getCode().trim().toUpperCase();
                if (programTrackJpaRepository.existsByEstablishmentIdAndCodeIgnoreCase(establishmentId, code)) {
                    throw new IllegalArgumentException("Une filiere avec ce code existe deja pour cet etablissement");
                }
            } else {
                code = generateUniqueCode(request.getName().trim(), establishmentId);
            }

            ProgramTrack saved = programTrackJpaRepository.save(ProgramTrack.builder()
                    .establishmentId(establishmentId)
                    .code(code)
                    .name(request.getName().trim())
                    .description(blankToNull(request.getDescription()))
                    .active(true)
                    .createdByUserId(actor.getId())
                    .createdByLabel(actor.getEmail())
                    .build());

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.CREATE, saved.getId(), correlationId,
                    Map.of("after", toMap(saved)));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), request == null ? null : request.getEstablishmentId(), ConfigurationAuditAction.CREATE,
                    null, correlationId, "PROGRAM_TRACK_CREATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public List<ProgramTrackResponse> list(UUID actorUserId, UUID establishmentId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.PROGRAM_TRACKS_LIST);
        assertEstablishmentAccess(actor, establishmentId);

        List<ProgramTrack> items = programTrackJpaRepository.findAllByEstablishmentId(establishmentId,
                Sort.by(Sort.Direction.ASC, "name"));
        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.LIST, null, correlationId,
                Map.of("count", items.size()));
        return items.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ProgramTrackResponse getById(UUID actorUserId, UUID establishmentId, UUID programTrackId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.PROGRAM_TRACKS_READ);
        assertEstablishmentAccess(actor, establishmentId);

        ProgramTrack item = resolveScoped(programTrackId, establishmentId);
        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.READ, item.getId(), correlationId, Map.of());
        return toResponse(item);
    }

    @Transactional
    public ProgramTrackResponse update(UUID actorUserId, UUID establishmentId, UUID programTrackId, UpdateProgramTrackRequest request, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.PROGRAM_TRACKS_UPDATE);
        assertEstablishmentAccess(actor, establishmentId);
        ProgramTrack item = resolveScoped(programTrackId, establishmentId);

        try {
            if (request == null) {
                throw new IllegalArgumentException("La requete de mise a jour est obligatoire");
            }
            Map<String, Object> before = toMap(item);

            if (request.getName() != null) {
                if (request.getName().isBlank()) {
                    throw new IllegalArgumentException("Le nom est obligatoire");
                }
                item.setName(request.getName().trim());
            }
            if (request.getDescription() != null) {
                item.setDescription(blankToNull(request.getDescription()));
            }
            item.setUpdatedByUserId(actor.getId());
            item.setUpdatedByLabel(actor.getEmail());

            ProgramTrack saved = programTrackJpaRepository.save(item);
            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE, saved.getId(), correlationId,
                    Map.of("before", before, "after", toMap(saved)));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE, programTrackId, correlationId,
                    "PROGRAM_TRACK_UPDATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public void delete(UUID actorUserId, UUID establishmentId, UUID programTrackId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.PROGRAM_TRACKS_DELETE);
        assertEstablishmentAccess(actor, establishmentId);
        ProgramTrack item = resolveScoped(programTrackId, establishmentId);

        try {
            Map<String, Object> before = toMap(item);
            programTrackJpaRepository.delete(item);
            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE, programTrackId, correlationId,
                    Map.of("before", before));
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE, programTrackId, correlationId,
                    "PROGRAM_TRACK_DELETE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public void hardDelete(UUID actorUserId, UUID establishmentId, UUID programTrackId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.PROGRAM_TRACKS_HARD_DELETE);
        assertEstablishmentAccess(actor, establishmentId);

        programTrackJpaRepository.findByIdAndEstablishmentId(programTrackId, establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Filiere introuvable"));

        try {
            programTrackJpaRepository.hardDeleteByIdAndEstablishmentId(programTrackId, establishmentId);
            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.HARD_DELETE, programTrackId, correlationId,
                    Map.of("action", "hard_delete"));
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.HARD_DELETE, programTrackId, correlationId,
                    "PROGRAM_TRACK_HARD_DELETE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public ProgramTrackResponse activate(UUID actorUserId, UUID establishmentId, UUID programTrackId, String correlationId) {
        return changeActive(actorUserId, establishmentId, programTrackId, true,
                ConfigurationPermissions.PROGRAM_TRACKS_ACTIVATE, ConfigurationAuditAction.ACTIVATE, correlationId);
    }

    @Transactional
    public ProgramTrackResponse deactivate(UUID actorUserId, UUID establishmentId, UUID programTrackId, String correlationId) {
        return changeActive(actorUserId, establishmentId, programTrackId, false,
                ConfigurationPermissions.PROGRAM_TRACKS_DEACTIVATE, ConfigurationAuditAction.DEACTIVATE, correlationId);
    }

    @Transactional(readOnly = true)
    public byte[] exportToExcel(UUID actorUserId, UUID establishmentId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.PROGRAM_TRACKS_EXPORT);
        assertEstablishmentAccess(actor, establishmentId);

        List<ProgramTrack> items = programTrackJpaRepository.findAllByEstablishmentId(establishmentId,
                Sort.by(Sort.Direction.ASC, "name"));

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("program-tracks");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("code");
            header.createCell(1).setCellValue("name");
            header.createCell(2).setCellValue("description");
            header.createCell(3).setCellValue("active");
            header.createCell(4).setCellValue("createdAt");

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            int rowIndex = 1;
            for (ProgramTrack item : items) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(item.getCode());
                row.createCell(1).setCellValue(item.getName());
                row.createCell(2).setCellValue(item.getDescription() != null ? item.getDescription() : "");
                row.createCell(3).setCellValue(item.isActive() ? "true" : "false");
                row.createCell(4).setCellValue(item.getCreatedAt() != null ? formatter.format(item.getCreatedAt()) : "");
            }

            for (int i = 0; i <= 4; i++) sheet.autoSizeColumn(i);
            workbook.write(out);

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.EXPORT, null, correlationId,
                    Map.of("count", items.size()));
            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de generer l'export Excel des filieres", ex);
        }
    }

    @Transactional(readOnly = true)
    public byte[] generateImportTemplate() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("import-program-tracks");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("name*");
            header.createCell(1).setCellValue("code");
            header.createCell(2).setCellValue("description");
            header.createCell(3).setCellValue("active");

            Row sample = sheet.createRow(1);
            sample.createCell(0).setCellValue("Informatique");
            sample.createCell(1).setCellValue("INFO");
            sample.createCell(2).setCellValue("Filiere informatique");
            sample.createCell(3).setCellValue("true");

            Sheet meta = workbook.createSheet("metadata");
            meta.createRow(0).createCell(0).setCellValue("name: intitule de la filiere (obligatoire)");
            meta.createRow(1).createCell(0).setCellValue("code: code unique de la filiere (optionnel, genere automatiquement si vide)");
            meta.createRow(2).createCell(0).setCellValue("description: description de la filiere (optionnel)");
            meta.createRow(3).createCell(0).setCellValue("active: true ou false (defaut: true si vide)");

            for (int i = 0; i <= 3; i++) sheet.autoSizeColumn(i);
            meta.autoSizeColumn(0);

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de generer le template d'import Excel", ex);
        }
    }

    @Transactional
    public com.aerixa.app.application.configuration.dto.ProgramTrackImportResultResponse importFromExcel(
            UUID actorUserId, UUID establishmentId, MultipartFile file, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.PROGRAM_TRACKS_IMPORT);
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

                String name = readCell(row, 0, formatter).trim();
                String code = readCell(row, 1, formatter).trim();
                String description = readCell(row, 2, formatter).trim();
                String activeRaw = readCell(row, 3, formatter).trim().toLowerCase();

                if (name.isEmpty() && code.isEmpty()) continue;
                totalRows++;

                try {
                    if (name.isEmpty()) throw new IllegalArgumentException("name obligatoire");

                    boolean active = activeRaw.isEmpty() || activeRaw.equals("true") || activeRaw.equals("1");
                    String finalCode = code.isEmpty()
                            ? generateUniqueCode(name, establishmentId)
                            : code.toUpperCase();

                    if (!code.isEmpty() && programTrackJpaRepository.existsByEstablishmentIdAndCodeIgnoreCase(establishmentId, finalCode)) {
                        errors.add("Ligne " + (i + 1) + ": code " + finalCode + " deja utilise");
                        continue;
                    }

                    programTrackJpaRepository.save(ProgramTrack.builder()
                            .establishmentId(establishmentId)
                            .code(finalCode)
                            .name(name)
                            .description(blankToNull(description))
                            .active(active)
                            .createdByUserId(actor.getId())
                            .createdByLabel(actor.getEmail())
                            .build());
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

        return com.aerixa.app.application.configuration.dto.ProgramTrackImportResultResponse.builder()
                .totalRows(totalRows)
                .created(created)
                .failed(errors.size())
                .errors(errors)
                .build();
    }

    // ── private helpers ──────────────────────────────────────────────────────────

    private ProgramTrackResponse changeActive(UUID actorUserId, UUID establishmentId, UUID programTrackId, boolean active,
                                              String permission, ConfigurationAuditAction action, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, permission);
        assertEstablishmentAccess(actor, establishmentId);
        ProgramTrack item = resolveScoped(programTrackId, establishmentId);

        try {
            boolean before = item.isActive();
            item.setActive(active);
            ProgramTrack saved = programTrackJpaRepository.save(item);
            publishSuccess(actor.getId(), establishmentId, action, saved.getId(), correlationId,
                    Map.of("before", Map.of("active", before), "after", Map.of("active", saved.isActive())));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, action, programTrackId, correlationId,
                    active ? "PROGRAM_TRACK_ACTIVATE_FAILED" : "PROGRAM_TRACK_DEACTIVATE_FAILED", ex);
            throw ex;
        }
    }

    private String generateUniqueCode(String name, UUID establishmentId) {
        String normalized = Normalizer.normalize(name, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toUpperCase()
                .replaceAll("[^A-Z0-9]", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_+|_+$", "");
        if (normalized.length() > 25) normalized = normalized.substring(0, 25).replaceAll("_+$", "");
        if (normalized.isEmpty()) normalized = "FILIERE";
        String candidate = normalized;
        int counter = 1;
        while (programTrackJpaRepository.existsByEstablishmentIdAndCodeIgnoreCase(establishmentId, candidate)) {
            candidate = normalized + "_" + counter++;
        }
        return candidate;
    }

    private UUID validateCreateRequest(CreateProgramTrackRequest request) {
        if (request == null || request.getEstablishmentId() == null) {
            throw new IllegalArgumentException("L'etablissement est obligatoire");
        }
        if (request.getName() == null || request.getName().isBlank()) {
            throw new IllegalArgumentException("Le nom est obligatoire");
        }
        return request.getEstablishmentId();
    }

    private ProgramTrack resolveScoped(UUID programTrackId, UUID establishmentId) {
        return programTrackJpaRepository.findByIdAndEstablishmentId(programTrackId, establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Filiere introuvable"));
    }

    private void assertEstablishmentAccess(User actor, UUID establishmentId) {
        Establishment establishment = establishmentJpaRepository.findById(establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Etablissement introuvable"));
        if (!actor.hasRole("SUPER_ADMIN") && !actor.getId().equals(establishment.getCreatedByUserId())) {
            throw new PermissionDeniedException("establishments:scope");
        }
    }

    private User actor(UUID actorUserId) {
        return userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String readCell(Row row, int index, DataFormatter formatter) {
        org.apache.poi.ss.usermodel.Cell cell = row.getCell(index);
        return cell == null ? "" : formatter.formatCellValue(cell);
    }

    private ProgramTrackResponse toResponse(ProgramTrack item) {
        return ProgramTrackResponse.builder()
                .id(item.getId())
                .establishmentId(item.getEstablishmentId())
                .code(item.getCode())
                .name(item.getName())
                .description(item.getDescription())
                .active(item.isActive())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .createdByUserId(item.getCreatedByUserId())
                .createdByLabel(item.getCreatedByLabel())
                .updatedByUserId(item.getUpdatedByUserId())
                .updatedByLabel(item.getUpdatedByLabel())
                .build();
    }

    private Map<String, Object> toMap(ProgramTrack item) {
        return Map.of(
                "id", item.getId() == null ? "" : item.getId().toString(),
                "establishmentId", item.getEstablishmentId().toString(),
                "code", item.getCode(),
                "name", item.getName(),
                "description", item.getDescription() == null ? "" : item.getDescription(),
                "active", item.isActive()
        );
    }

    private void publishSuccess(UUID actorId, UUID establishmentId, ConfigurationAuditAction action, UUID entityId,
                                String correlationId, Map<String, Object> payloadDiff) {
        configurationAuditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.PROGRAM_TRACK)
                .entityId(entityId)
                .correlationId(normalizeCorrelationId(correlationId))
                .outcome(ConfigurationAuditOutcome.SUCCESS)
                .payloadDiff(payloadDiff)
                .build());
    }

    private void publishFailure(UUID actorId, UUID establishmentId, ConfigurationAuditAction action, UUID entityId,
                                String correlationId, String reasonCode, RuntimeException ex) {
        configurationAuditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId == null ? UUID.fromString("00000000-0000-0000-0000-000000000000") : establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.PROGRAM_TRACK)
                .entityId(entityId)
                .correlationId(normalizeCorrelationId(correlationId))
                .outcome(ConfigurationAuditOutcome.FAILURE)
                .reasonCode(reasonCode)
                .errorMessage(ex.getMessage())
                .payloadDiff(Map.of())
                .build());
    }

    private String normalizeCorrelationId(String correlationId) {
        return correlationId == null || correlationId.isBlank() ? UUID.randomUUID().toString() : correlationId.trim();
    }
}
