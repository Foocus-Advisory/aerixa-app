package com.aerixa.app.application.configuration.dto;

import com.aerixa.app.domain.configuration.entity.FunnelStageType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateFunnelStageRequest {
    private UUID establishmentId;
    private String code;
    private String name;
    private String description;
    private FunnelStageType stageType;
    private Integer positionOrder;
}
