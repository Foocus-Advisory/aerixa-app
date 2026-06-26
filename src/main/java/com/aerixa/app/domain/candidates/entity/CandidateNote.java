package com.aerixa.app.domain.candidates.entity;

import com.aerixa.app.domain.shared.entity.AuditableEntity;
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

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "candidate_notes", schema = "auth")
@Data
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CandidateNote extends AuditableEntity {

    @Column(name = "establishment_id", nullable = false)
    private UUID establishmentId;

    @Column(name = "candidate_id", nullable = false)
    private UUID candidateId;

    @Column(name = "candidate_application_id")
    private UUID candidateApplicationId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CandidateNoteType type;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "author_user_id")
    private UUID authorUserId;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public boolean isDeleted() {
        return deletedAt != null;
    }
}
