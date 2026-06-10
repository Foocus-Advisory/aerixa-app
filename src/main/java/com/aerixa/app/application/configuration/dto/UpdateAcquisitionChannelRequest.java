package com.aerixa.app.application.configuration.dto;

import com.aerixa.app.domain.configuration.entity.AcquisitionChannelType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateAcquisitionChannelRequest {
    private String name;
    private AcquisitionChannelType type;
}
