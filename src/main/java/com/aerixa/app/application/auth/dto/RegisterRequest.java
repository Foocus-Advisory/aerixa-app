package com.aerixa.app.application.auth.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterRequest {
    private String email;
    private String firstName;
    private String lastName;
    private String username;
    private String phoneNumber;
    private String password;
}
