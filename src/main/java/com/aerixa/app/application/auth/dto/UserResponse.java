package com.aerixa.app.application.auth.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {
    private UUID id;
    private String email;
    private String username;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String addressLine1;
    private String addressLine2;
    private String city;
    private String postalCode;
    private String country;
    private String bio;
    private String profilePhotoUrl;
    private String status;
    private boolean emailVerified;
    private boolean mustChangePassword;
    private Set<String> roles;
    private UUID parentAdminId;
    private String parentAdminEmail;
    private String parentAdminDisplayName;
    private LocalDateTime lastLoginAt;
    private LocalDateTime deletedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
