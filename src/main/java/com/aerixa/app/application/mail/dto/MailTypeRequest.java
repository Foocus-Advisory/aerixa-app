package com.aerixa.app.application.mail.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

/**
 * DTO requête pour créer/modifier un type de mail
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MailTypeRequest {
    private String code;

    @NotBlank(message = "La categorie est requise")
    private String category;

    @NotBlank(message = "Le nom est requis")
    private String name;

    private String description;

    private String defaultRecipient;

    @NotNull
    @Builder.Default
    private Boolean active = true;

    @NotNull
    @Builder.Default
    private Long minResendIntervalSeconds = 0L;

    @NotNull
    @Builder.Default
    private Integer maxRetries = 3;

    @NotNull
    @Builder.Default
    private Boolean showSystemComments = true;
}
