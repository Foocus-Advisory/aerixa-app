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
public class AssignedOperatorResponse {
    private UUID operatorUserId;
    private String operatorEmail;
    private String operatorDisplayName;
}
