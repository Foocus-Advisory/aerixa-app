package com.aerixa.app.application.configuration.dto;

import com.aerixa.app.domain.configuration.entity.AcquisitionChannelType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateAcquisitionChannelRequest {
    private UUID establishmentId;
    private String code;
    private String name;
    private AcquisitionChannelType type;
}
