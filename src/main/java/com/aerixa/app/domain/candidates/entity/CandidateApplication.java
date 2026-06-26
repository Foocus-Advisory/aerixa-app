package com.aerixa.app.domain.candidates.entity;

import com.aerixa.app.domain.shared.entity.SoftDeletableEntity;
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
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "candidate_applications", schema = "auth")
@Data
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@SQLDelete(sql = "UPDATE auth.candidate_applications SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class CandidateApplication extends SoftDeletableEntity {

    @Column(name = "establishment_id", nullable = false)
    private UUID establishmentId;

    @Column(name = "candidate_id", nullable = false)
    private UUID candidateId;

    @Column(name = "program_track_level_id", nullable = false)
    private UUID programTrackLevelId;

    @Column(name = "current_stage_id", nullable = false)
    private UUID currentStageId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CandidateApplicationStatus status;

    @Column(name = "assigned_operator_id")
    private UUID assignedOperatorId;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "closed_reason", length = 30)
    private CandidateApplicationClosedReason closedReason;
}
