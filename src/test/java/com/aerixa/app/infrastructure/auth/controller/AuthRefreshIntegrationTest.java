package com.aerixa.app.infrastructure.auth.controller;

import com.aerixa.app.domain.auth.entity.AuditLog;
import com.aerixa.app.domain.auth.entity.Role;
import com.aerixa.app.domain.auth.entity.Session;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.infrastructure.auth.repository.AuditLogJpaRepository;
import com.aerixa.app.infrastructure.auth.repository.RoleJpaRepository;
import com.aerixa.app.infrastructure.auth.repository.SessionJpaRepository;
import com.aerixa.app.infrastructure.auth.repository.UserJpaRepository;
import com.aerixa.app.infrastructure.security.TokenHashUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AuthRefreshIntegrationTest {

    private static final String PASSWORD = "Password123A";
    private static final String JWT_SECRET = "test-secret-key-for-refresh-integration-123456";

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("aerixa_test")
            .withUsername("aerixa")
            .withPassword("aerixa");

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("security.jwt.secret", () -> JWT_SECRET);
        registry.add("security.jwt.refresh-token-expiry", () -> 3000L);
        registry.add("app.notifications.mail.enabled", () -> false);
        registry.add("app.notifications.websocket.enabled", () -> false);
        registry.add("spring.mail.host", () -> "localhost");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserJpaRepository userJpaRepository;

    @Autowired
    private RoleJpaRepository roleJpaRepository;

    @Autowired
    private SessionJpaRepository sessionJpaRepository;

    @Autowired
    private AuditLogJpaRepository auditLogJpaRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final List<UUID> createdUserIds = new ArrayList<>();

    @AfterEach
    void tearDown() {
        JpaRepository<User, UUID> userStore = userJpaRepository;
        JpaRepository<Session, UUID> sessionStore = sessionJpaRepository;

        for (UUID userId : createdUserIds) {
            auditLogJpaRepository.findAll().stream()
                    .filter(log -> log.getUser() != null && userId.equals(log.getUser().getId()))
                    .forEach(auditLogJpaRepository::delete);

            sessionStore.findAll().stream()
                    .filter(session -> session.getUser() != null && userId.equals(session.getUser().getId()))
                .forEach(sessionStore::delete);

            userStore.findById(userId).ifPresent(userStore::delete);
        }
        createdUserIds.clear();
    }

    @Test
    void refreshShouldRotateTokenAndRejectOldTokenWithAuditTrail() throws Exception {
        User user = createActiveUser();

        AuthTokens initialTokens = login(user, "login-rotate");
        Session sessionBeforeRefresh = findSessionByUserId(user.getId());
        String previousAccessHash = sessionBeforeRefresh.getAccessTokenHash();
        String previousRefreshHash = sessionBeforeRefresh.getRefreshTokenHash();

        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Request-ID", "refresh-rotate-success")
                        .content(refreshPayload(initialTokens.refreshToken())))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode refreshedBody = readJson(refreshResult);
        String rotatedAccessToken = refreshedBody.path("accessToken").asText();
        String rotatedRefreshToken = refreshedBody.path("refreshToken").asText();

        assertNotEquals(initialTokens.accessToken(), rotatedAccessToken);
        assertNotEquals(initialTokens.refreshToken(), rotatedRefreshToken);

        Session sessionAfterRefresh = findSessionByUserId(user.getId());
        assertEquals(TokenHashUtils.sha256(rotatedAccessToken), sessionAfterRefresh.getAccessTokenHash());
        assertEquals(TokenHashUtils.sha256(rotatedRefreshToken), sessionAfterRefresh.getRefreshTokenHash());
        assertNotEquals(previousAccessHash, sessionAfterRefresh.getAccessTokenHash());
        assertNotEquals(previousRefreshHash, sessionAfterRefresh.getRefreshTokenHash());
        assertEquals(null, sessionAfterRefresh.getRevokedAt());

        MvcResult reuseResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Request-ID", "refresh-rotate-reuse")
                        .content(refreshPayload(initialTokens.refreshToken())))
                .andExpect(status().isUnauthorized())
                .andReturn();

        JsonNode reuseBody = readJson(reuseResult);
        assertEquals("SESSION_EXPIRED", reuseBody.path("errorCode").asText());
        assertEquals(401, reuseBody.path("statusCode").asInt());

        assertHasAuditEntry(user.getId(), "refresh-rotate-success", 200, AuditLog.AuditAction.REFRESH);
        assertHasAuditEntry(user.getId(), "refresh-rotate-reuse", 401, AuditLog.AuditAction.REFRESH);
    }

    @Test
    void refreshShouldAllowOnlyOneConcurrentRotation() throws Exception {
        User user = createActiveUser();
        AuthTokens initialTokens = login(user, "login-concurrent");

        CountDownLatch startGate = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Future<RefreshAttempt> firstAttempt = executor.submit(refreshTask(initialTokens.refreshToken(), startGate, "refresh-concurrent-a"));
            Future<RefreshAttempt> secondAttempt = executor.submit(refreshTask(initialTokens.refreshToken(), startGate, "refresh-concurrent-b"));

            startGate.countDown();

            RefreshAttempt first = firstAttempt.get(20, TimeUnit.SECONDS);
            RefreshAttempt second = secondAttempt.get(20, TimeUnit.SECONDS);

            long successCount = List.of(first, second).stream().filter(attempt -> attempt.statusCode() == 200).count();
            long unauthorizedCount = List.of(first, second).stream().filter(attempt -> attempt.statusCode() == 401).count();

            assertEquals(1, successCount);
            assertEquals(1, unauthorizedCount);

            RefreshAttempt successfulAttempt = first.statusCode() == 200 ? first : second;
            RefreshAttempt failedAttempt = first.statusCode() == 401 ? first : second;

            assertEquals("SESSION_EXPIRED", failedAttempt.errorCode());

            Session sessionAfterRefresh = findSessionByUserId(user.getId());
            assertEquals(TokenHashUtils.sha256(successfulAttempt.accessToken()), sessionAfterRefresh.getAccessTokenHash());
            assertEquals(TokenHashUtils.sha256(successfulAttempt.refreshToken()), sessionAfterRefresh.getRefreshTokenHash());

            assertHasAuditEntry(user.getId(), successfulAttempt.requestId(), 200, AuditLog.AuditAction.REFRESH);
            assertHasAuditEntry(user.getId(), failedAttempt.requestId(), 401, AuditLog.AuditAction.REFRESH);
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void refreshShouldRejectRevokedSession() throws Exception {
        User user = createActiveUser();
        AuthTokens tokens = login(user, "login-revoked");
        JpaRepository<Session, UUID> sessionStore = sessionJpaRepository;

        Session session = findSessionByUserId(user.getId());
        session.setRevokedAt(LocalDateTime.now());
        Session updatedSession = sessionStore.save(session);

        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Request-ID", "refresh-revoked")
                        .content(refreshPayload(tokens.refreshToken())))
                .andExpect(status().isUnauthorized())
                .andReturn();

        JsonNode body = readJson(refreshResult);
        assertEquals("SESSION_EXPIRED", body.path("errorCode").asText());
        assertEquals(401, body.path("statusCode").asInt());

        Session reloadedSession = findSessionByUserId(user.getId());
        assertNotNull(reloadedSession.getRevokedAt());
        assertEquals(updatedSession.getId(), reloadedSession.getId());
        assertEquals(TokenHashUtils.sha256(tokens.refreshToken()), reloadedSession.getRefreshTokenHash());

        assertHasAuditEntry(user.getId(), "refresh-revoked", 401, AuditLog.AuditAction.REFRESH);
    }

    @Test
    void refreshShouldRejectExpiredRefreshTokenWithoutMutatingSession() throws Exception {
        User user = createActiveUser();
        AuthTokens tokens = login(user, "login-expired");

        Session sessionBeforeExpiry = findSessionByUserId(user.getId());
        String originalAccessHash = sessionBeforeExpiry.getAccessTokenHash();
        String originalRefreshHash = sessionBeforeExpiry.getRefreshTokenHash();

        Thread.sleep(Duration.ofMillis(3300));

        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Request-ID", "refresh-expired")
                        .content(refreshPayload(tokens.refreshToken())))
                .andExpect(status().isUnauthorized())
                .andReturn();

        JsonNode body = readJson(refreshResult);
        assertEquals("INVALID_TOKEN", body.path("errorCode").asText());
        assertEquals(401, body.path("statusCode").asInt());

        Session sessionAfterExpiry = findSessionByUserId(user.getId());
        assertEquals(originalAccessHash, sessionAfterExpiry.getAccessTokenHash());
        assertEquals(originalRefreshHash, sessionAfterExpiry.getRefreshTokenHash());
        assertFalse(sessionAfterExpiry.isExpired());

        assertHasAuditEntry(user.getId(), "refresh-expired", 401, AuditLog.AuditAction.REFRESH);
    }

    private Callable<RefreshAttempt> refreshTask(String refreshToken, CountDownLatch startGate, String requestId) {
        return () -> {
            startGate.await(10, TimeUnit.SECONDS);

            MvcResult result = mockMvc.perform(post("/api/v1/auth/refresh")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("X-Request-ID", requestId)
                            .content(refreshPayload(refreshToken)))
                    .andReturn();

            JsonNode body = readJson(result);
            return new RefreshAttempt(
                    requestId,
                    result.getResponse().getStatus(),
                    body.path("errorCode").asText(null),
                    body.path("accessToken").asText(null),
                    body.path("refreshToken").asText(null)
            );
        };
    }

    private AuthTokens login(User user, String requestId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("User-Agent", "JUnit")
                        .header("X-Device-Name", requestId)
                        .header("X-Device-Type", "DESKTOP")
                        .header("X-Request-ID", requestId)
                        .content(objectMapper.writeValueAsString(new LoginPayload(user.getEmail(), PASSWORD))))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode body = readJson(result);
        return new AuthTokens(body.path("accessToken").asText(), body.path("refreshToken").asText());
    }

    private User createActiveUser() {
        JpaRepository<User, UUID> userStore = userJpaRepository;

        Role adminRole = roleJpaRepository.findByName("ADMIN")
                .orElseThrow(() -> new IllegalStateException("ADMIN role not found"));

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = User.builder()
                .email("refresh-" + suffix + "@aerixa.test")
                .username("refresh-" + suffix)
                .firstName("Refresh")
                .lastName("Tester")
                .passwordHash(passwordEncoder.encode(PASSWORD))
                .status(User.UserStatus.ACTIVE)
                .emailVerified(true)
                .mustChangePassword(false)
                .mfaEnabled(false)
                .roles(java.util.Set.of(adminRole))
                .build();

        User savedUser = userStore.save(user);
        createdUserIds.add(savedUser.getId());
        return savedUser;
    }

    private Session findSessionByUserId(UUID userId) {
        return sessionJpaRepository.findAll().stream()
                .filter(session -> session.getUser() != null && userId.equals(session.getUser().getId()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Session not found for user " + userId));
    }

    private void assertHasAuditEntry(UUID userId, String requestId, int expectedStatus, AuditLog.AuditAction expectedAction) {
        boolean found = auditLogJpaRepository.findAll().stream()
                .filter(log -> log.getUser() != null && userId.equals(log.getUser().getId()))
                .filter(log -> log.getAction() == expectedAction)
                .filter(log -> Integer.valueOf(expectedStatus).equals(log.getStatusCode()))
                .anyMatch(log -> log.getDetails() != null && log.getDetails().contains(requestId));

        assertTrue(found, "Missing audit entry for requestId=" + requestId + " and status=" + expectedStatus);
    }

    private String refreshPayload(String refreshToken) throws Exception {
        return objectMapper.writeValueAsString(new RefreshPayload(refreshToken));
    }

    private JsonNode readJson(MvcResult result) throws Exception {
        String content = result.getResponse().getContentAsString();
        return objectMapper.readTree(content);
    }

    private record LoginPayload(String email, String password) {
    }

    private record RefreshPayload(String refreshToken) {
    }

    private record AuthTokens(String accessToken, String refreshToken) {
    }

    private record RefreshAttempt(String requestId, int statusCode, String errorCode, String accessToken, String refreshToken) {
    }
}