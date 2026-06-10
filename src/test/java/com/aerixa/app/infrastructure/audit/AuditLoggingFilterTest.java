package com.aerixa.app.infrastructure.audit;

import com.aerixa.app.domain.auth.entity.AuditLog;
import com.aerixa.app.domain.auth.entity.Session;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.repository.AuditLogRepository;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.infrastructure.auth.repository.SessionJpaRepository;
import com.aerixa.app.infrastructure.security.JwtTokenProvider;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditLoggingFilterTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SessionJpaRepository sessionJpaRepository;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private tools.jackson.databind.ObjectMapper objectMapper;

    @InjectMocks
    private AuditLoggingFilter auditLoggingFilter;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void doFilterShouldPersistCorrelationAndReasonCodeFromRequestAttributes() throws Exception {
        UUID userId = UUID.randomUUID();
        String token = "access-token";
        String correlationId = "corr-123";

        User user = User.builder().email("audit@aerixa.com").build();
        user.setId(userId);

        Session session = Session.builder()
                .user(user)
                .accessTokenHash("hash")
                .refreshTokenHash("refresh-hash")
                .ipAddress("127.0.0.1")
                .lastActivityAt(java.time.LocalDateTime.now())
                .expiresAt(java.time.LocalDateTime.now().plusHours(1))
                .build();
        session.setId(UUID.randomUUID());

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(jwtTokenProvider.validateToken(token)).thenReturn(true);
        when(sessionJpaRepository.findByAccessTokenHash(any())).thenReturn(Optional.of(session));
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        userId.toString(),
                        "n/a",
                        List.of(new SimpleGrantedAuthority("audit_logs:read"))
                )
        );

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/auth/refresh");
        request.addHeader("X-Correlation-ID", correlationId);
        request.addHeader("Authorization", "Bearer " + token);
        request.setRemoteAddr("127.0.0.1");
        request.setAttribute("audit.outcome", "FAILURE");
        request.setAttribute("audit.reasonCode", "SESSION_EXPIRED");

        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = (servletRequest, servletResponse) -> { };

        auditLoggingFilter.doFilter(request, response, filterChain);

        assertEquals(correlationId, response.getHeader("X-Correlation-ID"));

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        AuditLog savedAuditLog = captor.getValue();

        assertEquals(correlationId, savedAuditLog.getCorrelationId());
        assertEquals("SESSION_EXPIRED", savedAuditLog.getReasonCode());
        assertEquals(AuditLog.AuditOutcome.FAILURE, savedAuditLog.getOutcome());
        assertEquals("[audit_logs:read]", savedAuditLog.getActorRoles());
        assertNotNull(savedAuditLog.getSession());
        assertEquals(session.getId(), savedAuditLog.getSession().getId());
    }
}