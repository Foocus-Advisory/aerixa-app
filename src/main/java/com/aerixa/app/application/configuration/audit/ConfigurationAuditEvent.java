package com.aerixa.app.application.configuration.audit;

import lombok.Builder;
import lombok.Value;

import java.util.Map;
import java.util.UUID;

@Value
@Builder
public class ConfigurationAuditEvent {
    UUID actorId;
    UUID establishmentId;
    ConfigurationAuditAction action;
    ConfigurationAuditEntityType entityType;
    UUID entityId;
    String correlationId;
    ConfigurationAuditOutcome outcome;
    String reasonCode;
    String resourcePath;
    Integer statusCode;
    String errorMessage;
    Map<String, Object> payloadDiff;
}
