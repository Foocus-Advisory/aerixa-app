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
public class CreateCandidateNoteRequest {
    private UUID establishmentId;
    private UUID candidateApplicationId;
    private String content;
}
