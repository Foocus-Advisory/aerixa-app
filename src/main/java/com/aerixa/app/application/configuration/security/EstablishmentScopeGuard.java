package com.aerixa.app.application.configuration.security;

import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class EstablishmentScopeGuard {

    public boolean canAccess(User actor, UUID actorEstablishmentId, UUID targetEstablishmentId) {
        if (actor == null) {
            return false;
        }
        if (actor.hasRole("SUPER_ADMIN")) {
            return true;
        }
        if (actorEstablishmentId == null || targetEstablishmentId == null) {
            return false;
        }
        return actorEstablishmentId.equals(targetEstablishmentId);
    }

    public void assertScopedAccess(User actor, UUID actorEstablishmentId, UUID targetEstablishmentId) {
        if (!canAccess(actor, actorEstablishmentId, targetEstablishmentId)) {
            throw new PermissionDeniedException("establishments:scope");
        }
    }
}
