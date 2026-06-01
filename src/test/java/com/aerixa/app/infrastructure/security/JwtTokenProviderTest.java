package com.aerixa.app.infrastructure.security;

import com.aerixa.app.domain.auth.entity.User;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    @Test
    void shouldGenerateAndValidateAccessToken() {
        JwtTokenProvider provider = new JwtTokenProvider(
                "test-secret-key-test-secret-key-123456",
                3_600_000,
            86_400_000,
            86_400_000
        );

        User user = User.builder().id(UUID.randomUUID()).build();
        String token = provider.generateAccessToken(user);

        assertNotNull(token);
        assertTrue(provider.validateToken(token));
        assertEquals(user.getId(), provider.extractUserIdFromToken(token));
        assertEquals("access", provider.getTokenType(token));
    }

    @Test
    void shouldReturnFalseForInvalidToken() {
        JwtTokenProvider provider = new JwtTokenProvider(
                "test-secret-key-test-secret-key-123456",
                3_600_000,
            86_400_000,
            86_400_000
        );

        assertFalse(provider.validateToken("not-a-jwt"));
        assertNull(provider.getTokenType("not-a-jwt"));
    }
}
