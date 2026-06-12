package com.aerixa.app.application.candidates.service;

import com.aerixa.app.application.candidates.dto.CandidateNoteResponse;
import com.aerixa.app.application.candidates.dto.CreateCandidateNoteRequest;
import com.aerixa.app.application.candidates.security.CandidatesPermissions;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditAction;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEntityType;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEvent;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditOutcome;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.candidates.entity.Candidate;
import com.aerixa.app.domain.candidates.entity.CandidateApplication;
import com.aerixa.app.domain.candidates.entity.CandidateNote;
import com.aerixa.app.domain.candidates.entity.CandidateNoteType;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.infrastructure.candidates.repository.CandidateApplicationJpaRepository;
import com.aerixa.app.infrastructure.candidates.repository.CandidateJpaRepository;
import com.aerixa.app.infrastructure.candidates.repository.CandidateNoteJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.EstablishmentJpaRepository;
import com.aerixa.app.infrastructure.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CandidateNoteService {

    private final CandidateNoteJpaRepository candidateNoteJpaRepository;
    private final CandidateJpaRepository candidateJpaRepository;
    private final CandidateApplicationJpaRepository candidateApplicationJpaRepository;
    private final EstablishmentJpaRepository establishmentJpaRepository;
    private final UserRepository userRepository;
    private final ConfigurationPermissionGuard permissionGuard;
    private final ConfigurationAuditPublisher auditPublisher;

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
            return toResponse(saved);
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
        return items.stream().map(this::toResponse).toList();
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
        Establishment establishment = establishmentJpaRepository.findById(establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Etablissement introuvable"));
        if (!actor.hasRole("SUPER_ADMIN") && !actor.getId().equals(establishment.getCreatedByUserId())) {
            throw new PermissionDeniedException("establishments:scope");
        }
    }

    private User actor(UUID actorUserId) {
        return userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
    }

    private CandidateNoteResponse toResponse(CandidateNote item) {
        return CandidateNoteResponse.builder()
                .id(item.getId())
                .establishmentId(item.getEstablishmentId())
                .candidateId(item.getCandidateId())
                .candidateApplicationId(item.getCandidateApplicationId())
                .type(item.getType())
                .content(item.getContent())
                .authorUserId(item.getAuthorUserId())
                .createdAt(item.getCreatedAt())
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
