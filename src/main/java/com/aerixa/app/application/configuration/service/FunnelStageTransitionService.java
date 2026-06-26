package com.aerixa.app.application.configuration.service;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditAction;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEntityType;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEvent;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditOutcome;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.dto.CreateFunnelStageTransitionRequest;
import com.aerixa.app.application.configuration.dto.FunnelStageTransitionResponse;
import com.aerixa.app.application.configuration.dto.UpdateFunnelStageTransitionRequest;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.ConfigurationPermissions;
import com.aerixa.app.application.configuration.security.EstablishmentAccessGuard;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.configuration.entity.FunnelStage;
import com.aerixa.app.domain.configuration.entity.FunnelStageTransition;
import com.aerixa.app.infrastructure.configuration.repository.FunnelStageJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.FunnelStageTransitionJpaRepository;
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
public class FunnelStageTransitionService {

    private final FunnelStageTransitionJpaRepository funnelStageTransitionJpaRepository;
    private final FunnelStageJpaRepository funnelStageJpaRepository;
    private final UserRepository userRepository;
    private final ConfigurationPermissionGuard configurationPermissionGuard;
    private final ConfigurationAuditPublisher configurationAuditPublisher;
    private final EstablishmentAccessGuard establishmentAccessGuard;

    @Transactional
    public FunnelStageTransitionResponse create(UUID actorUserId, CreateFunnelStageTransitionRequest request, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.FUNNEL_STAGE_TRANSITIONS_CREATE);

