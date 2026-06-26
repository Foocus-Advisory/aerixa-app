package com.aerixa.app.domain.candidates.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "candidate_application_stage_history", schema = "auth")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CandidateApplicationStageHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "candidate_application_id", nullable = false)
    private UUID candidateApplicationId;

    @Column(name = "from_stage_id")
    private UUID fromStageId;

    @Column(name = "to_stage_id", nullable = false)
    private UUID toStageId;

    @Enumerated(EnumType.STRING)
    @Column(name = "transition_type", nullable = false, length = 30)
    private CandidateApplicationTransitionType transitionType;

    @Column(name = "note_id")
    private UUID noteId;

    @Column(name = "actor_user_id")
    private UUID actorUserId;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;
}
