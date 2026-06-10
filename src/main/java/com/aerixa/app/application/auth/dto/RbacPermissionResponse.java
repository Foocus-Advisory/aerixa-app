package com.aerixa.app.application.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RbacPermissionResponse {
    private UUID id;
    private String name;
    private String description;
    private String module;
    private String action;
}