        try {
            UUID establishmentId = validateCreateRequest(request);
            assertEstablishmentAccess(actor, establishmentId);
            FunnelStage from = resolveStageInEstablishment(request.getFromStageId(), establishmentId);
            FunnelStage to = resolveStageInEstablishment(request.getToStageId(), establishmentId);

            if (from.getId().equals(to.getId())) {
                throw new IllegalArgumentException("Une transition ne peut pas pointer vers la meme etape");
            }
            if (funnelStageTransitionJpaRepository.existsByEstablishmentIdAndFromStageIdAndToStageId(establishmentId, from.getId(), to.getId())) {
                throw new IllegalArgumentException("Cette transition existe deja pour cet etablissement");
            }

            FunnelStageTransition saved = funnelStageTransitionJpaRepository.save(FunnelStageTransition.builder()
                    .establishmentId(establishmentId)
                    .fromStageId(from.getId())
                    .toStageId(to.getId())
                    .active(true)
                    .createdByUserId(actor.getId())
                    .createdByLabel(actor.getEmail())
                    .build());

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.CREATE, saved.getId(), correlationId,
                    Map.of("after", toMap(saved)));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), request == null ? null : request.getEstablishmentId(), ConfigurationAuditAction.CREATE,
                    null, correlationId, "FUNNEL_STAGE_TRANSITION_CREATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public List<FunnelStageTransitionResponse> list(UUID actorUserId, UUID establishmentId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.FUNNEL_STAGE_TRANSITIONS_LIST);
        assertEstablishmentAccess(actor, establishmentId);

        List<FunnelStageTransition> items = funnelStageTransitionJpaRepository.findAllByEstablishmentId(establishmentId,
                Sort.by(Sort.Direction.ASC, "createdAt"));
        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.LIST, null, correlationId,
                Map.of("count", items.size()));
        return items.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public FunnelStageTransitionResponse getById(UUID actorUserId, UUID establishmentId, UUID transitionId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.FUNNEL_STAGE_TRANSITIONS_READ);
        assertEstablishmentAccess(actor, establishmentId);

        FunnelStageTransition item = resolveScoped(transitionId, establishmentId);
        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.READ, item.getId(), correlationId, Map.of());
        return toResponse(item);
    }

    @Transactional
    public FunnelStageTransitionResponse update(UUID actorUserId, UUID establishmentId, UUID transitionId,
                                                UpdateFunnelStageTransitionRequest request, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.FUNNEL_STAGE_TRANSITIONS_UPDATE);
        assertEstablishmentAccess(actor, establishmentId);

        FunnelStageTransition item = resolveScoped(transitionId, establishmentId);

        try {
            if (request == null) {
                throw new IllegalArgumentException("La requete de mise a jour est obligatoire");
            }
            Map<String, Object> before = toMap(item);

            if (request.getToStageId() != null) {
                FunnelStage to = resolveStageInEstablishment(request.getToStageId(), establishmentId);
                if (item.getFromStageId().equals(to.getId())) {
                    throw new IllegalArgumentException("Une transition ne peut pas pointer vers la meme etape");
                }
                if (funnelStageTransitionJpaRepository.existsByEstablishmentIdAndFromStageIdAndToStageIdAndIdNot(
                        establishmentId, item.getFromStageId(), to.getId(), item.getId())) {
                    throw new IllegalArgumentException("Cette transition existe deja pour cet etablissement");
                }
                item.setToStageId(to.getId());
            }
            item.setUpdatedByUserId(actor.getId());
            item.setUpdatedByLabel(actor.getEmail());

            FunnelStageTransition saved = funnelStageTransitionJpaRepository.save(item);
            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE, saved.getId(), correlationId,
                    Map.of("before", before, "after", toMap(saved)));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE, transitionId, correlationId,
                    "FUNNEL_STAGE_TRANSITION_UPDATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public void delete(UUID actorUserId, UUID establishmentId, UUID transitionId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.FUNNEL_STAGE_TRANSITIONS_DELETE);
        assertEstablishmentAccess(actor, establishmentId);

        FunnelStageTransition item = resolveScoped(transitionId, establishmentId);

        try {
            Map<String, Object> before = toMap(item);
            funnelStageTransitionJpaRepository.delete(item);
            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE, transitionId, correlationId,
                    Map.of("before", before));
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE, transitionId, correlationId,
                    "FUNNEL_STAGE_TRANSITION_DELETE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public void hardDelete(UUID actorUserId, UUID establishmentId, UUID transitionId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.FUNNEL_STAGE_TRANSITIONS_HARD_DELETE);
        assertEstablishmentAccess(actor, establishmentId);

        resolveScoped(transitionId, establishmentId);

        try {
            funnelStageTransitionJpaRepository.hardDeleteByIdAndEstablishmentId(transitionId, establishmentId);
            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.HARD_DELETE, transitionId, correlationId,
                    Map.of("action", "hard_delete"));
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.HARD_DELETE, transitionId, correlationId,
                    "FUNNEL_STAGE_TRANSITION_HARD_DELETE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public FunnelStageTransitionResponse activate(UUID actorUserId, UUID establishmentId, UUID transitionId, String correlationId) {
        return changeActive(actorUserId, establishmentId, transitionId, true,
                ConfigurationPermissions.FUNNEL_STAGE_TRANSITIONS_ACTIVATE, ConfigurationAuditAction.ACTIVATE, correlationId);
    }

    @Transactional
    public FunnelStageTransitionResponse deactivate(UUID actorUserId, UUID establishmentId, UUID transitionId, String correlationId) {
        return changeActive(actorUserId, establishmentId, transitionId, false,
                ConfigurationPermissions.FUNNEL_STAGE_TRANSITIONS_DEACTIVATE, ConfigurationAuditAction.DEACTIVATE, correlationId);
    }

    private FunnelStageTransitionResponse changeActive(UUID actorUserId, UUID establishmentId, UUID transitionId, boolean active,
                                                       String permission, ConfigurationAuditAction action, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, permission);
        assertEstablishmentAccess(actor, establishmentId);

        FunnelStageTransition item = resolveScoped(transitionId, establishmentId);
        try {
            boolean before = item.isActive();
            item.setActive(active);
            FunnelStageTransition saved = funnelStageTransitionJpaRepository.save(item);

            publishSuccess(actor.getId(), establishmentId, action, saved.getId(), correlationId,
                    Map.of("before", Map.of("active", before), "after", Map.of("active", saved.isActive())));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, action, transitionId, correlationId,
                    active ? "FUNNEL_STAGE_TRANSITION_ACTIVATE_FAILED" : "FUNNEL_STAGE_TRANSITION_DEACTIVATE_FAILED", ex);
            throw ex;
        }
    }

    private UUID validateCreateRequest(CreateFunnelStageTransitionRequest request) {
        if (request == null || request.getEstablishmentId() == null) {
            throw new IllegalArgumentException("L'etablissement est obligatoire");
        }
        if (request.getFromStageId() == null) {
            throw new IllegalArgumentException("fromStageId est obligatoire");
        }
        if (request.getToStageId() == null) {
            throw new IllegalArgumentException("toStageId est obligatoire");
        }
        return request.getEstablishmentId();
    }

    private FunnelStage resolveStageInEstablishment(UUID stageId, UUID establishmentId) {
        return funnelStageJpaRepository.findByIdAndEstablishmentId(stageId, establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Etape funnel introuvable"));
    }

    private FunnelStageTransition resolveScoped(UUID transitionId, UUID establishmentId) {
        return funnelStageTransitionJpaRepository.findByIdAndEstablishmentId(transitionId, establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Transition funnel introuvable"));
    }

    private void assertEstablishmentAccess(User actor, UUID establishmentId) {
        establishmentAccessGuard.assertAccess(actor, establishmentId);
    }

    private User actor(UUID actorUserId) {
        return userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
    }

    private FunnelStageTransitionResponse toResponse(FunnelStageTransition item) {
        return FunnelStageTransitionResponse.builder()
                .id(item.getId())
                .establishmentId(item.getEstablishmentId())
                .fromStageId(item.getFromStageId())
                .toStageId(item.getToStageId())
                .active(item.isActive())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .createdByUserId(item.getCreatedByUserId())
                .createdByLabel(item.getCreatedByLabel())
                .updatedByUserId(item.getUpdatedByUserId())
                .updatedByLabel(item.getUpdatedByLabel())
                .build();
    }

    private Map<String, Object> toMap(FunnelStageTransition item) {
        return Map.of(
                "id", item.getId() == null ? "" : item.getId().toString(),
                "establishmentId", item.getEstablishmentId().toString(),
                "fromStageId", item.getFromStageId().toString(),
                "toStageId", item.getToStageId().toString(),
                "active", item.isActive()
        );
    }

    private void publishSuccess(UUID actorId, UUID establishmentId, ConfigurationAuditAction action, UUID entityId,
                                String correlationId, Map<String, Object> payloadDiff) {
        configurationAuditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.FUNNEL_STAGE_TRANSITION)
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
                .entityType(ConfigurationAuditEntityType.FUNNEL_STAGE_TRANSITION)
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
