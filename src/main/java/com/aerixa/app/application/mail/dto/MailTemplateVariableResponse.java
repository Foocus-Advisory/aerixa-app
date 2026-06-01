package com.aerixa.app.application.mail.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO réponse pour une variable de template
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MailTemplateVariableResponse {
    private UUID id;
    private String code;
    private String label;
    private String description;
    private String exampleValue;
    private String category;
    private String dataType;
    private Boolean required;
    private Boolean active;
    private Integer displayOrder;
    private String pattern;
    private String applicableMailTypes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
