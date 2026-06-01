package com.aerixa.app.application.mail.dto;

import lombok.*;

/**
 * DTO réponse pour la prévisualisation d'un template
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MailTemplatePreviewResponse {
    private String subject;
    private String htmlContent;
    private String textContent;
    private String preview;
    private String renderedHtml;
    private String renderedText;
}
