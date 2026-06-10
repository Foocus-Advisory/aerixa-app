package com.aerixa.app.application.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RbacRoleResponse {
    private UUID id;
    private String name;
    private String description;
    private Integer level;
    private Boolean isSystem;
    private long usersCount;
    private Set<String> permissions;
}
