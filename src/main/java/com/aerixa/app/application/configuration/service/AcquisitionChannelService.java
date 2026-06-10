package com.aerixa.app.application.configuration.service;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditAction;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEntityType;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEvent;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditOutcome;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.dto.AcquisitionChannelImportResultResponse;
import com.aerixa.app.application.configuration.dto.AcquisitionChannelResponse;
import com.aerixa.app.application.configuration.dto.CreateAcquisitionChannelRequest;
import com.aerixa.app.application.configuration.dto.UpdateAcquisitionChannelRequest;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.ConfigurationPermissions;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.configuration.entity.AcquisitionChannel;
import com.aerixa.app.domain.configuration.entity.AcquisitionChannelType;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.infrastructure.configuration.repository.AcquisitionChannelJpaRepository;
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
public class AcquisitionChannelService {

    private final AcquisitionChannelJpaRepository acquisitionChannelJpaRepository;
    private final EstablishmentJpaRepository establishmentJpaRepository;
    private final UserRepository userRepository;
    private final ConfigurationPermissionGuard configurationPermissionGuard;
    private final ConfigurationAuditPublisher configurationAuditPublisher;

    @Transactional
    public AcquisitionChannelResponse create(UUID actorUserId, CreateAcquisitionChannelRequest request, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ACQUISITION_CHANNELS_CREATE);

