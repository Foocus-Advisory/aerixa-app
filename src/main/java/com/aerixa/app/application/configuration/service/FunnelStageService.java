package com.aerixa.app.application.configuration.service;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditAction;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEntityType;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEvent;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditOutcome;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.dto.CreateFunnelStageRequest;
import com.aerixa.app.application.configuration.dto.FunnelStageImportResultResponse;
import com.aerixa.app.application.configuration.dto.FunnelStageResponse;
import com.aerixa.app.application.configuration.dto.UpdateFunnelStageRequest;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.ConfigurationPermissions;
import com.aerixa.app.application.configuration.security.EstablishmentAccessGuard;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.configuration.entity.FunnelStage;
import com.aerixa.app.domain.configuration.entity.FunnelStageType;
import com.aerixa.app.infrastructure.configuration.repository.FunnelStageJpaRepository;
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
public class FunnelStageService {

    private final FunnelStageJpaRepository funnelStageJpaRepository;
    private final UserRepository userRepository;
    private final ConfigurationPermissionGuard configurationPermissionGuard;
    private final ConfigurationAuditPublisher configurationAuditPublisher;
    private final EstablishmentAccessGuard establishmentAccessGuard;

    @Transactional
    public FunnelStageResponse create(UUID actorUserId, CreateFunnelStageRequest request, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.FUNNEL_STAGES_CREATE);

