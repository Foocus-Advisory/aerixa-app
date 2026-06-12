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
public class EligibleProgramTrackLevelResponse {
    private UUID programTrackLevelId;
    private UUID programTrackId;
    private String programTrackName;
    private UUID academicLevelId;
    private String academicLevelLabel;
    private Integer academicLevelRankOrder;
}
