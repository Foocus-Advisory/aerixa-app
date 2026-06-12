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
public class CreateCandidateApplicationRequest {
    private UUID establishmentId;
    private UUID programTrackLevelId;
    private UUID assignedOperatorId;
}
