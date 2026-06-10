package com.aerixa.app.application.configuration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AcademicLevelImportResultResponse {
    private int totalRows;
    private int created;
    private int failed;
    private List<String> errors;
}
