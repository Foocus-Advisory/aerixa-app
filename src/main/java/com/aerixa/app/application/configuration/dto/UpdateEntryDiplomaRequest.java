package com.aerixa.app.application.configuration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateEntryDiplomaRequest {
    private String label;
    private Integer rankOrder;
}
