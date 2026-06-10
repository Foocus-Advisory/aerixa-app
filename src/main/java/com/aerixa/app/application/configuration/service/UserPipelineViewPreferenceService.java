package com.aerixa.app.application.configuration.service;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditAction;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEntityType;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEvent;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditOutcome;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.dto.PipelineViewPreferenceResponse;
import com.aerixa.app.application.configuration.dto.UpdatePipelineViewPreferenceRequest;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.ConfigurationPermissions;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.domain.configuration.entity.PipelineViewType;
import com.aerixa.app.domain.configuration.entity.UserPipelineViewPreference;
import com.aerixa.app.infrastructure.configuration.repository.EstablishmentJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.UserPipelineViewPreferenceJpaRepository;
import com.aerixa.app.infrastructure.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserPipelineViewPreferenceService {

    private static final UUID GLOBAL_SCOPE_ESTABLISHMENT_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");

    private final UserPipelineViewPreferenceJpaRepository userPipelineViewPreferenceJpaRepository;
    private final EstablishmentJpaRepository establishmentJpaRepository;
    private final UserRepository userRepository;
    private final ConfigurationPermissionGuard configurationPermissionGuard;
    private final ConfigurationAuditPublisher configurationAuditPublisher;

    @Transactional(readOnly = true)
    public PipelineViewPreferenceResponse read(UUID actorUserId, UUID establishmentId, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.PIPELINE_VIEW_PREFERENCE_READ);
        assertEstablishmentAccess(actor, establishmentId);

        UserPipelineViewPreference preference = userPipelineViewPreferenceJpaRepository
                .findByUserIdAndEstablishmentId(actor.getId(), establishmentId)
                .orElseGet(() -> UserPipelineViewPreference.builder()
                        .userId(actor.getId())
                        .establishmentId(establishmentId)
                        .preferredView(PipelineViewType.KANBAN)
                        .build());

        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.READ,
                preference.getId(), correlationId, Map.of("preferredView", preference.getPreferredView().name()));
        return toResponse(preference);
    }

    @Transactional
    public PipelineViewPreferenceResponse update(UUID actorUserId, UpdatePipelineViewPreferenceRequest request, String correlationId) {
        User actor = actor(actorUserId);
        configurationPermissionGuard.assertHasPermission(actor, ConfigurationPermissions.PIPELINE_VIEW_PREFERENCE_UPDATE);

        UUID establishmentId = request == null ? null : request.getEstablishmentId();
        try {
            if (request == null || request.getEstablishmentId() == null) {
                throw new IllegalArgumentException("L'etablissement est obligatoire");
            }
            if (request.getPreferredView() == null) {
                throw new IllegalArgumentException("La vue preferee est obligatoire");
            }

            assertEstablishmentAccess(actor, request.getEstablishmentId());

            UserPipelineViewPreference preference = userPipelineViewPreferenceJpaRepository
                    .findByUserIdAndEstablishmentId(actor.getId(), request.getEstablishmentId())
                    .orElseGet(() -> UserPipelineViewPreference.builder()
                            .userId(actor.getId())
                            .establishmentId(request.getEstablishmentId())
                            .preferredView(PipelineViewType.KANBAN)
                            .build());

            Map<String, Object> before = Map.of("preferredView", preference.getPreferredView().name());
            preference.setPreferredView(request.getPreferredView());
            UserPipelineViewPreference saved = userPipelineViewPreferenceJpaRepository.save(preference);

            publishSuccess(actor.getId(), request.getEstablishmentId(), ConfigurationAuditAction.UPDATE,
                    saved.getId(), correlationId,
                    Map.of("before", before, "after", Map.of("preferredView", saved.getPreferredView().name())));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId == null ? GLOBAL_SCOPE_ESTABLISHMENT_ID : establishmentId,
                    ConfigurationAuditAction.UPDATE, null, correlationId,
                    "PIPELINE_VIEW_PREFERENCE_UPDATE_FAILED", ex);
            throw ex;
        }
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

    private PipelineViewPreferenceResponse toResponse(UserPipelineViewPreference item) {
        return PipelineViewPreferenceResponse.builder()
                .id(item.getId())
                .userId(item.getUserId())
                .establishmentId(item.getEstablishmentId())
                .preferredView(item.getPreferredView())
                .updatedAt(item.getUpdatedAt())
                .build();
    }

    private void publishSuccess(UUID actorId, UUID establishmentId, ConfigurationAuditAction action, UUID entityId,
                                String correlationId, Map<String, Object> payloadDiff) {
        configurationAuditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.USER_PIPELINE_VIEW_PREFERENCE)
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
                .establishmentId(establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.USER_PIPELINE_VIEW_PREFERENCE)
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
