package com.aerixa.app.application.configuration.dto;

import com.aerixa.app.domain.configuration.entity.AcquisitionChannelType;
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
public class AcquisitionChannelResponse {
    private UUID id;
    private UUID establishmentId;
    private String code;
    private String name;
    private AcquisitionChannelType type;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID createdByUserId;
    private String createdByLabel;
    private UUID updatedByUserId;
    private String updatedByLabel;
}
