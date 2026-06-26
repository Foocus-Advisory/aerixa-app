package com.aerixa.app.application.auth.service;

import com.aerixa.app.application.auth.dto.AssignedOperatorResponse;
import com.aerixa.app.application.auth.dto.OperatorEstablishmentAssignmentResponse;
import com.aerixa.app.domain.auth.entity.OperatorEstablishmentAssignment;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.infrastructure.auth.repository.OperatorEstablishmentAssignmentJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.EstablishmentJpaRepository;
import com.aerixa.app.infrastructure.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OperatorEstablishmentAssignmentService {

    private final UserRepository userRepository;
    private final EstablishmentJpaRepository establishmentJpaRepository;
    private final OperatorEstablishmentAssignmentJpaRepository assignmentJpaRepository;

    @Transactional(readOnly = true)
    public List<OperatorEstablishmentAssignmentResponse> listAssignedEstablishments(UUID actorUserId, UUID operatorUserId) {
        User actor = actor(actorUserId);
        User operator = operator(operatorUserId);
        assertActorOwnsOperator(actor, operator);

        return assignmentJpaRepository.findAllByOperatorUserId(operatorUserId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AssignedOperatorResponse> listAssignedOperators(UUID actorUserId, UUID establishmentId) {
        User actor = actor(actorUserId);
        Establishment establishment = establishmentJpaRepository.findById(establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Etablissement introuvable"));
        assertActorOwnsEstablishment(actor, establishment);

        return assignmentJpaRepository.findAllByEstablishmentId(establishmentId).stream()
                .map(assignment -> userRepository.findById(assignment.getOperatorUserId()).orElse(null))
                .filter(java.util.Objects::nonNull)
                .map(operator -> AssignedOperatorResponse.builder()
                        .operatorUserId(operator.getId())
                        .operatorEmail(operator.getEmail())
                        .operatorDisplayName(buildDisplayName(operator))
                        .build())
                .toList();
    }

    private String buildDisplayName(User user) {
        String firstName = user.getFirstName() != null ? user.getFirstName() : "";
        String lastName = user.getLastName() != null ? user.getLastName() : "";
        String fullName = (firstName + " " + lastName).trim();
        return fullName.isBlank() ? user.getEmail() : fullName;
    }

    @Transactional
    public OperatorEstablishmentAssignmentResponse assignEstablishment(UUID actorUserId, UUID operatorUserId, UUID establishmentId) {
        User actor = actor(actorUserId);
        User operator = operator(operatorUserId);
        assertActorOwnsOperator(actor, operator);

        Establishment establishment = establishmentJpaRepository.findById(establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Etablissement introuvable"));
        assertActorOwnsEstablishment(actor, establishment);

        OperatorEstablishmentAssignment assignment = assignmentJpaRepository
                .findByOperatorUserIdAndEstablishmentId(operatorUserId, establishmentId)
                .orElseGet(() -> assignmentJpaRepository.save(OperatorEstablishmentAssignment.builder()
                        .operatorUserId(operatorUserId)
                        .establishmentId(establishmentId)
                        .assignedByUserId(actor.getId())
                        .build()));

        return toResponse(assignment);
    }

    @Transactional
    public void unassignEstablishment(UUID actorUserId, UUID operatorUserId, UUID establishmentId) {
        User actor = actor(actorUserId);
        User operator = operator(operatorUserId);
        assertActorOwnsOperator(actor, operator);

        Establishment establishment = establishmentJpaRepository.findById(establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Etablissement introuvable"));
        assertActorOwnsEstablishment(actor, establishment);

        assignmentJpaRepository.findByOperatorUserIdAndEstablishmentId(operatorUserId, establishmentId)
                .ifPresent(assignmentJpaRepository::delete);
    }

    private void assertActorOwnsOperator(User actor, User operator) {
        if (actor.hasRole("SUPER_ADMIN")) {
            return;
        }
        if (operator.getParentAdmin() == null || !actor.getId().equals(operator.getParentAdmin().getId())) {
            throw new PermissionDeniedException("operator_establishment_assignments:manage");
        }
    }

    private void assertActorOwnsEstablishment(User actor, Establishment establishment) {
        if (actor.hasRole("SUPER_ADMIN")) {
            return;
        }
        if (!actor.getId().equals(establishment.getCreatedByUserId())) {
            throw new PermissionDeniedException("operator_establishment_assignments:manage");
        }
    }

    private User actor(UUID actorUserId) {
        return userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
    }

    private User operator(UUID operatorUserId) {
        User operator = userRepository.findById(operatorUserId)
                .orElseThrow(() -> new UserNotFoundException(operatorUserId));
        if (!operator.hasRole("OPERATOR")) {
            throw new IllegalArgumentException("L'affectation d'etablissement est reservee aux utilisateurs OPERATOR");
        }
        return operator;
    }

    private OperatorEstablishmentAssignmentResponse toResponse(OperatorEstablishmentAssignment assignment) {
        Establishment establishment = establishmentJpaRepository.findById(assignment.getEstablishmentId()).orElse(null);
        return OperatorEstablishmentAssignmentResponse.builder()
                .id(assignment.getId())
                .operatorUserId(assignment.getOperatorUserId())
                .establishmentId(assignment.getEstablishmentId())
                .establishmentName(establishment != null ? establishment.getName() : null)
                .establishmentCode(establishment != null ? establishment.getCode() : null)
                .assignedByUserId(assignment.getAssignedByUserId())
                .assignedAt(assignment.getCreatedAt())
                .build();
    }
}
