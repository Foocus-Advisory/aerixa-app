package com.aerixa.app.domain.mail.entity;

import com.aerixa.app.domain.shared.entity.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * Représente un type de mail (PASSWORD_RESET, USER_INVITATION, etc.)
 * Permet de catégoriser et gérer les différents templates de mail.
 */
@Entity
@Table(
    name = "mail_types",
    schema = "auth",
    indexes = {
        @Index(name = "idx_mail_type_code", columnList = "code", unique = true),
        @Index(name = "idx_mail_type_category", columnList = "category", unique = true)
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MailType extends AuditableEntity {

    /**
     * Code unique du type de mail (ex: PASSWORD_RESET, USER_INVITATION)
     */
    @Column(nullable = false, unique = true, length = 100)
    private String code;

    /**
     * Categorie fonctionnelle du type de mail (module + action backend)
     */
    @Column(nullable = false, unique = true, length = 100)
    private String category;

    /**
     * Nom affiché (ex: "Réinitialisation de mot de passe")
     */
    @Column(nullable = false, length = 255)
    private String name;

    /**
     * Description détaillée du type de mail
     */
    @Column(length = 1000)
    private String description;

    /**
     * Destinataires par défaut (ex: USER, ADMIN)
     */
    @Column(length = 100)
    private String defaultRecipient;

    /**
     * Indique si ce type de mail est actif
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    /**
     * Fréquence de renvoi autorisée (en secondes) - 0 = pas de limite
     */
    @Column(nullable = false)
    @Builder.Default
    private Long minResendIntervalSeconds = 0L;

    /**
     * Nombre maximal de tentatives avant fallback
     */
    @Column(nullable = false)
    @Builder.Default
    private Integer maxRetries = 3;

    /**
     * Indique si les commentaires système sont visibles dans les templates
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean showSystemComments = true;
}
