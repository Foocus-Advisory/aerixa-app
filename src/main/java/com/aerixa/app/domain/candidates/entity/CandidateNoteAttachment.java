package com.aerixa.app.domain.candidates.entity;

import com.aerixa.app.domain.shared.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Piece jointe d'une note de candidature. Le stockage est abstrait via {@code storageType}
 * et {@code storageRef} : aujourd'hui le contenu vit dans {@code fileContent} (BLOB), mais
 * un stockage objet externe pourra remplir {@code storageRef} (cle/URL) sans changer le
 * contrat de l'API ni cette entite.
 */
@Entity
@Table(name = "candidate_note_attachments", schema = "auth")
@Data
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CandidateNoteAttachment extends BaseEntity {

    @Column(name = "establishment_id", nullable = false)
    private UUID establishmentId;

    @Column(name = "candidate_note_id", nullable = false)
    private UUID candidateNoteId;

    @Enumerated(EnumType.STRING)
    @Column(name = "storage_type", nullable = false, length = 20)
    private AttachmentStorageType storageType;

    @Column(name = "storage_ref", columnDefinition = "TEXT")
    private String storageRef;

    @Column(name = "file_content", columnDefinition = "bytea")
    private byte[] fileContent;

    @Column(name = "content_type", nullable = false, length = 120)
    private String contentType;

    @Column(nullable = false, length = 255)
    private String filename;

    @Column(name = "file_size", nullable = false)
    private long fileSize;

    @Column(name = "uploaded_by_user_id")
    private UUID uploadedByUserId;

    @Column(name = "uploaded_by_label", length = 255)
    private String uploadedByLabel;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_by_user_id")
    private UUID deletedByUserId;

    @Column(name = "deleted_by_label", length = 255)
    private String deletedByLabel;

    public boolean isDeleted() {
        return deletedAt != null;
    }
}
