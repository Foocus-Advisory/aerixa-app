package com.aerixa.app.application.auth.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionResponse {
    private UUID id;
    private UUID userId;
    private String userEmail;
    private String userDisplayName;
    private String deviceName;
    private String deviceType;
    private String ipAddress;
    private String userAgent;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime endedAt;
    private LocalDateTime lastActivityAt;
    private LocalDateTime expiresAt;
    private LocalDateTime revokedAt;
    private boolean isCurrentSession;
}