        try {
            UUID establishmentId = validateCreateRequest(request);
            assertEstablishmentAccess(actor, establishmentId);

            final String normalizedCode;
            if (request.getCode() != null && !request.getCode().isBlank()) {
                normalizedCode = request.getCode().trim().toUpperCase();
                if (funnelStageJpaRepository.existsByEstablishmentIdAndCodeIgnoreCase(establishmentId, normalizedCode)) {
                    throw new IllegalArgumentException("Une etape funnel avec ce code existe deja pour cet etablissement");
                }
            } else {
                normalizedCode = generateUniqueCode(request.getName().trim(), establishmentId);
            }
            assertPositionAvailable(establishmentId, request.getPositionOrder(), null);
            assertStageTypeCardinality(establishmentId, request.getStageType(), null, true);

            FunnelStage saved = funnelStageJpaRepository.save(FunnelStage.builder()
                    .establishmentId(establishmentId)
                    .code(normalizedCode)
                    .name(request.getName().trim())
                    .description(request.getDescription() == null || request.getDescription().isBlank()
                            ? null : request.getDescription().trim())
                    .stageType(request.getStageType())
                    .positionOrder(request.getPositionOrder())
                    .active(true)
                    .createdByUserId(actor.getId())
                    .createdByLabel(actor.getEmail())
                    .build());

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.CREATE, saved.getId(), correlationId,
                    Map.of("after", toMap(saved)));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), request == null ? null : request.getEstablishmentId(), ConfigurationAuditAction.CREATE,
                    null, correlationId, "FUNNEL_STAGE_CREATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public List<FunnelStageResponse> list(UUID actorUserId, UUID establishmentId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.FUNNEL_STAGES_LIST);
        assertEstablishmentAccess(actor, establishmentId);

        List<FunnelStage> items = funnelStageJpaRepository.findAllByEstablishmentId(establishmentId,
                Sort.by(Sort.Direction.ASC, "positionOrder").and(Sort.by(Sort.Direction.ASC, "name")));
        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.LIST, null, correlationId,
                Map.of("count", items.size()));
        return items.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public FunnelStageResponse getById(UUID actorUserId, UUID establishmentId, UUID funnelStageId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.FUNNEL_STAGES_READ);
        assertEstablishmentAccess(actor, establishmentId);

        FunnelStage item = resolveScoped(funnelStageId, establishmentId);
        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.READ, item.getId(), correlationId, Map.of());
        return toResponse(item);
    }

    @Transactional
    public FunnelStageResponse update(UUID actorUserId, UUID establishmentId, UUID funnelStageId,
                                      UpdateFunnelStageRequest request, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.FUNNEL_STAGES_UPDATE);
        assertEstablishmentAccess(actor, establishmentId);

        FunnelStage item = resolveScoped(funnelStageId, establishmentId);

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
                item.setDescription(request.getDescription().isBlank() ? null : request.getDescription().trim());
            }
            if (request.getPositionOrder() != null) {
                validatePositionOrder(request.getPositionOrder());
                assertPositionAvailable(establishmentId, request.getPositionOrder(), item.getId());
                item.setPositionOrder(request.getPositionOrder());
            }
            if (request.getStageType() != null) {
                assertStageTypeCardinality(establishmentId, request.getStageType(), item.getId(), item.isActive());
                item.setStageType(request.getStageType());
            }
            item.setUpdatedByUserId(actor.getId());
            item.setUpdatedByLabel(actor.getEmail());

            FunnelStage saved = funnelStageJpaRepository.save(item);
            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE, saved.getId(), correlationId,
                    Map.of("before", before, "after", toMap(saved)));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE, funnelStageId, correlationId,
                    "FUNNEL_STAGE_UPDATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public void delete(UUID actorUserId, UUID establishmentId, UUID funnelStageId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.FUNNEL_STAGES_DELETE);
        assertEstablishmentAccess(actor, establishmentId);

        FunnelStage item = resolveScoped(funnelStageId, establishmentId);
        assertStageTypeCardinalityOnDeactivateOrDelete(establishmentId, item.getStageType(), item.getId(), item.isActive());

        try {
            Map<String, Object> before = toMap(item);
            funnelStageJpaRepository.delete(item);
            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE, funnelStageId, correlationId,
                    Map.of("before", before));
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE, funnelStageId, correlationId,
                    "FUNNEL_STAGE_DELETE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public FunnelStageResponse activate(UUID actorUserId, UUID establishmentId, UUID funnelStageId, String correlationId) {
        return changeActive(actorUserId, establishmentId, funnelStageId, true,
                ConfigurationPermissions.FUNNEL_STAGES_ACTIVATE, ConfigurationAuditAction.ACTIVATE, correlationId);
    }

    @Transactional
    public FunnelStageResponse deactivate(UUID actorUserId, UUID establishmentId, UUID funnelStageId, String correlationId) {
        return changeActive(actorUserId, establishmentId, funnelStageId, false,
                ConfigurationPermissions.FUNNEL_STAGES_DEACTIVATE, ConfigurationAuditAction.DEACTIVATE, correlationId);
    }

    @Transactional
    public void hardDelete(UUID actorUserId, UUID establishmentId, UUID funnelStageId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.FUNNEL_STAGES_HARD_DELETE);
        assertEstablishmentAccess(actor, establishmentId);

        resolveScoped(funnelStageId, establishmentId);

        try {
            funnelStageJpaRepository.hardDeleteByIdAndEstablishmentId(funnelStageId, establishmentId);
            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.HARD_DELETE, funnelStageId, correlationId,
                    Map.of("action", "hard_delete"));
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.HARD_DELETE, funnelStageId, correlationId,
                    "FUNNEL_STAGE_HARD_DELETE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public byte[] exportToExcel(UUID actorUserId, UUID establishmentId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.FUNNEL_STAGES_EXPORT);
        assertEstablishmentAccess(actor, establishmentId);

        List<FunnelStage> items = funnelStageJpaRepository.findAllByEstablishmentId(establishmentId,
                Sort.by(Sort.Direction.ASC, "positionOrder").and(Sort.by(Sort.Direction.ASC, "name")));

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("funnel-stages");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("code");
            header.createCell(1).setCellValue("name");
            header.createCell(2).setCellValue("description");
            header.createCell(3).setCellValue("stageType");
            header.createCell(4).setCellValue("positionOrder");
            header.createCell(5).setCellValue("active");
            header.createCell(6).setCellValue("createdAt");

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            int rowIndex = 1;
            for (FunnelStage item : items) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(item.getCode());
                row.createCell(1).setCellValue(item.getName());
                row.createCell(2).setCellValue(item.getDescription() == null ? "" : item.getDescription());
                row.createCell(3).setCellValue(item.getStageType().name());
                row.createCell(4).setCellValue(item.getPositionOrder());
                row.createCell(5).setCellValue(item.isActive() ? "true" : "false");
                row.createCell(6).setCellValue(item.getCreatedAt() != null ? formatter.format(item.getCreatedAt()) : "");
            }

            for (int i = 0; i <= 6; i++) sheet.autoSizeColumn(i);
            workbook.write(out);

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.EXPORT, null, correlationId,
                    Map.of("count", items.size()));
            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de generer l'export Excel des etapes funnel", ex);
        }
    }

    @Transactional(readOnly = true)
    public byte[] generateImportTemplate() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("import-funnel-stages");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("name*");
            header.createCell(1).setCellValue("stageType*");
            header.createCell(2).setCellValue("positionOrder*");
            header.createCell(3).setCellValue("code");
            header.createCell(4).setCellValue("description");
            header.createCell(5).setCellValue("active");

            Row sample = sheet.createRow(1);
            sample.createCell(0).setCellValue("Prise de contact");
            sample.createCell(1).setCellValue("INTERMEDIATE");
            sample.createCell(2).setCellValue(1);
            sample.createCell(3).setCellValue("CONTACT");
            sample.createCell(4).setCellValue("Premier contact avec le prospect");
            sample.createCell(5).setCellValue("true");

            Sheet meta = workbook.createSheet("metadata");
            meta.createRow(0).createCell(0).setCellValue("name: intitule de l'etape funnel (obligatoire)");
            meta.createRow(1).createCell(0).setCellValue("stageType: INITIAL, INTERMEDIATE, FINAL_SUCCESS ou FINAL_FAILURE (obligatoire)");
            meta.createRow(2).createCell(0).setCellValue("positionOrder: position entiere strictement positive et unique parmi les etapes actives (obligatoire)");
            meta.createRow(3).createCell(0).setCellValue("code: code unique de l'etape (optionnel, genere automatiquement si vide)");
            meta.createRow(4).createCell(0).setCellValue("description: description libre de l'etape (optionnel)");
            meta.createRow(5).createCell(0).setCellValue("active: true ou false (defaut: true si vide)");

            for (int i = 0; i <= 5; i++) sheet.autoSizeColumn(i);
            meta.autoSizeColumn(0);

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de generer le template d'import Excel", ex);
        }
    }

    @Transactional
    public FunnelStageImportResultResponse importFromExcel(
            UUID actorUserId, UUID establishmentId, MultipartFile file, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.FUNNEL_STAGES_IMPORT);
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
                String stageTypeRaw = readCell(row, 1, formatter).trim().toUpperCase();
                String positionOrderRaw = readCell(row, 2, formatter).trim();
                String code = readCell(row, 3, formatter).trim();
                String description = readCell(row, 4, formatter).trim();
                String activeRaw = readCell(row, 5, formatter).trim().toLowerCase();

                if (name.isEmpty() && stageTypeRaw.isEmpty() && positionOrderRaw.isEmpty() && code.isEmpty()) continue;
                totalRows++;

                try {
                    if (name.isEmpty()) throw new IllegalArgumentException("name obligatoire");

                    FunnelStageType stageType;
                    try {
                        stageType = FunnelStageType.valueOf(stageTypeRaw);
                    } catch (IllegalArgumentException ex) {
                        throw new IllegalArgumentException("stageType invalide (INITIAL, INTERMEDIATE, FINAL_SUCCESS ou FINAL_FAILURE attendu)");
                    }

                    int positionOrder;
                    try {
                        positionOrder = Integer.parseInt(positionOrderRaw);
                    } catch (NumberFormatException ex) {
                        throw new IllegalArgumentException("positionOrder invalide");
                    }
                    validatePositionOrder(positionOrder);

                    boolean active = activeRaw.isEmpty() || activeRaw.equals("true") || activeRaw.equals("1");

                    if (active) {
                        assertPositionAvailable(establishmentId, positionOrder, null);
                        assertStageTypeCardinality(establishmentId, stageType, null, true);
                    }

                    String finalCode;
                    if (code.isEmpty()) {
                        finalCode = generateUniqueCode(name, establishmentId);
                    } else {
                        finalCode = code.toUpperCase();
                        if (funnelStageJpaRepository.existsByEstablishmentIdAndCodeIgnoreCase(establishmentId, finalCode)) {
                            errors.add("Ligne " + (i + 1) + ": code " + finalCode + " deja utilise");
                            continue;
                        }
                    }

                    funnelStageJpaRepository.save(FunnelStage.builder()
                            .establishmentId(establishmentId)
                            .code(finalCode)
                            .name(name)
                            .description(description.isEmpty() ? null : description)
                            .stageType(stageType)
                            .positionOrder(positionOrder)
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

        return FunnelStageImportResultResponse.builder()
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

    private String generateUniqueCode(String name, UUID establishmentId) {
        String normalized = Normalizer.normalize(name, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toUpperCase()
                .replaceAll("[^A-Z0-9]", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_+|_+$", "");
        if (normalized.length() > 25) normalized = normalized.substring(0, 25).replaceAll("_+$", "");
        if (normalized.isEmpty()) normalized = "ETAPE";
        String candidate = normalized;
        int counter = 1;
        while (funnelStageJpaRepository.existsByEstablishmentIdAndCodeIgnoreCase(establishmentId, candidate)) {
            candidate = normalized + "_" + counter++;
        }
        return candidate;
    }

    private FunnelStageResponse changeActive(UUID actorUserId, UUID establishmentId, UUID funnelStageId, boolean active,
                                             String permission, ConfigurationAuditAction action, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, permission);
        assertEstablishmentAccess(actor, establishmentId);

        FunnelStage item = resolveScoped(funnelStageId, establishmentId);
        try {
            boolean before = item.isActive();
            if (active) {
                assertPositionAvailable(establishmentId, item.getPositionOrder(), item.getId());
                assertStageTypeCardinality(establishmentId, item.getStageType(), item.getId(), true);
            } else {
                assertStageTypeCardinalityOnDeactivateOrDelete(establishmentId, item.getStageType(), item.getId(), item.isActive());
            }
            item.setActive(active);
            FunnelStage saved = funnelStageJpaRepository.save(item);

            publishSuccess(actor.getId(), establishmentId, action, saved.getId(), correlationId,
                    Map.of("before", Map.of("active", before), "after", Map.of("active", saved.isActive())));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, action, funnelStageId, correlationId,
                    active ? "FUNNEL_STAGE_ACTIVATE_FAILED" : "FUNNEL_STAGE_DEACTIVATE_FAILED", ex);
            throw ex;
        }
    }

    private UUID validateCreateRequest(CreateFunnelStageRequest request) {
        if (request == null || request.getEstablishmentId() == null) {
            throw new IllegalArgumentException("L'etablissement est obligatoire");
        }
        if (request.getName() == null || request.getName().isBlank()) {
            throw new IllegalArgumentException("Le nom est obligatoire");
        }
        if (request.getStageType() == null) {
            throw new IllegalArgumentException("Le type d'etape est obligatoire");
        }
        validatePositionOrder(request.getPositionOrder());
        return request.getEstablishmentId();
    }

    private void validatePositionOrder(Integer positionOrder) {
        if (positionOrder == null || positionOrder <= 0) {
            throw new IllegalArgumentException("positionOrder doit etre strictement positif");
        }
    }

    private void assertPositionAvailable(UUID establishmentId, Integer positionOrder, UUID currentId) {
        boolean exists = currentId == null
                ? funnelStageJpaRepository.existsByEstablishmentIdAndPositionOrderAndActiveTrue(establishmentId, positionOrder)
                : funnelStageJpaRepository.existsByEstablishmentIdAndPositionOrderAndActiveTrueAndIdNot(establishmentId, positionOrder, currentId);
        if (exists) {
            throw new IllegalArgumentException("positionOrder doit etre unique parmi les etapes actives");
        }
    }

    private void assertStageTypeCardinality(UUID establishmentId, FunnelStageType targetType, UUID currentId, boolean targetActive) {
        if (!targetActive) {
            return;
        }
        long count = currentId == null
                ? funnelStageJpaRepository.countByEstablishmentIdAndStageTypeAndActiveTrue(establishmentId, targetType)
                : funnelStageJpaRepository.countByEstablishmentIdAndStageTypeAndActiveTrueAndIdNot(establishmentId, targetType, currentId);

        if ((targetType == FunnelStageType.INITIAL || targetType == FunnelStageType.FINAL_SUCCESS)
                && count >= 1) {
            throw new IllegalArgumentException("Une seule etape active autorisee pour ce type");
        }
    }

    private void assertStageTypeCardinalityOnDeactivateOrDelete(UUID establishmentId, FunnelStageType stageType, UUID currentId, boolean currentlyActive) {
        if (!currentlyActive) {
            return;
        }

        long others = funnelStageJpaRepository.countByEstablishmentIdAndStageTypeAndActiveTrueAndIdNot(establishmentId, stageType, currentId);
        if (stageType == FunnelStageType.INTERMEDIATE) {
            if (others < 1) {
                throw new IllegalArgumentException("Au moins une etape INTERMEDIATE active est obligatoire");
            }
            return;
        }
        if (stageType == FunnelStageType.FINAL_FAILURE) {
            return;
        }
        if (others < 1) {
            throw new IllegalArgumentException("Cette operation violerait l'invariant de cardinalite des etapes funnel");
        }
    }

    private FunnelStage resolveScoped(UUID funnelStageId, UUID establishmentId) {
        return funnelStageJpaRepository.findByIdAndEstablishmentId(funnelStageId, establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Etape funnel introuvable"));
    }

    private void assertEstablishmentAccess(User actor, UUID establishmentId) {
        establishmentAccessGuard.assertAccess(actor, establishmentId);
    }

    private User actor(UUID actorUserId) {
        return userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
    }

    private FunnelStageResponse toResponse(FunnelStage item) {
        return FunnelStageResponse.builder()
                .id(item.getId())
                .establishmentId(item.getEstablishmentId())
                .code(item.getCode())
                .name(item.getName())
                .description(item.getDescription())
                .stageType(item.getStageType())
                .positionOrder(item.getPositionOrder())
                .active(item.isActive())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .createdByUserId(item.getCreatedByUserId())
                .createdByLabel(item.getCreatedByLabel())
                .updatedByUserId(item.getUpdatedByUserId())
                .updatedByLabel(item.getUpdatedByLabel())
                .build();
    }

    private Map<String, Object> toMap(FunnelStage item) {
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", item.getId() == null ? "" : item.getId().toString());
        map.put("establishmentId", item.getEstablishmentId().toString());
        map.put("code", item.getCode());
        map.put("name", item.getName());
        map.put("description", item.getDescription() == null ? "" : item.getDescription());
        map.put("stageType", item.getStageType().name());
        map.put("positionOrder", item.getPositionOrder());
        map.put("active", item.isActive());
        return map;
    }

    private void publishSuccess(UUID actorId, UUID establishmentId, ConfigurationAuditAction action, UUID entityId,
                                String correlationId, Map<String, Object> payloadDiff) {
        configurationAuditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.FUNNEL_STAGE)
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
                .entityType(ConfigurationAuditEntityType.FUNNEL_STAGE)
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
