package com.aerixa.app.application.candidates.service;

import com.aerixa.app.application.auth.dto.PagedResponse;
import com.aerixa.app.application.candidates.dto.CandidateApplicationResponse;
import com.aerixa.app.application.candidates.dto.CandidateApplicationStageHistoryResponse;
import com.aerixa.app.application.candidates.dto.CreateCandidateApplicationRequest;
import com.aerixa.app.application.candidates.dto.TransitionCandidateApplicationRequest;
import com.aerixa.app.application.candidates.security.CandidatesPermissions;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditAction;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEntityType;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEvent;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditOutcome;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.EstablishmentAccessGuard;
import com.aerixa.app.application.notification.service.NotificationJobService;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.candidates.entity.Candidate;
import com.aerixa.app.domain.candidates.entity.CandidateApplication;
import com.aerixa.app.domain.candidates.entity.CandidateApplicationClosedReason;
import com.aerixa.app.domain.candidates.entity.CandidateApplicationStageHistory;
import com.aerixa.app.domain.candidates.entity.CandidateApplicationStatus;
import com.aerixa.app.domain.candidates.entity.CandidateApplicationTransitionType;
import com.aerixa.app.domain.candidates.entity.CandidateNote;
import com.aerixa.app.domain.configuration.entity.AcademicLevel;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.domain.configuration.entity.EntryDiploma;
import com.aerixa.app.domain.configuration.entity.FunnelStage;
import com.aerixa.app.domain.configuration.entity.FunnelStageType;
import com.aerixa.app.domain.configuration.entity.ProgramTrack;
import com.aerixa.app.domain.configuration.entity.ProgramTrackLevel;
import com.aerixa.app.domain.mail.model.MailTypeCategory;
import com.aerixa.app.domain.notification.entity.NotificationJobType;
import com.aerixa.app.infrastructure.auth.repository.UserJpaRepository;
import com.aerixa.app.infrastructure.candidates.repository.CandidateApplicationJpaRepository;
import com.aerixa.app.infrastructure.candidates.repository.CandidateApplicationStageHistoryJpaRepository;
import com.aerixa.app.infrastructure.candidates.repository.CandidateJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.AcademicLevelJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.EntryDiplomaJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.EstablishmentJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.FunnelStageJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.FunnelStageTransitionJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.ProgramTrackJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.ProgramTrackLevelJpaRepository;
import com.aerixa.app.infrastructure.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CandidateApplicationService {

    private final CandidateApplicationJpaRepository candidateApplicationJpaRepository;
    private final CandidateApplicationStageHistoryJpaRepository stageHistoryJpaRepository;
    private final CandidateJpaRepository candidateJpaRepository;
    private final EstablishmentJpaRepository establishmentJpaRepository;
    private final ProgramTrackLevelJpaRepository programTrackLevelJpaRepository;
    private final AcademicLevelJpaRepository academicLevelJpaRepository;
    private final EntryDiplomaJpaRepository entryDiplomaJpaRepository;
    private final ProgramTrackJpaRepository programTrackJpaRepository;
    private final FunnelStageJpaRepository funnelStageJpaRepository;
    private final FunnelStageTransitionJpaRepository funnelStageTransitionJpaRepository;
    private final UserRepository userRepository;
    private final UserJpaRepository userJpaRepository;
    private final CandidateNoteService candidateNoteService;
    private final ConfigurationPermissionGuard permissionGuard;
    private final ConfigurationAuditPublisher auditPublisher;
    private final NotificationJobService notificationJobService;
    private final EstablishmentAccessGuard establishmentAccessGuard;

    @Transactional
    public CandidateApplicationResponse create(UUID actorUserId, UUID candidateId, CreateCandidateApplicationRequest request,
                                                 String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATE_APPLICATIONS_CREATE);

        try {
            UUID establishmentId = validateCreateRequest(request);
            assertEstablishmentAccess(actor, establishmentId);

            Candidate candidate = candidateJpaRepository.findByIdAndEstablishmentId(candidateId, establishmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Candidat introuvable"));

            ProgramTrackLevel programTrackLevel = programTrackLevelJpaRepository
                    .findByIdAndEstablishmentId(request.getProgramTrackLevelId(), establishmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Couple filiere/niveau introuvable"));

            if (!programTrackLevel.isOpenForApplication()) {
                throw new IllegalArgumentException("Ce couple filiere/niveau n'est pas ouvert aux candidatures");
            }

            AcademicLevel academicLevel = academicLevelJpaRepository
                    .findByIdAndEstablishmentId(programTrackLevel.getAcademicLevelId(), establishmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Niveau academique introuvable"));
            EntryDiploma entryDiploma = entryDiplomaJpaRepository
                    .findByIdAndEstablishmentId(candidate.getEntryDiplomaId(), establishmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Diplome d'entree introuvable"));

            if (academicLevel.getRankOrder() > entryDiploma.getRankOrder()) {
                throw new IllegalArgumentException("Le candidat n'est pas eligible a ce niveau academique");
            }

            if (candidateApplicationJpaRepository.existsByCandidateIdAndProgramTrackLevelId(candidate.getId(), programTrackLevel.getId())) {
                throw new IllegalArgumentException("Une candidature existe deja pour ce candidat sur ce couple filiere/niveau");
            }

            FunnelStage initialStage = funnelStageJpaRepository
                    .findFirstByEstablishmentIdAndStageTypeAndActiveTrue(establishmentId, FunnelStageType.INITIAL)
                    .orElseThrow(() -> new ResourceNotFoundException("Aucune etape funnel initiale active pour cet etablissement"));

            CandidateApplication saved = candidateApplicationJpaRepository.save(CandidateApplication.builder()
                    .establishmentId(establishmentId)
                    .candidateId(candidate.getId())
                    .programTrackLevelId(programTrackLevel.getId())
                    .currentStageId(initialStage.getId())
                    .status(CandidateApplicationStatus.IN_PROGRESS)
                    .assignedOperatorId(request.getAssignedOperatorId())
                    .createdByUserId(actor.getId())
                    .createdByLabel(actor.getEmail())
                    .build());

            stageHistoryJpaRepository.save(CandidateApplicationStageHistory.builder()
                    .candidateApplicationId(saved.getId())
                    .fromStageId(null)
                    .toStageId(initialStage.getId())
                    .transitionType(CandidateApplicationTransitionType.AUTO_INITIAL)
                    .actorUserId(null)
                    .occurredAt(LocalDateTime.now())
                    .build());

            notifyApplicationCreated(establishment(establishmentId), candidate, saved, actor.getId());

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.CREATE, saved.getId(), correlationId,
                    Map.of("after", toMap(saved)));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), request == null ? null : request.getEstablishmentId(), ConfigurationAuditAction.CREATE,
                    null, correlationId, "CANDIDATE_APPLICATION_CREATE_FAILED", ex);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public List<CandidateApplicationResponse> list(UUID actorUserId, UUID establishmentId, UUID candidateId, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATE_APPLICATIONS_LIST);
        assertEstablishmentAccess(actor, establishmentId);

        Candidate candidate = candidateJpaRepository.findByIdAndEstablishmentId(candidateId, establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidat introuvable"));

        if (isOperatorOnly(actor) && !actor.getId().equals(candidate.getCreatedByUserId())
                && !actor.getId().equals(candidate.getAssignedOperatorId())) {
            throw new PermissionDeniedException("candidates:scope");
        }

        List<CandidateApplication> items = candidateApplicationJpaRepository.findAllByEstablishmentIdAndCandidateId(
                establishmentId, candidateId, Sort.by(Sort.Direction.ASC, "createdAt"));
        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.LIST, candidateId, correlationId,
                Map.of("count", items.size()));
        return items.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public PagedResponse<CandidateApplicationResponse> listByEstablishment(
            UUID actorUserId, UUID establishmentId, int page, int size, String sortBy, String direction,
            String status, UUID funnelStageId, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATE_APPLICATIONS_LIST);
        assertEstablishmentAccess(actor, establishmentId);

        Sort.Direction sortDirection = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        String sortField = normalizeSortField(sortBy);
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by(sortDirection, sortField));

        CandidateApplicationStatus statusFilter = parseStatus(status);

        org.springframework.data.domain.Page<CandidateApplication> items = isOperatorOnly(actor)
                ? candidateApplicationJpaRepository.searchVisibleToOperatorByEstablishment(
                        establishmentId, actor.getId(), statusFilter, funnelStageId, pageable)
                : candidateApplicationJpaRepository.searchAllByEstablishmentId(
                        establishmentId, statusFilter, funnelStageId, pageable);

        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.LIST, null, correlationId,
                Map.of("count", items.getNumberOfElements()));

        return PagedResponse.<CandidateApplicationResponse>builder()
                .content(items.getContent().stream().map(this::toResponse).toList())
                .page(items.getNumber())
                .size(items.getSize())
                .totalElements(items.getTotalElements())
                .totalPages(items.getTotalPages())
                .build();
    }

    private static final List<String> APPLICATION_SORTABLE_FIELDS = List.of("createdAt", "status");

    private String normalizeSortField(String sortBy) {
        return APPLICATION_SORTABLE_FIELDS.contains(sortBy) ? sortBy : "createdAt";
    }

    private CandidateApplicationStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return CandidateApplicationStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Statut candidature invalide: " + status);
        }
    }

    @Transactional(readOnly = true)
    public CandidateApplicationResponse getById(UUID actorUserId, UUID establishmentId, UUID applicationId, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATE_APPLICATIONS_READ);
        assertEstablishmentAccess(actor, establishmentId);

        CandidateApplication item = resolveScoped(applicationId, establishmentId);
        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.READ, item.getId(), correlationId, Map.of());
        return toResponse(item);
    }

    @Transactional(readOnly = true)
    public List<CandidateApplicationStageHistoryResponse> history(UUID actorUserId, UUID establishmentId, UUID applicationId,
                                                                    String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATE_APPLICATIONS_HISTORY);
        assertEstablishmentAccess(actor, establishmentId);

        CandidateApplication application = resolveScoped(applicationId, establishmentId);
        List<CandidateApplicationStageHistory> items = stageHistoryJpaRepository.findAllByCandidateApplicationId(
                application.getId(), Sort.by(Sort.Direction.ASC, "occurredAt"));

        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.LIST, application.getId(), correlationId,
                Map.of("count", items.size(), "context", "stage_history"));
        return items.stream().map(this::toHistoryResponse).toList();
    }

    @Transactional
    public CandidateApplicationResponse transition(UUID actorUserId, UUID establishmentId, UUID applicationId,
                                                     TransitionCandidateApplicationRequest request, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATE_APPLICATIONS_TRANSITION);
        assertEstablishmentAccess(actor, establishmentId);

        CandidateApplication application = resolveScoped(applicationId, establishmentId);

        try {
            if (request == null || request.getToStageId() == null) {
                throw new IllegalArgumentException("toStageId est obligatoire");
            }
            if (request.getNote() == null || request.getNote().isBlank()) {
                throw new IllegalArgumentException("Un motif est obligatoire pour toute transition");
            }
            if (application.getStatus() != CandidateApplicationStatus.IN_PROGRESS) {
                throw new IllegalArgumentException("Cette candidature est deja cloturee");
            }

            FunnelStage fromStage = funnelStageJpaRepository.findByIdAndEstablishmentId(application.getCurrentStageId(), establishmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Etape funnel courante introuvable"));
            FunnelStage toStage = funnelStageJpaRepository.findByIdAndEstablishmentId(request.getToStageId(), establishmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Etape funnel cible introuvable"));

            if (fromStage.getId().equals(toStage.getId())) {
                throw new IllegalArgumentException("La candidature est deja a cette etape");
            }
            if (!funnelStageTransitionJpaRepository.existsByEstablishmentIdAndFromStageIdAndToStageIdAndActiveTrue(
                    establishmentId, fromStage.getId(), toStage.getId())) {
                throw new IllegalArgumentException("Cette transition n'est pas autorisee pour cet etablissement");
            }

            Map<String, Object> before = toMap(application);

            CandidateNote note = candidateNoteService.createStageTransitionNote(
                    establishmentId, application.getCandidateId(), application.getId(), actor.getId(), request.getNote());

            applyTransition(application, fromStage, toStage, CandidateApplicationTransitionType.MANUAL, note.getId(), actor.getId());

            if (toStage.getStageType() == FunnelStageType.FINAL_SUCCESS) {
                application.setStatus(CandidateApplicationStatus.ACCEPTED);
                application.setClosedAt(LocalDateTime.now());
                application.setClosedReason(CandidateApplicationClosedReason.MANUAL);
            } else if (toStage.getStageType() == FunnelStageType.FINAL_FAILURE) {
                application.setStatus(CandidateApplicationStatus.REJECTED);
                application.setClosedAt(LocalDateTime.now());
                application.setClosedReason(CandidateApplicationClosedReason.MANUAL);
            }
            application.setUpdatedByUserId(actor.getId());
            application.setUpdatedByLabel(actor.getEmail());

            CandidateApplication saved = candidateApplicationJpaRepository.save(application);

            if (toStage.getStageType() == FunnelStageType.FINAL_SUCCESS) {
                Establishment establishment = establishment(establishmentId);
                notifyApplicationAccepted(establishment, saved, actor.getId());
                applyAutoExclusivity(establishmentId, saved, actor.getId(), correlationId);
            } else {
                notifyApplicationTransitioned(establishment(establishmentId), saved, toStage, actor.getId());
            }

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.TRANSITION, saved.getId(), correlationId,
                    Map.of("before", before, "after", toMap(saved)));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.TRANSITION, applicationId, correlationId,
                    "CANDIDATE_APPLICATION_TRANSITION_FAILED", ex);
            throw ex;
        }
    }

    private void applyAutoExclusivity(UUID establishmentId, CandidateApplication acceptedApplication, UUID auditActorId, String correlationId) {
        List<CandidateApplication> activeOthers = candidateApplicationJpaRepository
                .findAllByEstablishmentIdAndCandidateIdAndIdNotAndStatus(
                        establishmentId, acceptedApplication.getCandidateId(), acceptedApplication.getId(),
                        CandidateApplicationStatus.IN_PROGRESS);

        if (activeOthers.isEmpty()) {
            return;
        }

        Establishment establishment = establishment(establishmentId);

        FunnelStage rejectionStage = funnelStageJpaRepository
                .findFirstByEstablishmentIdAndStageTypeAndActiveTrueAndDefaultAutoRejectionTrue(establishmentId, FunnelStageType.FINAL_FAILURE)
                .or(() -> funnelStageJpaRepository.findFirstByEstablishmentIdAndStageTypeAndActiveTrueOrderByPositionOrderAsc(
                        establishmentId, FunnelStageType.FINAL_FAILURE))
                .orElseThrow(() -> new ResourceNotFoundException("Aucune etape funnel d'echec final active pour cet etablissement"));

        ProgramTrackLevel acceptedProgramTrackLevel = programTrackLevelJpaRepository
                .findByIdAndEstablishmentId(acceptedApplication.getProgramTrackLevelId(), establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Couple filiere/niveau introuvable"));
        ProgramTrack acceptedProgramTrack = programTrackJpaRepository
                .findByIdAndEstablishmentId(acceptedProgramTrackLevel.getProgramTrackId(), establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Filiere introuvable"));
        AcademicLevel acceptedAcademicLevel = academicLevelJpaRepository
                .findByIdAndEstablishmentId(acceptedProgramTrackLevel.getAcademicLevelId(), establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Niveau academique introuvable"));

        String noteContent = "Cloture automatique: candidat admis dans " + acceptedProgramTrack.getName()
                + " / " + acceptedAcademicLevel.getLabel();

        for (CandidateApplication other : activeOthers) {
            FunnelStage otherCurrentStage = funnelStageJpaRepository.findByIdAndEstablishmentId(other.getCurrentStageId(), establishmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Etape funnel courante introuvable"));

            if (otherCurrentStage.getStageType() == FunnelStageType.FINAL_SUCCESS
                    || otherCurrentStage.getStageType() == FunnelStageType.FINAL_FAILURE) {
                continue;
            }

            CandidateNote systemNote = candidateNoteService.createSystemNote(
                    establishmentId, other.getCandidateId(), other.getId(), noteContent);

            applyTransition(other, otherCurrentStage, rejectionStage, CandidateApplicationTransitionType.AUTO_EXCLUSIVITY,
                    systemNote.getId(), null);

            other.setStatus(CandidateApplicationStatus.REJECTED);
            other.setClosedAt(LocalDateTime.now());
            other.setClosedReason(CandidateApplicationClosedReason.AUTO_OTHER_OFFER_ACCEPTED);
            CandidateApplication savedOther = candidateApplicationJpaRepository.save(other);

            notifyApplicationAutoClosed(establishment, savedOther);

            publishSuccess(auditActorId, establishmentId, ConfigurationAuditAction.TRANSITION, savedOther.getId(), correlationId,
                    Map.of("after", toMap(savedOther), "context", "auto_exclusivity"));
        }
    }

    private void applyTransition(CandidateApplication application, FunnelStage fromStage, FunnelStage toStage,
                                  CandidateApplicationTransitionType transitionType, UUID noteId, UUID actorUserId) {
        application.setCurrentStageId(toStage.getId());

        stageHistoryJpaRepository.save(CandidateApplicationStageHistory.builder()
                .candidateApplicationId(application.getId())
                .fromStageId(fromStage.getId())
                .toStageId(toStage.getId())
                .transitionType(transitionType)
                .noteId(noteId)
                .actorUserId(actorUserId)
                .occurredAt(LocalDateTime.now())
                .build());
    }

    private UUID validateCreateRequest(CreateCandidateApplicationRequest request) {
        if (request == null || request.getEstablishmentId() == null) {
            throw new IllegalArgumentException("L'etablissement est obligatoire");
        }
        if (request.getProgramTrackLevelId() == null) {
            throw new IllegalArgumentException("Le couple filiere/niveau est obligatoire");
        }
        return request.getEstablishmentId();
    }

    private CandidateApplication resolveScoped(UUID applicationId, UUID establishmentId) {
        return candidateApplicationJpaRepository.findByIdAndEstablishmentId(applicationId, establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidature introuvable"));
    }

    private void assertEstablishmentAccess(User actor, UUID establishmentId) {
        establishmentAccessGuard.assertAccess(actor, establishmentId);
    }

    private boolean isOperatorOnly(User actor) {
        return actor.hasRole("OPERATOR") && !actor.hasRole("ADMIN") && !actor.hasRole("SUPER_ADMIN");
    }

    private Establishment establishment(UUID establishmentId) {
        return establishmentJpaRepository.findById(establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Etablissement introuvable"));
    }

    /**
     * Notification "Nouvelle candidature creee": Admin de l'etablissement + operateur assigne (le cas echeant),
     * cf. NOTIFICATIONS_QUEUE_DESIGN.md section 4.
     */
    private void notifyApplicationCreated(Establishment establishment, Candidate candidate, CandidateApplication application, UUID triggeredByUserId) {
        String title = "Nouvelle candidature";
        String description = "Une nouvelle candidature a ete creee pour " + candidate.getFirstName() + " " + candidate.getLastName() + ".";
        for (UUID recipientId : adminAndAssignedOperator(establishment, application)) {
            enqueueInAppNotification(establishment.getId(), recipientId, title, description, application.getId(), triggeredByUserId);
        }
    }

    /**
     * Notification "Transition manuelle d'etape": operateur(s) concernes, cf. NOTIFICATIONS_QUEUE_DESIGN.md section 4.
     */
    private void notifyApplicationTransitioned(Establishment establishment, CandidateApplication application, FunnelStage toStage, UUID triggeredByUserId) {
        String title = "Candidature mise a jour";
        String description = "La candidature est passee a l'etape \"" + toStage.getName() + "\".";
        for (UUID recipientId : assignedOperatorOrAdmin(establishment, application)) {
            enqueueInAppNotification(establishment.getId(), recipientId, title, description, application.getId(), triggeredByUserId);
        }
    }

    /**
     * Notification "Candidature -> FINAL_SUCCESS": Admin + operateur, cf. NOTIFICATIONS_QUEUE_DESIGN.md section 4.
     */
    private void notifyApplicationAccepted(Establishment establishment, CandidateApplication application, UUID triggeredByUserId) {
        String title = "Candidature acceptee";
        String description = "Une candidature a atteint une etape d'admission (FINAL_SUCCESS).";
        for (UUID recipientId : adminAndAssignedOperator(establishment, application)) {
            enqueueInAppNotification(establishment.getId(), recipientId, title, description, application.getId(), triggeredByUserId);
        }
        enqueueApplicationAcceptedEmail(establishment, application);
    }

    /**
     * Email de felicitations au candidat lorsque sa candidature atteint FINAL_SUCCESS,
     * cf. NOTIFICATIONS_QUEUE_DESIGN.md section 4 et 6 (MailTypeCategory.CANDIDATE_APPLICATION_ACCEPTED).
     */
    private void enqueueApplicationAcceptedEmail(Establishment establishment, CandidateApplication application) {
        Candidate candidate = candidateJpaRepository.findById(application.getCandidateId()).orElse(null);
        if (candidate == null || candidate.getEmail() == null || candidate.getEmail().isBlank()) {
            return;
        }

        ProgramTrackLevel programTrackLevel = programTrackLevelJpaRepository.findById(application.getProgramTrackLevelId()).orElse(null);
        if (programTrackLevel == null) {
            return;
        }
        ProgramTrack programTrack = programTrackJpaRepository.findById(programTrackLevel.getProgramTrackId()).orElse(null);
        AcademicLevel academicLevel = academicLevelJpaRepository.findById(programTrackLevel.getAcademicLevelId()).orElse(null);

        Map<String, Object> variables = new java.util.HashMap<>();
        variables.put("CANDIDATE_NAME", candidate.getFirstName() + " " + candidate.getLastName());
        variables.put("PROGRAM_TRACK_NAME", programTrack != null ? programTrack.getName() : "");
        variables.put("ACADEMIC_LEVEL_NAME", academicLevel != null ? academicLevel.getLabel() : "");
        variables.put("ESTABLISHMENT_NAME", establishment.getName());

        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("recipientEmail", candidate.getEmail());
        payload.put("mailTypeCategory", MailTypeCategory.CANDIDATE_APPLICATION_ACCEPTED.name());
        payload.put("variables", variables);
        notificationJobService.enqueue(establishment.getId(), NotificationJobType.EMAIL, payload);
    }

    /**
     * Notification "Cloture automatique (exclusivite)": operateur(s) des candidatures cloturees,
     * cf. NOTIFICATIONS_QUEUE_DESIGN.md section 4. Action systeme: pas de triggeredByUserId.
     */
    private void notifyApplicationAutoClosed(Establishment establishment, CandidateApplication application) {
        String title = "Candidature cloturee automatiquement";
        String description = "Cette candidature a ete cloturee automatiquement suite a l'admission du candidat dans une autre filiere/niveau.";
        for (UUID recipientId : assignedOperatorOrAdmin(establishment, application)) {
            enqueueInAppNotification(establishment.getId(), recipientId, title, description, application.getId(), null);
        }
    }

    /** Admin (createur de l'etablissement) + operateur assigne (le cas echeant), sans doublon. */
    private Set<UUID> adminAndAssignedOperator(Establishment establishment, CandidateApplication application) {
        Set<UUID> recipients = new HashSet<>();
        recipients.add(establishment.getCreatedByUserId());
        if (application.getAssignedOperatorId() != null) {
            recipients.add(application.getAssignedOperatorId());
        }
        return recipients;
    }

    /** Operateur assigne si present, sinon tous les operateurs de l'etablissement, sinon l'Admin. */
    private Set<UUID> assignedOperatorOrAdmin(Establishment establishment, CandidateApplication application) {
        if (application.getAssignedOperatorId() != null) {
            return Set.of(application.getAssignedOperatorId());
        }
        Set<UUID> operatorIds = userJpaRepository.findAllByParentAdminId(establishment.getCreatedByUserId(), Pageable.unpaged())
                .stream()
                .map(User::getId)
                .collect(java.util.stream.Collectors.toSet());
        if (operatorIds.isEmpty()) {
            return Set.of(establishment.getCreatedByUserId());
        }
        return operatorIds;
    }

    private void enqueueInAppNotification(UUID establishmentId, UUID recipientUserId, String title, String description,
                                           UUID applicationId, UUID triggeredByUserId) {
        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("userId", recipientUserId.toString());
        payload.put("title", title);
        payload.put("description", description);
        payload.put("notificationType", "INFO");
        payload.put("candidateApplicationId", applicationId.toString());
        payload.put("triggeredByUserId", triggeredByUserId == null ? null : triggeredByUserId.toString());
        notificationJobService.enqueue(establishmentId, NotificationJobType.IN_APP_NOTIFICATION, payload);
    }

    private User actor(UUID actorUserId) {
        return userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
    }

    private CandidateApplicationResponse toResponse(CandidateApplication item) {
        return CandidateApplicationResponse.builder()
                .id(item.getId())
                .establishmentId(item.getEstablishmentId())
                .candidateId(item.getCandidateId())
                .programTrackLevelId(item.getProgramTrackLevelId())
                .currentStageId(item.getCurrentStageId())
                .status(item.getStatus())
                .assignedOperatorId(item.getAssignedOperatorId())
                .closedAt(item.getClosedAt())
                .closedReason(item.getClosedReason())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .createdByUserId(item.getCreatedByUserId())
                .createdByLabel(item.getCreatedByLabel())
                .updatedByUserId(item.getUpdatedByUserId())
                .updatedByLabel(item.getUpdatedByLabel())
                .build();
    }

    private CandidateApplicationStageHistoryResponse toHistoryResponse(CandidateApplicationStageHistory item) {
        return CandidateApplicationStageHistoryResponse.builder()
                .id(item.getId())
                .candidateApplicationId(item.getCandidateApplicationId())
                .fromStageId(item.getFromStageId())
                .toStageId(item.getToStageId())
                .transitionType(item.getTransitionType())
                .noteId(item.getNoteId())
                .actorUserId(item.getActorUserId())
                .occurredAt(item.getOccurredAt())
                .build();
    }

    private Map<String, Object> toMap(CandidateApplication item) {
        return Map.of(
                "id", item.getId() == null ? "" : item.getId().toString(),
                "establishmentId", item.getEstablishmentId().toString(),
                "candidateId", item.getCandidateId().toString(),
                "programTrackLevelId", item.getProgramTrackLevelId().toString(),
                "currentStageId", item.getCurrentStageId().toString(),
                "status", item.getStatus().name()
        );
    }

    private void publishSuccess(UUID actorId, UUID establishmentId, ConfigurationAuditAction action, UUID entityId,
                                 String correlationId, Map<String, Object> payloadDiff) {
        auditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.CANDIDATE_APPLICATION)
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
                .entityType(ConfigurationAuditEntityType.CANDIDATE_APPLICATION)
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
