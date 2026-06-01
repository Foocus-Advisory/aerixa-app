package com.aerixa.app.application.mail.dto;

import lombok.*;

import java.util.Map;

/**
 * DTO requête pour prévisualiser un template avec des valeurs de test
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MailTemplatePreviewRequest {
    private String subject;
    private String htmlContent;
    private String textContent;

    /**
     * Variables de remplacement pour la prévisualisation
     * ex: {"USER_NAME": "Jean", "USER_EMAIL": "jean@example.com"}
     */
    private Map<String, String> variables;
}
