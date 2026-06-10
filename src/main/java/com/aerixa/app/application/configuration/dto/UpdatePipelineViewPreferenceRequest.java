package com.aerixa.app.application.configuration.dto;

import com.aerixa.app.domain.configuration.entity.PipelineViewType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdatePipelineViewPreferenceRequest {
    private UUID establishmentId;
    private PipelineViewType preferredView;
}
