package com.aerixa.app.application.auth.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MfaSetupInitResponse {
    private String secret;
    private String qrCodeUri;
}
