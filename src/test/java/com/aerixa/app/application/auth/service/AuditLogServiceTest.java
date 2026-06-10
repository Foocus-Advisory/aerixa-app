package com.aerixa.app.application.auth.service;

import com.aerixa.app.application.auth.dto.AuditDashboardSummaryResponse;
import com.aerixa.app.domain.auth.entity.AuditLog;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.infrastructure.auth.repository.AuditLogJpaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock
    private AuditLogJpaRepository auditLogJpaRepository;

    @InjectMocks
    private AuditLogService auditLogService;

    @Test
    void getDashboardSummaryShouldAggregateKpisFromRecentAuditLogs() {
        LocalDateTime now = LocalDateTime.now();
        User actorOne = User.builder().email("ops1@aerixa.com").build();
        actorOne.setId(UUID.randomUUID());
        User actorTwo = User.builder().email("ops2@aerixa.com").build();
        actorTwo.setId(UUID.randomUUID());

        List<AuditLog> logs = List.of(
                buildLog(now.minusHours(1), AuditLog.AuditAction.REFRESH, AuditLog.AuditOutcome.FAILURE, "SESSION_EXPIRED", "10.0.0.1", actorOne),
                buildLog(now.minusDays(2), AuditLog.AuditAction.REFRESH, AuditLog.AuditOutcome.FAILURE, "INVALID_TOKEN", "10.0.0.1", actorOne),
                buildLog(now.minusHours(3), AuditLog.AuditAction.LOGIN, AuditLog.AuditOutcome.FAILURE, "BAD_CREDENTIALS", "10.0.0.2", actorTwo),
                buildLog(now.minusHours(6), AuditLog.AuditAction.REVOKED, AuditLog.AuditOutcome.SUCCESS, null, "10.0.0.3", actorTwo)
        );

        when(auditLogJpaRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(logs);

        AuditDashboardSummaryResponse summary = auditLogService.getDashboardSummary();

        assertEquals(1, summary.getRefreshFailures().getLast24h());
        assertEquals(2, summary.getRefreshFailures().getLast7d());
        assertEquals(2, summary.getRefreshFailures().getLast30d());
        assertEquals(1, summary.getReuseAttempts().getLast24h());
        assertEquals(2, summary.getReuseAttempts().getLast7d());
        assertEquals(1, summary.getRevokeSessions().getLast24h());
        assertEquals(1, summary.getLoginFailures().getLast24h());
        assertEquals(2, summary.getAdminActionsByActor().size());

        verify(auditLogJpaRepository).findAll(any(Specification.class), any(Sort.class));
    }

    private AuditLog buildLog(
            LocalDateTime timestamp,
            AuditLog.AuditAction action,
            AuditLog.AuditOutcome outcome,
            String reasonCode,
            String ipAddress,
            User user
    ) {
        return AuditLog.builder()
                .timestamp(timestamp)
                .action(action)
                .outcome(outcome)
                .reasonCode(reasonCode)
                .ipAddress(ipAddress)
                .user(user)
                .statusCode(outcome == AuditLog.AuditOutcome.FAILURE ? 401 : 200)
                .build();
    }
}