package com.aerixa.app.application.auth.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MfaSetupConfirmRequest {
    private String secret;
    private String code;
}
