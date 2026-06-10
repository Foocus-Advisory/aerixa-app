package com.aerixa.app.application.auth.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponse {
    private String accessToken;
    private String refreshToken;
    private UserResponse user;
    private boolean mustChangePassword;
    private boolean mfaRequired;
    private UUID mfaChallengeId;
    private String mfaMethod;
    private LocalDateTime mfaExpiresAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UserResponse {
        private UUID id;
        private String email;
        private String firstName;
        private String lastName;
        private String username;
        private Set<String> roles;
    }
}
