package com.aerixa.app.application.auth.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MfaChallengeResponse {
    private UUID challengeId;
    private String method;
    private LocalDateTime expiresAt;
}
