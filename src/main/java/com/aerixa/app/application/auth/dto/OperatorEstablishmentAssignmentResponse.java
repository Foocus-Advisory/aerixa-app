package com.aerixa.app.application.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OperatorEstablishmentAssignmentResponse {
    private UUID id;
    private UUID operatorUserId;
    private UUID establishmentId;
    private String establishmentName;
    private String establishmentCode;
    private UUID assignedByUserId;
    private LocalDateTime assignedAt;
}
