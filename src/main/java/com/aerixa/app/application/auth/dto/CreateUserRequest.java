package com.aerixa.app.application.auth.dto;

import lombok.*;

import java.util.UUID;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateUserRequest {
    private String email;
    private String username;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String password;
    private UUID parentAdminId;
    private Set<String> roles;
}
