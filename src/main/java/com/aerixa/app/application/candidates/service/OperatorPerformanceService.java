package com.aerixa.app.application.candidates.service;

import com.aerixa.app.application.candidates.dto.OperatorPerformanceResponse;
import com.aerixa.app.application.candidates.security.CandidatesPermissions;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.configuration.security.EstablishmentAccessGuard;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.candidates.entity.Candidate;
import com.aerixa.app.domain.candidates.entity.CandidateApplication;
import com.aerixa.app.domain.candidates.entity.CandidateApplicationStatus;
import com.aerixa.app.domain.candidates.entity.CandidateStatus;
import com.aerixa.app.infrastructure.auth.repository.OperatorEstablishmentAssignmentJpaRepository;
import com.aerixa.app.infrastructure.candidates.repository.CandidateApplicationJpaRepository;
import com.aerixa.app.infrastructure.candidates.repository.CandidateJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OperatorPerformanceService {

    private final CandidateJpaRepository candidateJpaRepository;
    private final CandidateApplicationJpaRepository candidateApplicationJpaRepository;
    private final UserRepository userRepository;
    private final OperatorEstablishmentAssignmentJpaRepository operatorEstablishmentAssignmentJpaRepository;
    private final ConfigurationPermissionGuard permissionGuard;
    private final EstablishmentAccessGuard establishmentAccessGuard;

    @Transactional(readOnly = true)
    public List<OperatorPerformanceResponse> listForEstablishment(UUID actorUserId, UUID establishmentId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidatesPermissions.CANDIDATES_READ_OPERATOR_PERFORMANCE);
        establishmentAccessGuard.assertAccess(actor, establishmentId);

        Set<UUID> operatorIds = operatorEstablishmentAssignmentJpaRepository.findAllByEstablishmentId(establishmentId)
                .stream()
                .map(assignment -> assignment.getOperatorUserId())
                .collect(java.util.stream.Collectors.toCollection(java.util.LinkedHashSet::new));

        if (operatorIds.isEmpty()) {
            return List.of();
        }

        List<Candidate> candidates = candidateJpaRepository.findAllByEstablishmentId(establishmentId, Sort.unsorted());
        List<CandidateApplication> applications = candidateApplicationJpaRepository.findAllByEstablishmentId(establishmentId, Sort.unsorted());

        Map<UUID, User> operatorsById = new LinkedHashMap<>();
        for (UUID operatorId : operatorIds) {
            userRepository.findById(operatorId).ifPresent(user -> operatorsById.put(operatorId, user));
        }

        return operatorsById.values().stream()
                .map(operator -> buildPerformance(operator, candidates, applications))
                .sorted(Comparator.comparing(OperatorPerformanceResponse::getApplicationsAcceptedCount).reversed())
                .toList();
    }

    private OperatorPerformanceResponse buildPerformance(User operator, List<Candidate> candidates, List<CandidateApplication> applications) {
        UUID operatorId = operator.getId();

        List<Candidate> ownedCandidates = candidates.stream()
                .filter(c -> operatorId.equals(c.getAssignedOperatorId()) || operatorId.equals(c.getCreatedByUserId()))
                .toList();

        long activeCandidatesCount = ownedCandidates.stream()
                .filter(c -> c.getStatus() == CandidateStatus.ACTIVE)
                .count();

        Set<UUID> ownedCandidateIds = ownedCandidates.stream().map(Candidate::getId).collect(java.util.stream.Collectors.toSet());

        List<CandidateApplication> ownedApplications = applications.stream()
                .filter(a -> operatorId.equals(a.getAssignedOperatorId()) || ownedCandidateIds.contains(a.getCandidateId()))
                .toList();

        long inProgress = ownedApplications.stream().filter(a -> a.getStatus() == CandidateApplicationStatus.IN_PROGRESS).count();
        long accepted = ownedApplications.stream().filter(a -> a.getStatus() == CandidateApplicationStatus.ACCEPTED).count();
        long rejected = ownedApplications.stream().filter(a -> a.getStatus() == CandidateApplicationStatus.REJECTED).count();

        long closed = accepted + rejected;
        Double conversionRate = closed == 0 ? null : (double) accepted / closed;

        return OperatorPerformanceResponse.builder()
                .operatorUserId(operatorId)
                .operatorEmail(operator.getEmail())
                .operatorDisplayName(buildDisplayName(operator))
                .candidatesCount(ownedCandidates.size())
                .activeCandidatesCount(activeCandidatesCount)
                .applicationsCount(ownedApplications.size())
                .applicationsInProgressCount(inProgress)
                .applicationsAcceptedCount(accepted)
                .applicationsRejectedCount(rejected)
                .conversionRate(conversionRate)
                .build();
    }

    private String buildDisplayName(User user) {
        String firstName = user.getFirstName() != null ? user.getFirstName() : "";
        String lastName = user.getLastName() != null ? user.getLastName() : "";
        String fullName = (firstName + " " + lastName).trim();
        return fullName.isBlank() ? user.getEmail() : fullName;
    }

    private User actor(UUID actorUserId) {
        return userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
    }
}
