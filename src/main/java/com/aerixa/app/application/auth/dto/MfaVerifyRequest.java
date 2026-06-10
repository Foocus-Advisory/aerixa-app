package com.aerixa.app.application.auth.dto;

import lombok.*;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MfaVerifyRequest {
    private UUID challengeId;
    private String code;
}
