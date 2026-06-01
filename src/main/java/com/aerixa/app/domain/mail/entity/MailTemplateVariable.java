package com.aerixa.app.domain.mail.entity;

import com.aerixa.app.domain.shared.entity.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * Représente une variable disponible pour les templates de mail.
 * Permet de centraliser la documentation des placeholders utilisables.
 */
@Entity
@Table(
    name = "mail_template_variables",
    schema = "auth",
    indexes = {
        @Index(name = "idx_mail_template_var_code", columnList = "code", unique = true),
        @Index(name = "idx_mail_template_var_category", columnList = "category")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MailTemplateVariable extends AuditableEntity {

    /**
     * Code de la variable (ex: USER_NAME, USER_EMAIL)
     */
    @Column(nullable = false, unique = true, length = 100)
    private String code;

    /**
     * Libellé affiché (ex: "Nom de l'utilisateur")
     */
    @Column(nullable = false, length = 255)
    private String label;

    /**
     * Description détaillée
     */
    @Column(length = 500)
    private String description;

    /**
     * Exemple de valeur
     */
    @Column(length = 255)
    private String exampleValue;

    /**
     * Catégorie (USER, SYSTEM, COMPANY, etc.)
     */
    @Column(nullable = false, length = 50)
    private String category;

    /**
     * Type de données (STRING, EMAIL, URL, DATETIME, etc.)
     */
    @Column(length = 50)
    @Builder.Default
    private String dataType = "STRING";

    /**
     * Indique si cette variable est requise dans tous les templates
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean required = false;

    /**
     * Indique si cette variable est active et disponible
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    /**
     * Ordre d'affichage
     */
    @Column(nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    /**
     * Format/pattern pour la validation (regex)
     */
    @Column(length = 255)
    private String pattern;

    /**
     * Types de mail supportant cette variable (format: TYPE1|TYPE2)
     */
    @Column(columnDefinition = "TEXT")
    private String applicableMailTypes;
}
