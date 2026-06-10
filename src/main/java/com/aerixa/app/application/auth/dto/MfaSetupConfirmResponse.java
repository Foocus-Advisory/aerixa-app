package com.aerixa.app.application.auth.dto;

import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MfaSetupConfirmResponse {
    private List<String> recoveryCodes;
}
