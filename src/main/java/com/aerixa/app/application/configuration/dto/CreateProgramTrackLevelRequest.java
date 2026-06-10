package com.aerixa.app.application.configuration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateProgramTrackLevelRequest {
    private UUID establishmentId;
    private UUID programTrackId;
    private UUID academicLevelId;
}
