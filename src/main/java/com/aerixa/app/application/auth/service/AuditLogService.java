package com.aerixa.app.application.auth.service;

import com.aerixa.app.application.auth.dto.AuditLogResponse;
import com.aerixa.app.application.auth.dto.AuditDashboardSummaryResponse;
import com.aerixa.app.application.auth.dto.PagedResponse;
import com.aerixa.app.domain.auth.entity.AuditLog;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.infrastructure.auth.repository.AuditLogJpaRepository;
import com.aerixa.app.infrastructure.configuration.repository.EstablishmentJpaRepository;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int TOP_LIMIT = 5;

    private final AuditLogJpaRepository auditLogJpaRepository;
    private final UserRepository userRepository;
    private final EstablishmentJpaRepository establishmentJpaRepository;

    @Transactional(readOnly = true)
    public PagedResponse<AuditLogResponse> listAuditLogs(
            int page,
            int size,
            String search,
            String action,
            String status
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);

        Page<AuditLog> auditPage = auditLogJpaRepository.findAll(
                buildSpecification(search, action, status),
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "timestamp"))
        );

        List<AuditLogResponse> content = auditPage.getContent().stream()
                .map(this::toResponse)
                .toList();

        return PagedResponse.<AuditLogResponse>builder()
                .content(content)
                .page(safePage)
                .size(safeSize)
                .totalElements(auditPage.getTotalElements())
                .totalPages(auditPage.getTotalPages())
                .build();
    }

    @Transactional(readOnly = true)
    public AuditDashboardSummaryResponse getDashboardSummary() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime last24h = now.minusHours(24);
        LocalDateTime last7d = now.minusDays(7);
        LocalDateTime last30d = now.minusDays(30);

        List<AuditLog> recentLogs = auditLogJpaRepository.findAll((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("timestamp"), last30d), Sort.by(Sort.Direction.DESC, "timestamp"));

        return AuditDashboardSummaryResponse.builder()
                .refreshFailures(buildMetricWindow(recentLogs, AuditLog.AuditAction.REFRESH, AuditLog.AuditOutcome.FAILURE, last24h, last7d, last30d))
                .reuseAttempts(buildReuseMetricWindow(recentLogs, last24h, last7d, last30d))
                .revokeSessions(buildMetricWindow(recentLogs, AuditLog.AuditAction.REVOKED, AuditLog.AuditOutcome.SUCCESS, last24h, last7d, last30d))
                .loginFailures(buildMetricWindow(recentLogs, AuditLog.AuditAction.LOGIN, AuditLog.AuditOutcome.FAILURE, last24h, last7d, last30d))
                .loginFailuresBySourceIp(topCountsBySourceIp(recentLogs, last24h))
                .adminActionsByActor(topCountsByActor(recentLogs, last24h))
                .topSourceIps(topCountsBySourceIp(recentLogs, last24h))
                .build();
    }

    @Transactional(readOnly = true)
    public PagedResponse<AuditLogResponse> listMyAuditLogs(
            UUID actorId,
            int page,
            int size,
            String search,
            String action,
            String status
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);

        User actor = userRepository.findById(actorId).orElse(null);
        List<String> roleNames = actor != null && actor.getRoles() != null
                ? actor.getRoles().stream().map(r -> r.getName()).toList()
                : List.of();

        Specification<AuditLog> spec = buildSpecification(search, action, status);

        if (!roleNames.contains("SUPER_ADMIN")) {
            if (roleNames.contains("ADMIN")) {
                // ADMIN sees own logs + logs of OPERATORs in their establishment(s)
                List<UUID> adminEstablishmentIds = establishmentJpaRepository
                        .findAllByCreatedByUserId(actorId, Sort.unsorted())
                        .stream().map(e -> e.getId()).toList();

                Specification<AuditLog> scopedSpec = (root, query, cb) -> {
                    Predicate ownLogs = cb.equal(root.get("user").get("id"), actorId);
                    if (adminEstablishmentIds.isEmpty()) {
                        return ownLogs;
                    }
                    Predicate establishmentMatch = root.get("establishmentId").in(adminEstablishmentIds);
                    Predicate operatorRole = cb.isTrue(
                            cb.function("jsonb_exists", Boolean.class, root.get("actorRoles"), cb.literal("ROLE_OPERATOR")));
                    return cb.or(ownLogs, cb.and(establishmentMatch, operatorRole));
                };
                spec = spec.and(scopedSpec);
            } else {
                // OPERATOR and others: only own logs
                UUID finalActorId = actorId;
                spec = spec.and((root, query, cb) -> cb.equal(root.get("user").get("id"), finalActorId));
            }
        }

        Page<AuditLog> auditPage = auditLogJpaRepository.findAll(
                spec,
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "timestamp"))
        );

        return PagedResponse.<AuditLogResponse>builder()
                .content(auditPage.getContent().stream().map(this::toResponse).toList())
                .page(safePage)
                .size(safeSize)
                .totalElements(auditPage.getTotalElements())
                .totalPages(auditPage.getTotalPages())
                .build();
    }

    private Specification<AuditLog> buildSpecification(String search, String action, String status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (action != null && !action.isBlank() && !"ALL".equalsIgnoreCase(action)) {
                try {
                    AuditLog.AuditAction auditAction = AuditLog.AuditAction.valueOf(action.trim().toUpperCase());
                    predicates.add(cb.equal(root.get("action"), auditAction));
                } catch (IllegalArgumentException ignored) {
                    predicates.add(cb.disjunction());
                }
            }

            if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                Predicate statusPredicate = switch (status.trim().toUpperCase()) {
                    case "OK" -> cb.and(
                            cb.isNotNull(root.get("statusCode")),
                            cb.greaterThanOrEqualTo(root.get("statusCode"), 200),
                            cb.lessThan(root.get("statusCode"), 400),
                            cb.or(
                                    cb.isNull(root.get("errorMessage")),
                                    cb.equal(cb.trim(root.get("errorMessage")), "")
                            )
                    );
                    case "ERROR" -> cb.or(
                            cb.greaterThanOrEqualTo(root.get("statusCode"), 400),
                            cb.and(
                                    cb.isNotNull(root.get("errorMessage")),
                                    cb.notEqual(cb.trim(root.get("errorMessage")), "")
                            )
                    );
                    case "INFO" -> cb.and(
                            cb.isNull(root.get("statusCode")),
                            cb.or(
                                    cb.isNull(root.get("errorMessage")),
                                    cb.equal(cb.trim(root.get("errorMessage")), "")
                            )
                    );
                    default -> cb.conjunction();
                };
                predicates.add(statusPredicate);
            }

            if (search != null && !search.isBlank()) {
                String queryText = "%" + search.trim().toLowerCase() + "%";
                Join<Object, Object> userJoin = root.join("user", JoinType.LEFT);
                Expression<String> actionAsText = root.get("action").as(String.class);

                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("resourcePath")), queryText),
                        cb.like(cb.lower(root.get("entityType")), queryText),
                        cb.like(cb.lower(root.get("details")), queryText),
                        cb.like(cb.lower(root.get("errorMessage")), queryText),
                        cb.like(cb.lower(actionAsText), queryText),
                        cb.like(cb.lower(userJoin.get("email")), queryText)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private AuditLogResponse toResponse(AuditLog auditLog) {
        String status = resolveStatus(auditLog);
        String message = auditLog.getErrorMessage();
        if (message == null || message.isBlank()) {
            String resource = auditLog.getResourcePath() == null ? "" : auditLog.getResourcePath();
            message = resource.isBlank() ? auditLog.getAction().name() : resource;
        }

        return AuditLogResponse.builder()
                .id(auditLog.getId())
                .timestamp(auditLog.getTimestamp())
                .action(auditLog.getAction().name())
            .outcome(auditLog.getOutcome() != null ? auditLog.getOutcome().name() : null)
                .status(status)
                .message(message)
                .resourcePath(auditLog.getResourcePath())
                .statusCode(auditLog.getStatusCode())
                .errorMessage(auditLog.getErrorMessage())
            .correlationId(auditLog.getCorrelationId())
            .actorId(auditLog.getUser() != null ? auditLog.getUser().getId() : null)
                .userId(auditLog.getUser() != null ? auditLog.getUser().getId() : null)
            .actorRoles(auditLog.getActorRoles())
                .userEmail(auditLog.getUser() != null ? auditLog.getUser().getEmail() : null)
                .ipAddress(auditLog.getIpAddress())
                .userAgent(auditLog.getUserAgent())
            .sessionId(auditLog.getSession() != null ? auditLog.getSession().getId() : null)
            .targetId(auditLog.getEntityId())
            .targetType(auditLog.getEntityType())
            .reasonCode(auditLog.getReasonCode())
                .details(auditLog.getDetails())
                .establishmentId(auditLog.getEstablishmentId())
                .build();
    }

    private String resolveStatus(AuditLog auditLog) {
        boolean hasErrorMessage = auditLog.getErrorMessage() != null && !auditLog.getErrorMessage().isBlank();
        if ((auditLog.getStatusCode() != null && auditLog.getStatusCode() >= 400) || hasErrorMessage) {
            return "ERROR";
        }
        if (auditLog.getStatusCode() != null && auditLog.getStatusCode() >= 200 && auditLog.getStatusCode() < 400) {
            return "OK";
        }
        return "INFO";
    }

    private AuditDashboardSummaryResponse.MetricWindowResponse buildMetricWindow(
            List<AuditLog> logs,
            AuditLog.AuditAction action,
            AuditLog.AuditOutcome outcome,
            LocalDateTime last24h,
            LocalDateTime last7d,
            LocalDateTime last30d) {
        return AuditDashboardSummaryResponse.MetricWindowResponse.builder()
                .last24h(countMatches(logs, action, outcome, last24h))
                .last7d(countMatches(logs, action, outcome, last7d))
                .last30d(countMatches(logs, action, outcome, last30d))
                .build();
    }

    private AuditDashboardSummaryResponse.MetricWindowResponse buildReuseMetricWindow(
            List<AuditLog> logs,
            LocalDateTime last24h,
            LocalDateTime last7d,
            LocalDateTime last30d) {
        return AuditDashboardSummaryResponse.MetricWindowResponse.builder()
                .last24h(countReuseMatches(logs, last24h))
                .last7d(countReuseMatches(logs, last7d))
                .last30d(countReuseMatches(logs, last30d))
                .build();
    }

    private long countMatches(List<AuditLog> logs, AuditLog.AuditAction action, AuditLog.AuditOutcome outcome, LocalDateTime since) {
        return logs.stream()
                .filter(log -> log.getTimestamp() != null && !log.getTimestamp().isBefore(since))
                .filter(log -> log.getAction() == action)
                .filter(log -> log.getOutcome() == outcome)
                .count();
    }

    private long countReuseMatches(List<AuditLog> logs, LocalDateTime since) {
        return logs.stream()
                .filter(log -> log.getTimestamp() != null && !log.getTimestamp().isBefore(since))
                .filter(log -> log.getAction() == AuditLog.AuditAction.REFRESH)
                .filter(log -> log.getOutcome() == AuditLog.AuditOutcome.FAILURE)
                .filter(log -> "SESSION_EXPIRED".equalsIgnoreCase(log.getReasonCode())
                        || "INVALID_TOKEN".equalsIgnoreCase(log.getReasonCode()))
                .count();
    }

    private List<AuditDashboardSummaryResponse.KeyValueCountResponse> topCountsBySourceIp(List<AuditLog> logs, LocalDateTime since) {
        return logs.stream()
                .filter(log -> log.getTimestamp() != null && !log.getTimestamp().isBefore(since))
                .filter(log -> log.getOutcome() == AuditLog.AuditOutcome.FAILURE)
                .collect(Collectors.groupingBy(log -> log.getIpAddress() == null ? "anonymous" : log.getIpAddress(), Collectors.counting()))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder()))
                .limit(TOP_LIMIT)
                .map(entry -> AuditDashboardSummaryResponse.KeyValueCountResponse.builder().key(entry.getKey()).count(entry.getValue()).build())
                .toList();
    }

    private List<AuditDashboardSummaryResponse.ActorCountResponse> topCountsByActor(List<AuditLog> logs, LocalDateTime since) {
        Map<UUID, ActorAggregate> aggregateMap = new HashMap<>();

        for (AuditLog log : logs) {
            if (log.getTimestamp() == null || log.getTimestamp().isBefore(since) || log.getUser() == null) {
                continue;
            }

            UUID actorId = log.getUser().getId();
            ActorAggregate aggregate = aggregateMap.computeIfAbsent(actorId, id -> new ActorAggregate(id, log.getUser().getEmail(), 0));
            aggregate.count++;
        }

        return aggregateMap.values().stream()
                .sorted(Comparator.comparingLong(ActorAggregate::count).reversed())
                .limit(TOP_LIMIT)
                .map(entry -> AuditDashboardSummaryResponse.ActorCountResponse.builder()
                        .actorId(entry.actorId())
                        .actorEmail(entry.actorEmail())
                        .count(entry.count())
                        .build())
                .toList();
    }

    private static final class ActorAggregate {
        private final UUID actorId;
        private final String actorEmail;
        private long count;

        private ActorAggregate(UUID actorId, String actorEmail, long count) {
            this.actorId = actorId;
            this.actorEmail = actorEmail;
            this.count = count;
        }

        private UUID actorId() {
            return actorId;
        }

        private String actorEmail() {
            return actorEmail;
        }

        private long count() {
            return count;
        }
    }
}