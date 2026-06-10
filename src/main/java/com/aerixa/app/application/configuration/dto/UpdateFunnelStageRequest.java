package com.aerixa.app.application.configuration.dto;

import com.aerixa.app.domain.configuration.entity.FunnelStageType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateFunnelStageRequest {
    private String name;
    private String description;
    private FunnelStageType stageType;
    private Integer positionOrder;
}
