package com.aerixa.app.application.candidates.dto;

import com.aerixa.app.domain.candidates.entity.CandidateApplicationTransitionType;
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
public class CandidateApplicationStageHistoryResponse {
    private UUID id;
    private UUID candidateApplicationId;
    private UUID fromStageId;
    private UUID toStageId;
    private CandidateApplicationTransitionType transitionType;
    private UUID noteId;
    private UUID actorUserId;
    private LocalDateTime occurredAt;
}
