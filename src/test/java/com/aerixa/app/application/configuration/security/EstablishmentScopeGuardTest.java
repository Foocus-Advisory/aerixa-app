package com.aerixa.app.application.configuration.security;

import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EstablishmentScopeGuardTest {

    private final EstablishmentScopeGuard guard = new EstablishmentScopeGuard();

    @Test
    void superAdminCanAccessAnyScope() {
        User superAdmin = User.builder()
                .roles(Set.of(Role.builder().name("SUPER_ADMIN").build()))
                .build();

        assertTrue(guard.canAccess(superAdmin, null, null));
        assertDoesNotThrow(() -> guard.assertScopedAccess(superAdmin, null, UUID.randomUUID()));
    }

    @Test
    void adminCanAccessOnlyOwnScope() {
        User admin = User.builder()
                .roles(Set.of(Role.builder().name("ADMIN").build()))
                .build();

        UUID establishmentId = UUID.randomUUID();
        assertTrue(guard.canAccess(admin, establishmentId, establishmentId));
        assertDoesNotThrow(() -> guard.assertScopedAccess(admin, establishmentId, establishmentId));
    }

    @Test
    void adminAccessOutsideScopeShouldBeDenied() {
        User admin = User.builder()
                .roles(Set.of(Role.builder().name("ADMIN").build()))
                .build();

        UUID actorEstablishmentId = UUID.randomUUID();
        UUID targetEstablishmentId = UUID.randomUUID();

        assertFalse(guard.canAccess(admin, actorEstablishmentId, targetEstablishmentId));
        assertThrows(PermissionDeniedException.class,
                () -> guard.assertScopedAccess(admin, actorEstablishmentId, targetEstablishmentId));
    }
}
