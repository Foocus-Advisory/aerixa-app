package com.aerixa.app.domain.mail.entity;

import com.aerixa.app.domain.shared.entity.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * Représente un template de mail avec support de versioning.
 * Chaque template est lié à un MailType et peut avoir plusieurs versions.
 */
@Entity
@Table(
    name = "mail_templates",
    schema = "auth",
    indexes = {
        @Index(name = "idx_mail_template_type", columnList = "mail_type_id"),
        @Index(name = "idx_mail_template_current", columnList = "mail_type_id, is_current", unique = false)
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MailTemplate extends AuditableEntity {

    /**
     * Référence au type de mail
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mail_type_id", nullable = false)
    private MailType mailType;

    /**
     * Sujet du mail (peut contenir des variables avec ${var})
     */
    @Column(nullable = false, length = 500)
    private String subject;

    /**
     * Corps du mail en HTML
     */
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String htmlContent;

    /**
     * Contenu texte simple (fallback)
     */
    @Column(columnDefinition = "LONGTEXT")
    private String textContent;

    /**
     * Prévisualisation condensée
     */
    @Column(length = 500)
    private String preview;

    /**
     * Version numérique (auto-incrémentée)
     */
    @Column(nullable = false)
    @Builder.Default
    private Integer versionNumber = 1;

    /**
     * Indique si c'est la version active
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean isCurrent = true;

    /**
     * Langue du template (en, fr, etc.)
     */
    @Column(length = 10)
    @Builder.Default
    private String language = "fr";

    /**
     * Notes de la version
     */
    @Column(length = 500)
    private String versionNotes;

    /**
     * UUID de l'utilisateur qui a modifié cette version en dernier
     */
    @Column(length = 36)
    private String lastModifiedByUserId;

    /**
     * Timestamp de la dernière publication
     */
    private Long publishedAt;

    /**
     * Variables de mail requises/supportées (format: var1|var2|var3)
     */
    @Column(columnDefinition = "TEXT")
    private String supportedVariables;

    /**
     * CSS personnalisé optionnel pour le template
     */
    @Column(columnDefinition = "LONGTEXT")
    private String customStyles;
}
