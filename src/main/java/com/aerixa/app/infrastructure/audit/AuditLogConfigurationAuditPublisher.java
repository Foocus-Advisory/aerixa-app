package com.aerixa.app.infrastructure.audit;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditAction;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEntityType;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEvent;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditOutcome;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.domain.auth.entity.AuditLog;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.repository.AuditLogRepository;
import com.aerixa.app.domain.auth.repository.UserRepository;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuditLogConfigurationAuditPublisher implements ConfigurationAuditPublisher {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Override
    public void publish(ConfigurationAuditEvent event) {
        if (event == null) {
            throw new IllegalArgumentException("Configuration audit event is required");
        }
        if (event.getActorId() == null || event.getEstablishmentId() == null || event.getAction() == null
                || event.getEntityType() == null || event.getCorrelationId() == null || event.getCorrelationId().isBlank()
                || event.getOutcome() == null) {
            throw new IllegalArgumentException("Missing mandatory configuration audit fields");
        }

        User actor = userRepository.findById(event.getActorId()).orElse(null);
        AuditLog logEntry = AuditLog.builder()
                .correlationId(event.getCorrelationId().trim())
                .user(actor)
                .action(mapAction(event.getAction()))
                .entityType(event.getEntityType().name())
                .entityId(event.getEntityId())
                .resourcePath(event.getResourcePath())
                .actorRoles(serializeActorRoles(actor))
                .outcome(mapOutcome(event.getOutcome()))
                .reasonCode(event.getReasonCode())
                .statusCode(event.getStatusCode())
                .errorMessage(event.getErrorMessage())
                .details(serializeDetails(event))
                .establishmentId(event.getEstablishmentId())
                .createdByUserId(event.getActorId())
                .createdByLabel(actor != null ? actor.getEmail() : null)
                .build();

        try {
            auditLogRepository.save(logEntry);
        } catch (Exception ex) {
            log.error("Unable to persist configuration audit event: entityType={}, action={}, correlationId={}",
                    event.getEntityType(), event.getAction(), event.getCorrelationId(), ex);
            throw new IllegalStateException("Unable to persist configuration audit event", ex);
        }
    }

    private AuditLog.AuditAction mapAction(ConfigurationAuditAction action) {
        return switch (action) {
            case CREATE, IMPORT -> AuditLog.AuditAction.CREATE;
            case DELETE, HARD_DELETE -> AuditLog.AuditAction.DELETE;
            case READ, LIST, EXPORT -> AuditLog.AuditAction.READ;
            case UPDATE, ACTIVATE, DEACTIVATE, TRANSITION -> AuditLog.AuditAction.UPDATE;
        };
    }

    private AuditLog.AuditOutcome mapOutcome(ConfigurationAuditOutcome outcome) {
        return outcome == ConfigurationAuditOutcome.FAILURE
                ? AuditLog.AuditOutcome.FAILURE
                : AuditLog.AuditOutcome.SUCCESS;
    }

    private String serializeActorRoles(User actor) {
        if (actor == null || actor.getRoles() == null || actor.getRoles().isEmpty()) {
            return "[]";
        }

        List<String> roleNames = actor.getRoles().stream()
                .map(role -> role.getName())
                .sorted()
                .toList();

        try {
            return objectMapper.writeValueAsString(roleNames);
        } catch (Exception e) {
            return "[]";
        }
    }

    private String serializeDetails(ConfigurationAuditEvent event) {
        Map<String, Object> details = Map.of(
                "establishmentId", event.getEstablishmentId().toString(),
                "payloadDiff", event.getPayloadDiff() == null ? Map.of() : event.getPayloadDiff(),
                "entityType", event.getEntityType().name(),
                "action", event.getAction().name()
        );

        try {
            return objectMapper.writeValueAsString(details);
        } catch (Exception e) {
            return "{}";
        }
    }
}
