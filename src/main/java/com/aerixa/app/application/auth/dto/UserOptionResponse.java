package com.aerixa.app.application.auth.dto;

import lombok.Builder;
import lombok.Value;

import java.util.UUID;

@Value
@Builder
public class UserOptionResponse {
    UUID id;
    String displayName;
    String email;
}
