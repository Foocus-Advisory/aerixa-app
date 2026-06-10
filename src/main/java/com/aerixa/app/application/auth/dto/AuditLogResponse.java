package com.aerixa.app.application.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLogResponse {
    private UUID id;
    private LocalDateTime timestamp;
    private String action;
    private String status;
    private String outcome;
    private String message;
    private String resourcePath;
    private Integer statusCode;
    private String errorMessage;
    private String correlationId;
    private UUID actorId;
    private UUID userId;
    private String actorRoles;
    private String userEmail;
    private String ipAddress;
    private String userAgent;
    private UUID sessionId;
    private UUID targetId;
    private String targetType;
    private String reasonCode;
    private String details;
    private UUID establishmentId;
}