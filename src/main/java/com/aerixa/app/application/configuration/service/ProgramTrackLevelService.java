package com.aerixa.app.application.configuration.service;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditAction;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEntityType;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEvent;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditOutcome;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.dto.CreateProgramTrackLevelRequest;
import com.aerixa.app.application.configuration.dto.ProgramTrackLevelResponse;
import com.aerixa.app.application.configuration.dto.UpdateProgramTrackLevelRequest;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.ConfigurationPermissions;
import com.aerixa.app.application.configuration.security.EstablishmentAccessGuard;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.configuration.entity.AcademicLevel;
import com.aerixa.app.domain.configuration.entity.ProgramTrack;
import com.aerixa.app.domain.configuration.entity.ProgramTrackLevel;
import com.aerixa.app.infrastructure.configuration.repository.AcademicLevelJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.ProgramTrackJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.ProgramTrackLevelJpaRepository;
import com.aerixa.app.infrastructure.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProgramTrackLevelService {

    private final ProgramTrackLevelJpaRepository programTrackLevelJpaRepository;
    private final ProgramTrackJpaRepository programTrackJpaRepository;
    private final AcademicLevelJpaRepository academicLevelJpaRepository;
    private final UserRepository userRepository;
    private final ConfigurationPermissionGuard configurationPermissionGuard;
    private final ConfigurationAuditPublisher configurationAuditPublisher;
    private final EstablishmentAccessGuard establishmentAccessGuard;

    @Transactional
    public ProgramTrackLevelResponse create(UUID actorUserId, CreateProgramTrackLevelRequest request, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.PROGRAM_TRACK_LEVELS_CREATE);

        try {
            UUID establishmentId = validateCreateRequest(request);
            assertEstablishmentAccess(actor, establishmentId);
            ProgramTrack programTrack = resolveProgramTrack(request.getProgramTrackId(), establishmentId);
            AcademicLevel academicLevel = resolveAcademicLevel(request.getAcademicLevelId(), establishmentId);
            if (!programTrack.getEstablishmentId().equals(academicLevel.getEstablishmentId())) {
                throw new IllegalArgumentException("Relation cross-establishment interdite");
            }

            if (programTrackLevelJpaRepository.existsByEstablishmentIdAndProgramTrackIdAndAcademicLevelId(establishmentId,
                    programTrack.getId(), academicLevel.getId())) {
                throw new IllegalArgumentException("Cette association filiere-niveau existe deja pour cet etablissement");
            }

            ProgramTrackLevel saved = programTrackLevelJpaRepository.save(ProgramTrackLevel.builder()
                    .establishmentId(establishmentId)
                    .programTrackId(programTrack.getId())
                    .academicLevelId(academicLevel.getId())
                    .openForApplication(true)
                    .createdByUserId(actor.getId())
                    .createdByLabel(actor.getEmail())
                    .build());

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.CREATE, saved.getId(), correlationId,
                    Map.of("after", toMap(saved)));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), request == null ? null : request.getEstablishmentId(), ConfigurationAuditAction.CREATE,
                    null, correlationId, "PROGRAM_TRACK_LEVEL_CREATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public List<ProgramTrackLevelResponse> list(UUID actorUserId, UUID establishmentId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.PROGRAM_TRACK_LEVELS_LIST);
        assertEstablishmentAccess(actor, establishmentId);

        List<ProgramTrackLevel> items = programTrackLevelJpaRepository.findAllByEstablishmentId(establishmentId,
                Sort.by(Sort.Direction.ASC, "programTrackId").and(Sort.by(Sort.Direction.ASC, "academicLevelId")));
        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.LIST, null, correlationId,
                Map.of("count", items.size()));
        return items.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ProgramTrackLevelResponse getById(UUID actorUserId, UUID establishmentId, UUID programTrackLevelId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.PROGRAM_TRACK_LEVELS_READ);
        assertEstablishmentAccess(actor, establishmentId);

        ProgramTrackLevel item = resolveScoped(programTrackLevelId, establishmentId);
        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.READ, item.getId(), correlationId, Map.of());
        return toResponse(item);
    }

    @Transactional
    public ProgramTrackLevelResponse update(UUID actorUserId, UUID establishmentId, UUID programTrackLevelId,
                                            UpdateProgramTrackLevelRequest request, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.PROGRAM_TRACK_LEVELS_UPDATE);
        assertEstablishmentAccess(actor, establishmentId);
        ProgramTrackLevel item = resolveScoped(programTrackLevelId, establishmentId);

        try {
            if (request == null) {
                throw new IllegalArgumentException("La requete de mise a jour est obligatoire");
            }
            Map<String, Object> before = toMap(item);

            if (request.getAcademicLevelId() != null) {
                AcademicLevel academicLevel = resolveAcademicLevel(request.getAcademicLevelId(), establishmentId);
                ProgramTrack programTrack = resolveProgramTrack(item.getProgramTrackId(), establishmentId);
                if (!programTrack.getEstablishmentId().equals(academicLevel.getEstablishmentId())) {
                    throw new IllegalArgumentException("Relation cross-establishment interdite");
                }
                if (programTrackLevelJpaRepository.existsByEstablishmentIdAndProgramTrackIdAndAcademicLevelIdAndIdNot(establishmentId,
                        item.getProgramTrackId(), academicLevel.getId(), item.getId())) {
                    throw new IllegalArgumentException("Cette association filiere-niveau existe deja pour cet etablissement");
                }
                item.setAcademicLevelId(academicLevel.getId());
            }
            item.setUpdatedByUserId(actor.getId());
            item.setUpdatedByLabel(actor.getEmail());

            ProgramTrackLevel saved = programTrackLevelJpaRepository.save(item);
            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE, saved.getId(), correlationId,
                    Map.of("before", before, "after", toMap(saved)));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE, programTrackLevelId, correlationId,
                    "PROGRAM_TRACK_LEVEL_UPDATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public void delete(UUID actorUserId, UUID establishmentId, UUID programTrackLevelId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.PROGRAM_TRACK_LEVELS_DELETE);
        assertEstablishmentAccess(actor, establishmentId);
        ProgramTrackLevel item = resolveScoped(programTrackLevelId, establishmentId);

        try {
            Map<String, Object> before = toMap(item);
            programTrackLevelJpaRepository.delete(item);
            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE, programTrackLevelId, correlationId,
                    Map.of("before", before));
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE, programTrackLevelId, correlationId,
                    "PROGRAM_TRACK_LEVEL_DELETE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public ProgramTrackLevelResponse activate(UUID actorUserId, UUID establishmentId, UUID programTrackLevelId, String correlationId) {
        return changeOpen(actorUserId, establishmentId, programTrackLevelId, true,
                ConfigurationPermissions.PROGRAM_TRACK_LEVELS_ACTIVATE, ConfigurationAuditAction.ACTIVATE, correlationId);
    }

    @Transactional
    public ProgramTrackLevelResponse deactivate(UUID actorUserId, UUID establishmentId, UUID programTrackLevelId, String correlationId) {
        return changeOpen(actorUserId, establishmentId, programTrackLevelId, false,
                ConfigurationPermissions.PROGRAM_TRACK_LEVELS_DEACTIVATE, ConfigurationAuditAction.DEACTIVATE, correlationId);
    }

    private ProgramTrackLevelResponse changeOpen(UUID actorUserId, UUID establishmentId, UUID programTrackLevelId, boolean open,
                                                 String permission, ConfigurationAuditAction action, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, permission);
        assertEstablishmentAccess(actor, establishmentId);
        ProgramTrackLevel item = resolveScoped(programTrackLevelId, establishmentId);

        try {
            boolean before = item.isOpenForApplication();
            item.setOpenForApplication(open);
            ProgramTrackLevel saved = programTrackLevelJpaRepository.save(item);
            publishSuccess(actor.getId(), establishmentId, action, saved.getId(), correlationId,
                    Map.of("before", Map.of("openForApplication", before), "after", Map.of("openForApplication", saved.isOpenForApplication())));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, action, programTrackLevelId, correlationId,
                    open ? "PROGRAM_TRACK_LEVEL_ACTIVATE_FAILED" : "PROGRAM_TRACK_LEVEL_DEACTIVATE_FAILED", ex);
            throw ex;
        }
    }

    private UUID validateCreateRequest(CreateProgramTrackLevelRequest request) {
        if (request == null || request.getEstablishmentId() == null) {
            throw new IllegalArgumentException("L'etablissement est obligatoire");
        }
        if (request.getProgramTrackId() == null) {
            throw new IllegalArgumentException("programTrackId est obligatoire");
        }
        if (request.getAcademicLevelId() == null) {
            throw new IllegalArgumentException("academicLevelId est obligatoire");
        }
        return request.getEstablishmentId();
    }

    private ProgramTrackLevel resolveScoped(UUID programTrackLevelId, UUID establishmentId) {
        return programTrackLevelJpaRepository.findByIdAndEstablishmentId(programTrackLevelId, establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Association filiere-niveau introuvable"));
    }

    private ProgramTrack resolveProgramTrack(UUID programTrackId, UUID establishmentId) {
        ProgramTrack programTrack = programTrackJpaRepository.findById(programTrackId)
                .orElseThrow(() -> new ResourceNotFoundException("Filiere introuvable"));
        if (!programTrack.getEstablishmentId().equals(establishmentId)) {
            throw new IllegalArgumentException("Relation cross-establishment interdite");
        }
        return programTrack;
    }

    private AcademicLevel resolveAcademicLevel(UUID academicLevelId, UUID establishmentId) {
        AcademicLevel academicLevel = academicLevelJpaRepository.findById(academicLevelId)
                .orElseThrow(() -> new ResourceNotFoundException("Niveau academique introuvable"));
        if (!academicLevel.getEstablishmentId().equals(establishmentId)) {
            throw new IllegalArgumentException("Relation cross-establishment interdite");
        }
        return academicLevel;
    }

    private void assertEstablishmentAccess(User actor, UUID establishmentId) {
        establishmentAccessGuard.assertAccess(actor, establishmentId);
    }

    private User actor(UUID actorUserId) {
        return userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
    }

    private ProgramTrackLevelResponse toResponse(ProgramTrackLevel item) {
        return ProgramTrackLevelResponse.builder()
                .id(item.getId())
                .establishmentId(item.getEstablishmentId())
                .programTrackId(item.getProgramTrackId())
                .academicLevelId(item.getAcademicLevelId())
                .openForApplication(item.isOpenForApplication())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .createdByUserId(item.getCreatedByUserId())
                .createdByLabel(item.getCreatedByLabel())
                .updatedByUserId(item.getUpdatedByUserId())
                .updatedByLabel(item.getUpdatedByLabel())
                .build();
    }

    private Map<String, Object> toMap(ProgramTrackLevel item) {
        return Map.of(
                "id", item.getId() == null ? "" : item.getId().toString(),
                "establishmentId", item.getEstablishmentId().toString(),
                "programTrackId", item.getProgramTrackId().toString(),
                "academicLevelId", item.getAcademicLevelId().toString(),
                "openForApplication", item.isOpenForApplication()
        );
    }

    private void publishSuccess(UUID actorId, UUID establishmentId, ConfigurationAuditAction action, UUID entityId,
                                String correlationId, Map<String, Object> payloadDiff) {
        configurationAuditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.PROGRAM_TRACK_LEVEL)
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
                .entityType(ConfigurationAuditEntityType.PROGRAM_TRACK_LEVEL)
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
