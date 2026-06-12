package com.aerixa.app.application.candidates.dto;

import com.aerixa.app.domain.candidates.entity.CandidateApplicationClosedReason;
import com.aerixa.app.domain.candidates.entity.CandidateApplicationStatus;
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
public class CandidateApplicationResponse {
    private UUID id;
    private UUID establishmentId;
    private UUID candidateId;
    private UUID programTrackLevelId;
    private UUID currentStageId;
    private CandidateApplicationStatus status;
    private UUID assignedOperatorId;
    private LocalDateTime closedAt;
    private CandidateApplicationClosedReason closedReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdByUserId;
    private String createdByLabel;
    private UUID updatedByUserId;
    private String updatedByLabel;
}
