package com.aerixa.app.application.whatsapp.service;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditAction;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEntityType;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEvent;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditOutcome;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.whatsapp.dto.EstablishmentWhatsappConfigResponse;
import com.aerixa.app.application.whatsapp.dto.UpdateEstablishmentWhatsappConfigRequest;
import com.aerixa.app.application.whatsapp.security.WhatsappConfigPermissions;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.domain.whatsapp.entity.EstablishmentWhatsappConfig;
import com.aerixa.app.domain.whatsapp.entity.WhatsappConnectionStatus;
import com.aerixa.app.infrastructure.configuration.repository.EstablishmentJpaRepository;
import com.aerixa.app.infrastructure.error.ResourceNotFoundException;
import com.aerixa.app.infrastructure.security.EncryptionService;
import com.aerixa.app.infrastructure.whatsapp.repository.EstablishmentWhatsappConfigJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EstablishmentWhatsappConfigService {

    private final EstablishmentWhatsappConfigJpaRepository establishmentWhatsappConfigJpaRepository;
    private final EstablishmentJpaRepository establishmentJpaRepository;
    private final UserRepository userRepository;
    private final ConfigurationPermissionGuard permissionGuard;
    private final ConfigurationAuditPublisher auditPublisher;
    private final EncryptionService encryptionService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public EstablishmentWhatsappConfigResponse getOrCreate(UUID actorUserId, UUID establishmentId, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, WhatsappConfigPermissions.ESTABLISHMENT_WHATSAPP_CONFIG_READ);
        assertEstablishmentAccess(actor, establishmentId);

        EstablishmentWhatsappConfig config = resolveOrCreate(establishmentId, actor);

        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.READ, config.getId(), correlationId, Map.of());
        return toResponse(config);
    }

    @Transactional
    public EstablishmentWhatsappConfigResponse update(UUID actorUserId, UUID establishmentId,
                                                        UpdateEstablishmentWhatsappConfigRequest request, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, WhatsappConfigPermissions.ESTABLISHMENT_WHATSAPP_CONFIG_UPDATE);
        assertEstablishmentAccess(actor, establishmentId);

        if (request == null) {
            throw new IllegalArgumentException("La requete de mise a jour est obligatoire");
        }

        EstablishmentWhatsappConfig config = resolveOrCreate(establishmentId, actor);

        try {
            if (request.getWabaId() != null) {
                config.setWabaId(blankToNull(request.getWabaId()));
            }
            if (request.getPhoneNumberId() != null) {
                config.setPhoneNumberId(blankToNull(request.getPhoneNumberId()));
            }
            if (request.getDisplayPhoneNumber() != null) {
                config.setDisplayPhoneNumber(blankToNull(request.getDisplayPhoneNumber()));
            }
            if (request.getAccessToken() != null) {
                String accessToken = blankToNull(request.getAccessToken());
                config.setAccessTokenCiphertext(accessToken == null ? null : encryptionService.encryptWithMasterKey(accessToken));
            }

            config.setConnectionStatus(resolveConnectionStatus(config));
            config.setUpdatedByUserId(actor.getId());
            config.setUpdatedByLabel(actor.getEmail());

            EstablishmentWhatsappConfig saved = establishmentWhatsappConfigJpaRepository.save(config);

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE, saved.getId(), correlationId,
                    Map.of("after", Map.of(
                            "wabaId", String.valueOf(saved.getWabaId()),
                            "phoneNumberId", String.valueOf(saved.getPhoneNumberId()),
                            "connectionStatus", saved.getConnectionStatus().name()
                    )));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE, config.getId(), correlationId,
                    "ESTABLISHMENT_WHATSAPP_CONFIG_UPDATE_FAILED", ex);
            throw ex;
        }
    }

    private WhatsappConnectionStatus resolveConnectionStatus(EstablishmentWhatsappConfig config) {
        boolean fullyConfigured = config.getWabaId() != null
                && config.getPhoneNumberId() != null
                && config.getDisplayPhoneNumber() != null
                && config.getAccessTokenCiphertext() != null;

        if (!fullyConfigured) {
            return WhatsappConnectionStatus.NOT_CONFIGURED;
        }
        if (config.getConnectionStatus() == WhatsappConnectionStatus.ACTIVE
                || config.getConnectionStatus() == WhatsappConnectionStatus.ERROR) {
            return config.getConnectionStatus();
        }
        return WhatsappConnectionStatus.PENDING_VERIFICATION;
    }

    private EstablishmentWhatsappConfig resolveOrCreate(UUID establishmentId, User actor) {
        return establishmentWhatsappConfigJpaRepository.findByEstablishmentId(establishmentId)
                .orElseGet(() -> establishmentWhatsappConfigJpaRepository.save(EstablishmentWhatsappConfig.builder()
                        .establishmentId(establishmentId)
                        .encryptionKeyCiphertext(encryptionService.encryptKeyWithMasterKey(encryptionService.generateDataEncryptionKey()))
                        .webhookVerifyToken(generateWebhookVerifyToken())
                        .connectionStatus(WhatsappConnectionStatus.NOT_CONFIGURED)
                        .createdByUserId(actor.getId())
                        .createdByLabel(actor.getEmail())
                        .build()));
    }

    private String generateWebhookVerifyToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String blankToNull(String value) {
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
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

    private EstablishmentWhatsappConfigResponse toResponse(EstablishmentWhatsappConfig config) {
        return EstablishmentWhatsappConfigResponse.builder()
                .id(config.getId())
                .establishmentId(config.getEstablishmentId())
                .wabaId(config.getWabaId())
                .phoneNumberId(config.getPhoneNumberId())
                .displayPhoneNumber(config.getDisplayPhoneNumber())
                .accessTokenConfigured(config.getAccessTokenCiphertext() != null)
                .webhookVerifyToken(config.getWebhookVerifyToken())
                .connectionStatus(config.getConnectionStatus())
                .lastSyncedAt(config.getLastSyncedAt())
                .createdAt(config.getCreatedAt())
                .updatedAt(config.getUpdatedAt())
                .build();
    }

    private void publishSuccess(UUID actorId, UUID establishmentId, ConfigurationAuditAction action, UUID entityId,
                                 String correlationId, Map<String, Object> payloadDiff) {
        auditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.ESTABLISHMENT_WHATSAPP_CONFIG)
                .entityId(entityId)
                .correlationId(normalizeCorrelationId(correlationId))
                .outcome(ConfigurationAuditOutcome.SUCCESS)
                .payloadDiff(payloadDiff)
                .build());
    }

    private void publishFailure(UUID actorId, UUID establishmentId, ConfigurationAuditAction action, UUID entityId,
                                 String correlationId, String reasonCode, RuntimeException ex) {
        auditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.ESTABLISHMENT_WHATSAPP_CONFIG)
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
