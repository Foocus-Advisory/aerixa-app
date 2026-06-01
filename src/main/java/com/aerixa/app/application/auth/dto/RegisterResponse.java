package com.aerixa.app.application.auth.dto;

import lombok.*;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterResponse {
    private UUID id;
    private String email;
    private boolean emailVerificationRequired;
}
