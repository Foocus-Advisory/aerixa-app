package com.aerixa.app.application.mail.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

/**
 * DTO requête pour créer/modifier un template de mail
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MailTemplateRequest {
    @NotNull(message = "Le type de mail est requis")
    private UUID mailTypeId;

    @NotBlank(message = "Le sujet est requis")
    private String subject;

    @NotBlank(message = "Le contenu HTML est requis")
    private String htmlContent;

    private String textContent;

    private String preview;

    @NotNull
    @Builder.Default
    private String language = "fr";

    private String versionNotes;

    private String supportedVariables;

    private String customStyles;

    /**
     * Si true, marquer l'ancienne version comme non-courante
     */
    @NotNull
    @Builder.Default
    private Boolean createNewVersion = false;
}
