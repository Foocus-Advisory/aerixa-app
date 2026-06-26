package com.aerixa.app.application.candidates.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entree agregee de l'onglet Audit d'une candidature : reconstitue a partir de
 * {@code auth.audit_logs} (entites CANDIDATE_NOTE et CANDIDATE_NOTE_ATTACHMENT) plutot que
 * persistee dans une table dediee.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateApplicationAuditEntryResponse {
    private UUID id;
    private String action;
    private String outcome;
    private String entityType;
    private UUID entityId;
    private UUID actorId;
    private String actorEmail;
    private LocalDateTime timestamp;
    private String reasonCode;
    private String errorMessage;
    private String details;
}
