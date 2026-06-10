package com.aerixa.app.application.configuration.dto;

import com.aerixa.app.domain.configuration.entity.PipelineViewType;
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
public class PipelineViewPreferenceResponse {
    private UUID id;
    private UUID userId;
    private UUID establishmentId;
    private PipelineViewType preferredView;
    private LocalDateTime updatedAt;
}
