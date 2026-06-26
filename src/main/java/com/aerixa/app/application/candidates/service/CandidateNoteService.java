package com.aerixa.app.application.candidates.service;

import com.aerixa.app.application.candidates.dto.CandidateNoteAttachmentResponse;
import com.aerixa.app.application.candidates.dto.CandidateNoteResponse;
import com.aerixa.app.application.candidates.dto.CreateCandidateNoteRequest;
import com.aerixa.app.application.candidates.dto.UpdateCandidateNoteRequest;
import com.aerixa.app.application.candidates.security.CandidatesPermissions;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditAction;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEntityType;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEvent;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditOutcome;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.EstablishmentAccessGuard;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.candidates.entity.Candidate;
import com.aerixa.app.domain.candidates.entity.CandidateApplication;
import com.aerixa.app.domain.candidates.entity.CandidateNote;
import com.aerixa.app.domain.candidates.entity.CandidateNoteAttachment;
import com.aerixa.app.domain.candidates.entity.CandidateNoteType;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.infrastructure.candidates.repository.CandidateApplicationJpaRepository;
import com.aerixa.app.infrastructure.candidates.repository.CandidateJpaRepository;
import com.aerixa.app.infrastructure.candidates.repository.CandidateNoteAttachmentJpaRepository;
import com.aerixa.app.infrastructure.candidates.repository.CandidateNoteJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.EstablishmentJpaRepository;
import com.aerixa.app.infrastructure.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CandidateNoteService {

    private final CandidateNoteJpaRepository candidateNoteJpaRepository;
    private final CandidateNoteAttachmentJpaRepository candidateNoteAttachmentJpaRepository;
    private final CandidateJpaRepository candidateJpaRepository;
    private final CandidateApplicationJpaRepository candidateApplicationJpaRepository;
    private final EstablishmentJpaRepository establishmentJpaRepository;
    private final UserRepository userRepository;
    private final ConfigurationPermissionGuard permissionGuard;
    private final ConfigurationAuditPublisher auditPublisher;
    private final EstablishmentAccessGuard establishmentAccessGuard;

    @Transactional
    public CandidateNoteResponse create(UUID actorUserId, UUID candidateId, CreateCandidateNoteRequest request, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATE_NOTES_CREATE);

        try {
            UUID establishmentId = validateCreateRequest(request);
            assertEstablishmentAccess(actor, establishmentId);

            Candidate candidate = candidateJpaRepository.findByIdAndEstablishmentId(candidateId, establishmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Candidat introuvable"));

            UUID candidateApplicationId = null;
            if (request.getCandidateApplicationId() != null) {
                CandidateApplication application = candidateApplicationJpaRepository
                        .findByIdAndEstablishmentId(request.getCandidateApplicationId(), establishmentId)
                        .orElseThrow(() -> new ResourceNotFoundException("Candidature introuvable"));
                if (!application.getCandidateId().equals(candidate.getId())) {
                    throw new IllegalArgumentException("La candidature ne correspond pas a ce candidat");
                }
                candidateApplicationId = application.getId();
            }

            CandidateNote saved = candidateNoteJpaRepository.save(CandidateNote.builder()
                    .establishmentId(establishmentId)
                    .candidateId(candidate.getId())
                    .candidateApplicationId(candidateApplicationId)
                    .type(CandidateNoteType.FREE_TEXT)
                    .content(request.getContent())
                    .authorUserId(actor.getId())
                    .createdByUserId(actor.getId())
                    .createdByLabel(actor.getEmail())
                    .build());

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.CREATE, saved.getId(), correlationId,
                    Map.of("after", toMap(saved)));
            return toResponse(saved, actor);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), request == null ? null : request.getEstablishmentId(), ConfigurationAuditAction.CREATE,
                    null, correlationId, "CANDIDATE_NOTE_CREATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public List<CandidateNoteResponse> list(UUID actorUserId, UUID establishmentId, UUID candidateId, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATE_NOTES_LIST);
        assertEstablishmentAccess(actor, establishmentId);

        candidateJpaRepository.findByIdAndEstablishmentId(candidateId, establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidat introuvable"));

        List<CandidateNote> items = candidateNoteJpaRepository.findAllByEstablishmentIdAndCandidateId(establishmentId, candidateId,
                Sort.by(Sort.Direction.DESC, "createdAt"));
        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.LIST, candidateId, correlationId,
                Map.of("count", items.size()));
        return items.stream().map(item -> toResponse(item, actor)).toList();
    }

    /**
     * Liste les notes (FREE_TEXT non supprimees) d'une candidature precise, avec leurs
     * pieces jointes. C'est le point d'entree utilise par l'onglet Notes de la page de
     * detail candidature (rattachement decide : CandidateApplication, pas Candidate).
     */
    @Transactional(readOnly = true)
    public List<CandidateNoteResponse> listByApplication(UUID actorUserId, UUID establishmentId, UUID candidateApplicationId,
                                                           String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATE_NOTES_LIST);
        assertEstablishmentAccess(actor, establishmentId);

        candidateApplicationJpaRepository.findByIdAndEstablishmentId(candidateApplicationId, establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidature introuvable"));

        List<CandidateNote> items = candidateNoteJpaRepository
                .findAllByEstablishmentIdAndCandidateApplicationIdAndDeletedAtIsNull(establishmentId, candidateApplicationId,
                        Sort.by(Sort.Direction.DESC, "createdAt"));

        Map<UUID, List<CandidateNoteAttachment>> attachmentsByNote = candidateNoteAttachmentJpaRepository
                .findAllByCandidateNoteIdInAndDeletedAtIsNull(items.stream().map(CandidateNote::getId).toList(),
                        Sort.by(Sort.Direction.ASC, "createdAt"))
                .stream()
                .collect(java.util.stream.Collectors.groupingBy(CandidateNoteAttachment::getCandidateNoteId));

        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.LIST, candidateApplicationId, correlationId,
                Map.of("count", items.size()));

        return items.stream()
                .map(item -> toResponse(item, actor, attachmentsByNote.getOrDefault(item.getId(), List.of())))
                .toList();
    }

    @Transactional
    public CandidateNoteResponse update(UUID actorUserId, UUID establishmentId, UUID noteId, UpdateCandidateNoteRequest request,
                                         String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATE_NOTES_UPDATE);
        assertEstablishmentAccess(actor, establishmentId);

        try {
            CandidateNote note = candidateNoteJpaRepository.findByIdAndEstablishmentId(noteId, establishmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Note introuvable"));
            if (note.isDeleted()) {
                throw new ResourceNotFoundException("Note introuvable");
            }
            if (request == null || request.getContent() == null || request.getContent().isBlank()) {
                throw new IllegalArgumentException("Le contenu de la note est obligatoire");
            }
            // Regle d'autorisation au niveau ressource : seul l'auteur peut modifier sa note,
            // meme si un autre acteur detient la permission candidate_notes:update.
            if (note.getAuthorUserId() == null || !note.getAuthorUserId().equals(actor.getId())) {
                throw new PermissionDeniedException(CandidatesPermissions.CANDIDATE_NOTES_UPDATE);
            }

            Map<String, Object> before = toMap(note);
            note.setContent(request.getContent());
            note.setUpdatedByUserId(actor.getId());
            note.setUpdatedByLabel(actor.getEmail());
            CandidateNote saved = candidateNoteJpaRepository.save(note);

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE, saved.getId(), correlationId,
                    Map.of("before", before, "after", toMap(saved)));
            return toResponse(saved, actor);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.UPDATE, noteId, correlationId,
                    "CANDIDATE_NOTE_UPDATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public void delete(UUID actorUserId, UUID establishmentId, UUID noteId, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATE_NOTES_DELETE);
        assertEstablishmentAccess(actor, establishmentId);

        try {
            CandidateNote note = candidateNoteJpaRepository.findByIdAndEstablishmentId(noteId, establishmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Note introuvable"));
            if (note.isDeleted()) {
                throw new ResourceNotFoundException("Note introuvable");
            }
            boolean isAuthor = note.getAuthorUserId() != null && note.getAuthorUserId().equals(actor.getId());
            boolean isElevated = actor.hasRole("SUPER_ADMIN") || actor.hasRole("ADMIN");
            // Consulter/supprimer une note d'autrui est autorise pour ADMIN/SUPER_ADMIN, mais
            // doit etre trace distinctement (reasonCode) pour que l'onglet Audit le mette en
            // evidence comme une action sur une ressource dont l'acteur n'est pas l'auteur.
            if (!isAuthor && !isElevated) {
                throw new PermissionDeniedException(CandidatesPermissions.CANDIDATE_NOTES_DELETE);
            }

            note.setDeletedAt(LocalDateTime.now());
            note.setUpdatedByUserId(actor.getId());
            note.setUpdatedByLabel(actor.getEmail());
            candidateNoteJpaRepository.save(note);

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE, note.getId(), correlationId,
                    Map.of("deletedByAuthor", isAuthor, "content", note.getContent()));
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.DELETE, noteId, correlationId,
                    "CANDIDATE_NOTE_DELETE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional
    public CandidateNote createSystemNote(UUID establishmentId, UUID candidateId, UUID candidateApplicationId, String content) {
        return candidateNoteJpaRepository.save(CandidateNote.builder()
                .establishmentId(establishmentId)
                .candidateId(candidateId)
                .candidateApplicationId(candidateApplicationId)
                .type(CandidateNoteType.SYSTEM)
                .content(content)
                .authorUserId(null)
                .build());
    }

    @Transactional
    public CandidateNote createStageTransitionNote(UUID establishmentId, UUID candidateId, UUID candidateApplicationId,
                                                     UUID actorUserId, String content) {
        User actor = actor(actorUserId);
        return candidateNoteJpaRepository.save(CandidateNote.builder()
                .establishmentId(establishmentId)
                .candidateId(candidateId)
                .candidateApplicationId(candidateApplicationId)
                .type(CandidateNoteType.STAGE_TRANSITION)
                .content(content)
                .authorUserId(actor.getId())
                .createdByUserId(actor.getId())
                .createdByLabel(actor.getEmail())
                .build());
    }

    private UUID validateCreateRequest(CreateCandidateNoteRequest request) {
        if (request == null || request.getEstablishmentId() == null) {
            throw new IllegalArgumentException("L'etablissement est obligatoire");
        }
        if (request.getContent() == null || request.getContent().isBlank()) {
            throw new IllegalArgumentException("Le contenu de la note est obligatoire");
        }
        return request.getEstablishmentId();
    }

    private void assertEstablishmentAccess(User actor, UUID establishmentId) {
        establishmentAccessGuard.assertAccess(actor, establishmentId);
    }

    private User actor(UUID actorUserId) {
        return userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
    }

    private CandidateNoteResponse toResponse(CandidateNote item, User actor) {
        return toResponse(item, actor, List.of());
    }

    private CandidateNoteResponse toResponse(CandidateNote item, User actor, List<CandidateNoteAttachment> attachments) {
        boolean isAuthor = item.getAuthorUserId() != null && item.getAuthorUserId().equals(actor.getId());
        boolean isElevated = actor.hasRole("SUPER_ADMIN") || actor.hasRole("ADMIN");

        return CandidateNoteResponse.builder()
                .id(item.getId())
                .establishmentId(item.getEstablishmentId())
                .candidateId(item.getCandidateId())
                .candidateApplicationId(item.getCandidateApplicationId())
                .type(item.getType())
                .content(item.getContent())
                .authorUserId(item.getAuthorUserId())
                .authorLabel(item.getCreatedByLabel())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .edited(item.getUpdatedAt() != null && item.getCreatedAt() != null
                        && item.getUpdatedAt().isAfter(item.getCreatedAt().plusSeconds(1)))
                .editableByCurrentUser(isAuthor)
                .deletableByCurrentUser(isAuthor || isElevated)
                .attachments(attachments.stream()
                        .sorted(Comparator.comparing(CandidateNoteAttachment::getCreatedAt))
                        .map(this::toAttachmentResponse)
                        .toList())
                .build();
    }

    private CandidateNoteAttachmentResponse toAttachmentResponse(CandidateNoteAttachment attachment) {
        return CandidateNoteAttachmentResponse.builder()
                .id(attachment.getId())
                .candidateNoteId(attachment.getCandidateNoteId())
                .contentType(attachment.getContentType())
                .filename(attachment.getFilename())
                .fileSize(attachment.getFileSize())
                .uploadedByUserId(attachment.getUploadedByUserId())
                .uploadedByLabel(attachment.getUploadedByLabel())
                .createdAt(attachment.getCreatedAt())
                .build();
    }

    private Map<String, Object> toMap(CandidateNote item) {
        return Map.of(
                "id", item.getId() == null ? "" : item.getId().toString(),
                "establishmentId", item.getEstablishmentId().toString(),
                "candidateId", item.getCandidateId().toString(),
                "type", item.getType().name()
        );
    }

    private void publishSuccess(UUID actorId, UUID establishmentId, ConfigurationAuditAction action, UUID entityId,
                                 String correlationId, Map<String, Object> payloadDiff) {
        auditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.CANDIDATE_NOTE)
                .entityId(entityId)
                .correlationId(normalizeCorrelationId(correlationId))
                .outcome(ConfigurationAuditOutcome.SUCCESS)
                .payloadDiff(payloadDiff)
                .build());
    }

    private void publishFailure(UUID actorId, UUID establishmentId, ConfigurationAuditAction action, UUID entityId,
                                 String correlationId, String reasonCode, RuntimeException ex) {
        auditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId == null ? UUID.fromString("00000000-0000-0000-0000-000000000000") : establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.CANDIDATE_NOTE)
                .entityId(entityId)
                .correlationId(normalizeCorrelationId(correlationId))
                .outcome(ConfigurationAuditOutcome.FAILURE)
                .reasonCode(reasonCode)
                .errorMessage(ex.getMessage())
                .payloadDiff(Map.of())
                .build());
    }

    private String normalizeCorrelationId(String correlationId) {
        return correlationId == null || correlationId.isBlank() ? UUID.randomUUID().toString() : correlationId.trim();
    }
}
