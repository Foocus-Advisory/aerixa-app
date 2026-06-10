package com.aerixa.app.application.configuration.security;

import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import org.springframework.stereotype.Component;

@Component
public class ConfigurationPermissionGuard {

    public boolean hasPermission(User actor, String permission) {
        if (actor == null || permission == null || permission.isBlank()) {
            return false;
        }
        return actor.hasRole("SUPER_ADMIN") || actor.hasPermission(permission);
    }

    public void assertHasPermission(User actor, String permission) {
        if (!hasPermission(actor, permission)) {
            throw new PermissionDeniedException(permission == null ? "configuration:unknown" : permission);
        }
    }
}
