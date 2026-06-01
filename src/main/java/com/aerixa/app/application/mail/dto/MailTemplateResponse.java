package com.aerixa.app.application.mail.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO réponse pour un template de mail
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MailTemplateResponse {
    private UUID id;
    private UUID mailTypeId;
    private String mailTypeCode;
    private String mailTypeName;
    private String subject;
    private String htmlContent;
    private String textContent;
    private String preview;
    private Integer versionNumber;
    private Boolean isCurrent;
    private String language;
    private String versionNotes;
    private String createdByUserId;
    private String lastModifiedByUserId;
    private Long publishedAt;
    private String supportedVariables;
    private String customStyles;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
