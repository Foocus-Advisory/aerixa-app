package com.aerixa.app.application.configuration.security;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ConfigurationPermissionsTest {

    @Test
    void allShouldContainMandatoryPermissionsAndBeUnique() {
        Set<String> all = ConfigurationPermissions.all();

        assertTrue(all.contains("establishments:create"));
        assertTrue(all.contains("entry_diplomas:update"));
        assertTrue(all.contains("academic_levels:read"));
        assertTrue(all.contains("program_tracks:list"));
        assertTrue(all.contains("funnel_stages:deactivate"));
        assertTrue(all.contains("pipeline_view_preference:update"));

        assertEquals(all.size(), new HashSet<>(all).size(), "Permissions must be unique");
    }

    @Test
    void allShouldBeImmutable() {
        Set<String> all = ConfigurationPermissions.all();
        assertThrows(UnsupportedOperationException.class, () -> all.add("x:y"));
    }

    @Test
    void isKnownShouldValidatePermission() {
        assertTrue(ConfigurationPermissions.isKnown("establishments:list"));
    }
}
