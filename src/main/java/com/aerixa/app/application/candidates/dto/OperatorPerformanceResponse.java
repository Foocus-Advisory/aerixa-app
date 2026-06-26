package com.aerixa.app.application.candidates.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OperatorPerformanceResponse {
    private UUID operatorUserId;
    private String operatorEmail;
    private String operatorDisplayName;
    private long candidatesCount;
    private long activeCandidatesCount;
    private long applicationsCount;
    private long applicationsInProgressCount;
    private long applicationsAcceptedCount;
    private long applicationsRejectedCount;
    /** Taux de conversion sur les candidatures closes (acceptees / (acceptees + rejetees)), null si aucune candidature close. */
    private Double conversionRate;
}