        try {
            UUID establishmentId = validateCreateRequest(request);
            assertEstablishmentAccess(actor, establishmentId);

            final String code;
            if (request.getCode() != null && !request.getCode().isBlank()) {
                code = request.getCode().trim().toUpperCase();
                if (acquisitionChannelJpaRepository.existsByEstablishmentIdAndCodeIgnoreCase(establishmentId, code)) {
                    throw new IllegalArgumentException("Un canal d'acquisition avec ce code existe deja pour cet etablissement");
                }
            } else {
                code = generateUniqueCode(request.getName().trim(), establishmentId);
            }

            AcquisitionChannel saved = acquisitionChannelJpaRepository.save(AcquisitionChannel.builder()
                    .establishmentId(establishmentId)
                    .code(code)
                    .name(request.getName().trim())
                    .type(request.getType())
                    .active(true)
                    .createdByUserId(actor.getId())
                    .createdByLabel(actor.getEmail())
                    .build());

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.CREATE, saved.getId(), correlationId,
                    Map.of("after", toMap(saved)));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), request == null ? null : request.getEstablishmentId(), ConfigurationAuditAction.CREATE,
                    null, correlationId, "ACQUISITION_CHANNEL_CREATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public List<AcquisitionChannelResponse> list(UUID actorUserId, UUID establishmentId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ACQUISITION_CHANNELS_LIST);
        assertEstablishmentAccess(actor, establishmentId);

        List<AcquisitionChannel> items = acquisitionChannelJpaRepository.findAllByEstablishmentId(establishmentId,
                Sort.by(Sort.Direction.ASC, "name"));
        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.LIST, null, correlationId,
                Map.of("count", items.size()));
        return items.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public AcquisitionChannelResponse getById(UUID actorUserId, UUID establishmentId, UUID acquisitionChannelId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ACQUISITION_CHANNELS_READ);
        assertEstablishmentAccess(actor, establishmentId);

        AcquisitionChannel item = resolveScoped(acquisitionChannelId, establishmentId);
        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.READ, item.getId(), correlationId, Map.of());
        return toResponse(item);
    }

    @Transactional
    public AcquisitionChannelResponse update(UUID actorUserId,
                                             UUID establishmentId,
                                             UUID acquisitionChannelId,
                                             UpdateAcquisitionChannelRequest request,
                                             String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ACQUISITION_CHANNELS_UPDATE);
        assertEstablishmentAccess(actor, establishmentId);

        AcquisitionChannel item = resolveScoped(acquisitionChannelId, establishmentId);
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
            if (request.getType() != null) {
                item.setType(request.getType());
            }
            item.setUpdatedByUserId(actor.getId());
            item.setUpdatedByLabel(actor.getEmail());

            AcquisitionChannel saved = acquisitionChannelJpaRepository.save(item);
            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE, saved.getId(), correlationId,
                    Map.of("before", before, "after", toMap(saved)));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE, acquisitionChannelId, correlationId,
                    "ACQUISITION_CHANNEL_UPDATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public void delete(UUID actorUserId, UUID establishmentId, UUID acquisitionChannelId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ACQUISITION_CHANNELS_DELETE);
        assertEstablishmentAccess(actor, establishmentId);

        AcquisitionChannel item = resolveScoped(acquisitionChannelId, establishmentId);
        try {
            Map<String, Object> before = toMap(item);
            acquisitionChannelJpaRepository.delete(item);
            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE, acquisitionChannelId, correlationId,
                    Map.of("before", before));
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE, acquisitionChannelId, correlationId,
                    "ACQUISITION_CHANNEL_DELETE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public AcquisitionChannelResponse activate(UUID actorUserId, UUID establishmentId, UUID acquisitionChannelId, String correlationId) {
        return changeActive(actorUserId, establishmentId, acquisitionChannelId, true,
                ConfigurationPermissions.ACQUISITION_CHANNELS_ACTIVATE, ConfigurationAuditAction.ACTIVATE, correlationId);
    }

    @Transactional
    public AcquisitionChannelResponse deactivate(UUID actorUserId, UUID establishmentId, UUID acquisitionChannelId, String correlationId) {
        return changeActive(actorUserId, establishmentId, acquisitionChannelId, false,
                ConfigurationPermissions.ACQUISITION_CHANNELS_DEACTIVATE, ConfigurationAuditAction.DEACTIVATE, correlationId);
    }

    @Transactional
    public void hardDelete(UUID actorUserId, UUID establishmentId, UUID acquisitionChannelId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ACQUISITION_CHANNELS_HARD_DELETE);
        assertEstablishmentAccess(actor, establishmentId);

        acquisitionChannelJpaRepository.findByIdAndEstablishmentId(acquisitionChannelId, establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Canal d'acquisition introuvable"));

        try {
            acquisitionChannelJpaRepository.hardDeleteByIdAndEstablishmentId(acquisitionChannelId, establishmentId);
            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.HARD_DELETE, acquisitionChannelId, correlationId,
                    Map.of("action", "hard_delete"));
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.HARD_DELETE, acquisitionChannelId, correlationId,
                    "ACQUISITION_CHANNEL_HARD_DELETE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public byte[] exportToExcel(UUID actorUserId, UUID establishmentId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ACQUISITION_CHANNELS_EXPORT);
        assertEstablishmentAccess(actor, establishmentId);

        List<AcquisitionChannel> items = acquisitionChannelJpaRepository.findAllByEstablishmentId(establishmentId,
                Sort.by(Sort.Direction.ASC, "name"));

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("acquisition-channels");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("code");
            header.createCell(1).setCellValue("name");
            header.createCell(2).setCellValue("type");
            header.createCell(3).setCellValue("active");
            header.createCell(4).setCellValue("createdAt");

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            int rowIndex = 1;
            for (AcquisitionChannel item : items) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(item.getCode());
                row.createCell(1).setCellValue(item.getName());
                row.createCell(2).setCellValue(item.getType().name());
                row.createCell(3).setCellValue(item.isActive() ? "true" : "false");
                row.createCell(4).setCellValue(item.getCreatedAt() != null ? formatter.format(item.getCreatedAt()) : "");
            }

            for (int i = 0; i <= 4; i++) sheet.autoSizeColumn(i);
            workbook.write(out);

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.EXPORT, null, correlationId,
                    Map.of("count", items.size()));
            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de generer l'export Excel des canaux d'acquisition", ex);
        }
    }

    @Transactional(readOnly = true)
    public byte[] generateImportTemplate() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("import-acquisition-channels");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("name*");
            header.createCell(1).setCellValue("type*");
            header.createCell(2).setCellValue("code");
            header.createCell(3).setCellValue("active");

            Row sample = sheet.createRow(1);
            sample.createCell(0).setCellValue("Reseaux sociaux");
            sample.createCell(1).setCellValue("DIRECT");
            sample.createCell(2).setCellValue("SOCIAL");
            sample.createCell(3).setCellValue("true");

            Sheet meta = workbook.createSheet("metadata");
            meta.createRow(0).createCell(0).setCellValue("name: intitule du canal d'acquisition (obligatoire)");
            meta.createRow(1).createCell(0).setCellValue("type: DIRECT ou INDIRECT (obligatoire)");
            meta.createRow(2).createCell(0).setCellValue("code: code unique du canal (optionnel, genere automatiquement si vide)");
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
    public AcquisitionChannelImportResultResponse importFromExcel(
            UUID actorUserId, UUID establishmentId, MultipartFile file, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.ACQUISITION_CHANNELS_IMPORT);
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
                String typeRaw = readCell(row, 1, formatter).trim().toUpperCase();
                String code = readCell(row, 2, formatter).trim();
                String activeRaw = readCell(row, 3, formatter).trim().toLowerCase();

                if (name.isEmpty() && typeRaw.isEmpty() && code.isEmpty()) continue;
                totalRows++;

                try {
                    if (name.isEmpty()) throw new IllegalArgumentException("name obligatoire");

                    AcquisitionChannelType type;
                    try {
                        type = AcquisitionChannelType.valueOf(typeRaw);
                    } catch (IllegalArgumentException ex) {
                        throw new IllegalArgumentException("type invalide (DIRECT ou INDIRECT attendu)");
                    }

                    boolean active = activeRaw.isEmpty() || activeRaw.equals("true") || activeRaw.equals("1");
                    String finalCode = code.isEmpty()
                            ? generateUniqueCode(name, establishmentId)
                            : code.toUpperCase();

                    if (!code.isEmpty() && acquisitionChannelJpaRepository.existsByEstablishmentIdAndCodeIgnoreCase(establishmentId, finalCode)) {
                        errors.add("Ligne " + (i + 1) + ": code " + finalCode + " deja utilise");
                        continue;
                    }

                    acquisitionChannelJpaRepository.save(AcquisitionChannel.builder()
                            .establishmentId(establishmentId)
                            .code(finalCode)
                            .name(name)
                            .type(type)
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

        return AcquisitionChannelImportResultResponse.builder()
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

    private AcquisitionChannelResponse changeActive(UUID actorUserId,
                                                    UUID establishmentId,
                                                    UUID acquisitionChannelId,
                                                    boolean active,
                                                    String permission,
                                                    ConfigurationAuditAction action,
                                                    String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, permission);
        assertEstablishmentAccess(actor, establishmentId);

        AcquisitionChannel item = resolveScoped(acquisitionChannelId, establishmentId);
        try {
            boolean before = item.isActive();
            item.setActive(active);
            AcquisitionChannel saved = acquisitionChannelJpaRepository.save(item);

            publishSuccess(actor.getId(), establishmentId, action, saved.getId(), correlationId,
                    Map.of("before", Map.of("active", before), "after", Map.of("active", saved.isActive())));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, action, acquisitionChannelId, correlationId,
                    active ? "ACQUISITION_CHANNEL_ACTIVATE_FAILED" : "ACQUISITION_CHANNEL_DEACTIVATE_FAILED", ex);
            throw ex;
        }
    }

    private UUID validateCreateRequest(CreateAcquisitionChannelRequest request) {
        if (request == null || request.getEstablishmentId() == null) {
            throw new IllegalArgumentException("L'etablissement est obligatoire");
        }
        if (request.getName() == null || request.getName().isBlank()) {
            throw new IllegalArgumentException("Le nom est obligatoire");
        }
        if (request.getType() == null) {
            throw new IllegalArgumentException("Le type est obligatoire");
        }
        return request.getEstablishmentId();
    }

    private String generateUniqueCode(String name, UUID establishmentId) {
        String normalized = Normalizer.normalize(name, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toUpperCase()
                .replaceAll("[^A-Z0-9]", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_+|_+$", "");
        if (normalized.length() > 25) normalized = normalized.substring(0, 25).replaceAll("_+$", "");
        if (normalized.isEmpty()) normalized = "CANAL";
        String candidate = normalized;
        int counter = 1;
        while (acquisitionChannelJpaRepository.existsByEstablishmentIdAndCodeIgnoreCase(establishmentId, candidate)) {
            candidate = normalized + "_" + counter++;
        }
        return candidate;
    }

    private AcquisitionChannel resolveScoped(UUID acquisitionChannelId, UUID establishmentId) {
        return acquisitionChannelJpaRepository.findByIdAndEstablishmentId(acquisitionChannelId, establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Canal d'acquisition introuvable"));
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

    private AcquisitionChannelResponse toResponse(AcquisitionChannel item) {
        return AcquisitionChannelResponse.builder()
                .id(item.getId())
                .establishmentId(item.getEstablishmentId())
                .code(item.getCode())
                .name(item.getName())
                .type(item.getType())
                .active(item.isActive())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .createdByUserId(item.getCreatedByUserId())
                .createdByLabel(item.getCreatedByLabel())
                .updatedByUserId(item.getUpdatedByUserId())
                .updatedByLabel(item.getUpdatedByLabel())
                .build();
    }

    private Map<String, Object> toMap(AcquisitionChannel item) {
        return Map.of(
                "id", item.getId() == null ? "" : item.getId().toString(),
                "establishmentId", item.getEstablishmentId().toString(),
                "code", item.getCode(),
                "name", item.getName(),
                "type", item.getType().name(),
                "active", item.isActive()
        );
    }

    private void publishSuccess(UUID actorId, UUID establishmentId, ConfigurationAuditAction action, UUID entityId,
                                String correlationId, Map<String, Object> payloadDiff) {
        configurationAuditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.ACQUISITION_CHANNEL)
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
                .entityType(ConfigurationAuditEntityType.ACQUISITION_CHANNEL)
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
