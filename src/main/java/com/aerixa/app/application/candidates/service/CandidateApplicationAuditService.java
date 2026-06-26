package com.aerixa.app.application.candidates.service;

import com.aerixa.app.application.candidates.dto.CandidateApplicationAuditEntryResponse;
import com.aerixa.app.application.candidates.security.CandidatesPermissions;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEntityType;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.EstablishmentAccessGuard;
import com.aerixa.app.domain.auth.entity.AuditLog;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.candidates.entity.CandidateNote;
import com.aerixa.app.domain.candidates.entity.CandidateNoteAttachment;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.infrastructure.auth.repository.AuditLogJpaRepository;
import com.aerixa.app.infrastructure.candidates.repository.CandidateApplicationJpaRepository;
import com.aerixa.app.infrastructure.candidates.repository.CandidateNoteAttachmentJpaRepository;
import com.aerixa.app.infrastructure.candidates.repository.CandidateNoteJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.EstablishmentJpaRepository;
import com.aerixa.app.infrastructure.error.ResourceNotFoundException;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Reconstitue l'onglet Audit d'une candidature en agregeant les entrees {@code AuditLog}
 * (entityType CANDIDATE_NOTE / CANDIDATE_NOTE_ATTACHMENT) dont l'entite cible appartient a
 * la candidature, plutot que de persister une nouvelle table dediee.
 */
@Service
@RequiredArgsConstructor
public class CandidateApplicationAuditService {

    private final AuditLogJpaRepository auditLogJpaRepository;
    private final CandidateNoteJpaRepository candidateNoteJpaRepository;
    private final CandidateNoteAttachmentJpaRepository candidateNoteAttachmentJpaRepository;
    private final CandidateApplicationJpaRepository candidateApplicationJpaRepository;
    private final EstablishmentJpaRepository establishmentJpaRepository;
    private final UserRepository userRepository;
    private final ConfigurationPermissionGuard permissionGuard;
    private final EstablishmentAccessGuard establishmentAccessGuard;

    @Transactional(readOnly = true)
    public List<CandidateApplicationAuditEntryResponse> listByApplication(UUID actorUserId, UUID establishmentId,
                                                                           UUID candidateApplicationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATE_APPLICATION_AUDIT_READ);
        assertEstablishmentAccess(actor, establishmentId);

        candidateApplicationJpaRepository.findByIdAndEstablishmentId(candidateApplicationId, establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidature introuvable"));

        // Les notes deja supprimees doivent rester visibles dans l'audit (tracabilite) :
        // on recupere donc toutes les notes de la candidature, supprimees ou non.
        List<UUID> relevantNoteIds = candidateNoteJpaRepository
                .findAllByEstablishmentIdAndCandidateApplicationId(establishmentId, candidateApplicationId, Sort.unsorted())
                .stream().map(CandidateNote::getId).distinct().toList();

        List<UUID> attachmentIds = relevantNoteIds.isEmpty()
                ? List.of()
                : candidateNoteAttachmentJpaRepository
                        .findAllByCandidateNoteIdIn(relevantNoteIds, Sort.unsorted())
                        .stream().map(CandidateNoteAttachment::getId).toList();

        if (relevantNoteIds.isEmpty() && attachmentIds.isEmpty()) {
            return List.of();
        }

        Specification<AuditLog> spec = (root, query, cb) -> {
            Predicate noteMatch = cb.and(
                    cb.equal(root.get("entityType"), ConfigurationAuditEntityType.CANDIDATE_NOTE.name()),
                    root.get("entityId").in(relevantNoteIds.isEmpty() ? List.of(NIL_UUID) : relevantNoteIds));
            Predicate attachmentMatch = cb.and(
                    cb.equal(root.get("entityType"), ConfigurationAuditEntityType.CANDIDATE_NOTE_ATTACHMENT.name()),
                    root.get("entityId").in(attachmentIds.isEmpty() ? List.of(NIL_UUID) : attachmentIds));
            return cb.or(noteMatch, attachmentMatch);
        };

        List<AuditLog> logs = auditLogJpaRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "timestamp"));
        return logs.stream().map(this::toResponse).toList();
    }

    private static final UUID NIL_UUID = UUID.fromString("00000000-0000-0000-0000-000000000000");

    private void assertEstablishmentAccess(User actor, UUID establishmentId) {
        establishmentAccessGuard.assertAccess(actor, establishmentId);
    }

    private User actor(UUID actorUserId) {
        return userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
    }

    private CandidateApplicationAuditEntryResponse toResponse(AuditLog log) {
        return CandidateApplicationAuditEntryResponse.builder()
                .id(log.getId())
                .action(log.getAction() != null ? log.getAction().name() : null)
                .outcome(log.getOutcome() != null ? log.getOutcome().name() : null)
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .actorId(log.getUser() != null ? log.getUser().getId() : null)
                .actorEmail(log.getUser() != null ? log.getUser().getEmail() : null)
                .timestamp(log.getTimestamp())
                .reasonCode(log.getReasonCode())
                .errorMessage(log.getErrorMessage())
                .details(log.getDetails())
                .build();
    }
}
