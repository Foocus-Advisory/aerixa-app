package com.aerixa.app.application.configuration.security;

import com.aerixa.app.domain.auth.entity.Permission;
import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ConfigurationPermissionGuardTest {

    private final ConfigurationPermissionGuard guard = new ConfigurationPermissionGuard();

    @Test
    void superAdminShouldAlwaysPass() {
        User actor = User.builder()
                .roles(Set.of(Role.builder().name("SUPER_ADMIN").build()))
                .build();

        assertTrue(guard.hasPermission(actor, "establishments:create"));
        assertDoesNotThrow(() -> guard.assertHasPermission(actor, "establishments:create"));
    }

    @Test
    void actorWithPermissionShouldPass() {
        Permission permission = Permission.builder().name("program_tracks:update").build();
        Role role = Role.builder().name("ADMIN").permissions(Set.of(permission)).build();
        User actor = User.builder().roles(Set.of(role)).build();

        assertTrue(guard.hasPermission(actor, "program_tracks:update"));
        assertDoesNotThrow(() -> guard.assertHasPermission(actor, "program_tracks:update"));
    }

    @Test
    void actorWithoutPermissionShouldBeDenied() {
        User actor = User.builder()
                .roles(Set.of(Role.builder().name("ADMIN").permissions(Set.of()).build()))
                .build();

        assertFalse(guard.hasPermission(actor, "funnel_stages:delete"));
        assertThrows(PermissionDeniedException.class,
                () -> guard.assertHasPermission(actor, "funnel_stages:delete"));
    }
}
