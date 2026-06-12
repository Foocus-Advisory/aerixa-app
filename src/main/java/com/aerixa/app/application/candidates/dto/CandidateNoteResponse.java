package com.aerixa.app.application.candidates.dto;

import com.aerixa.app.domain.candidates.entity.CandidateNoteType;
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
public class CandidateNoteResponse {
    private UUID id;
    private UUID establishmentId;
    private UUID candidateId;
    private UUID candidateApplicationId;
    private CandidateNoteType type;
    private String content;
    private UUID authorUserId;
    private LocalDateTime createdAt;
}
