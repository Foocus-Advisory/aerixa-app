package com.aerixa.app.application.configuration.security;

import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import com.aerixa.app.domain.configuration.entity.Establishment;
import com.aerixa.app.infrastructure.auth.repository.OperatorEstablishmentAssignmentJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.EstablishmentJpaRepository;
import com.aerixa.app.infrastructure.error.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class EstablishmentAccessGuard {

    private final EstablishmentJpaRepository establishmentJpaRepository;
    private final OperatorEstablishmentAssignmentJpaRepository operatorEstablishmentAssignmentJpaRepository;

    public boolean canAccess(User actor, UUID establishmentId) {
        Establishment establishment = establishmentJpaRepository.findById(establishmentId).orElse(null);
        if (establishment == null) {
            return false;
        }
        return canAccess(actor, establishment);
    }

    private boolean canAccess(User actor, Establishment establishment) {
        if (actor.hasRole("SUPER_ADMIN")) {
            return true;
        }
        if (actor.getId().equals(establishment.getCreatedByUserId())) {
            return true;
        }
        if (actor.hasRole("OPERATOR")) {
            return operatorEstablishmentAssignmentJpaRepository
                    .existsByOperatorUserIdAndEstablishmentId(actor.getId(), establishment.getId());
        }
        return false;
    }

    public Establishment assertAccess(User actor, UUID establishmentId) {
        Establishment establishment = establishmentJpaRepository.findById(establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Etablissement introuvable"));
        if (!canAccess(actor, establishment)) {
            throw new PermissionDeniedException("establishments:scope");
        }
        return establishment;
    }
}
