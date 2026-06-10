package com.aerixa.app.infrastructure.audit;

import com.aerixa.app.domain.auth.entity.AuditLog;
import com.aerixa.app.domain.auth.entity.Session;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.repository.AuditLogRepository;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.infrastructure.auth.repository.SessionJpaRepository;
import com.aerixa.app.infrastructure.security.JwtTokenProvider;
import com.aerixa.app.infrastructure.security.TokenHashUtils;
import tools.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuditLoggingFilter extends OncePerRequestFilter {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final SessionJpaRepository sessionJpaRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final ObjectMapper objectMapper;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        if (!path.startsWith("/api/v1")) {
            return true;
        }
        return path.startsWith("/api/v1/docs")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/api/v1/swagger-ui.html")
                || path.startsWith("/api/v1/auth/health");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String correlationId = resolveCorrelationId(request);
        request.setAttribute("audit.correlationId", correlationId);
        response.setHeader("X-Correlation-ID", correlationId);

        Exception capturedException = null;
        try {
            filterChain.doFilter(request, response);
        } catch (Exception ex) {
            capturedException = ex;
            throw ex;
        } finally {
            persistAuditLog(request, response, capturedException);
        }
    }

    private void persistAuditLog(HttpServletRequest request, HttpServletResponse response, Exception exception) {
        String path = request.getRequestURI();
        String queryString = request.getQueryString();
        String resourcePath = queryString == null || queryString.isBlank() ? path : path + "?" + queryString;
        Integer statusCode = response.getStatus();
        AuditLog.AuditAction action = resolveAction(request.getMethod(), path);
        String correlationId = attributeAsString(request, "audit.correlationId");
        String outcome = resolveOutcome(request, response, exception);
        String reasonCode = resolveReasonCode(request, exception, statusCode);

        try {
            AuditLog auditLog = buildAuditLog(request, exception, resourcePath, statusCode, action, correlationId, outcome, reasonCode);
            auditLogRepository.save(auditLog);
        } catch (Exception ex) {
            if (action == AuditLog.AuditAction.READ) {
                try {
                    // Compatibility fallback when DB enum audit_action has not been migrated with READ yet.
                    AuditLog fallbackAuditLog = buildAuditLog(request, exception, resourcePath, statusCode, AuditLog.AuditAction.UPDATE, correlationId, outcome, reasonCode);
                    auditLogRepository.save(fallbackAuditLog);
                    return;
                } catch (Exception fallbackEx) {
                    log.warn(
                            "Unable to persist audit log (READ fallback also failed): method={}, path={}, status={}, error={} / fallbackError={}",
                            request.getMethod(),
                            resourcePath,
                            statusCode,
                            ex.getMessage(),
                            fallbackEx.getMessage()
                    );
                    return;
                }
            }

            log.warn(
                    "Unable to persist audit log: method={}, path={}, status={}, error={}",
                    request.getMethod(),
                    resourcePath,
                    statusCode,
                    ex.getMessage()
            );
        }
    }

    private AuditLog buildAuditLog(
            HttpServletRequest request,
            Exception exception,
            String resourcePath,
            Integer statusCode,
            AuditLog.AuditAction action,
            String correlationId,
            String outcome,
            String reasonCode
    ) {
        return AuditLog.builder()
                .correlationId(correlationId)
                    .user(resolveCurrentUser())
                .actorRoles(resolveActorRoles())
                .outcome(resolveOutcomeEnum(outcome))
                .reasonCode(reasonCode)
                .session(resolveCurrentSession(request))
                    .action(action)
                    .entityType(resolveEntityType(request.getRequestURI()))
                    .entityId(extractEntityId(request.getRequestURI()))
                    .resourcePath(resourcePath)
                    .ipAddress(resolveIpAddress(request))
                    .userAgent(resolveUserAgent(request))
                    .details(buildDetailsJson(request))
                    .statusCode(statusCode)
                    .errorMessage(exception != null ? exception.getMessage() : null)
                    .build();
    }

    private User resolveCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        String principal = String.valueOf(authentication.getName());
        try {
            UUID userId = UUID.fromString(principal);
            return userRepository.findById(userId).orElse(null);
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private String resolveActorRoles() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return "[]";
        }

        var roles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .sorted()
                .collect(Collectors.toList());

        try {
            return objectMapper.writeValueAsString(roles);
        } catch (Exception e) {
            return "[]";
        }
    }

    private Session resolveCurrentSession(HttpServletRequest request) {
        String authorizationHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }

        String token = authorizationHeader.substring(7);
        if (!jwtTokenProvider.validateToken(token)) {
            return null;
        }

        return sessionJpaRepository.findByAccessTokenHash(TokenHashUtils.sha256(token)).orElse(null);
    }

    private AuditLog.AuditOutcome resolveOutcomeEnum(String outcome) {
        return "FAILURE".equalsIgnoreCase(outcome) ? AuditLog.AuditOutcome.FAILURE : AuditLog.AuditOutcome.SUCCESS;
    }

    private String resolveOutcome(HttpServletRequest request, HttpServletResponse response, Exception exception) {
        Object attribute = request.getAttribute("audit.outcome");
        if (attribute != null) {
            return String.valueOf(attribute);
        }

        if (exception != null) {
            return "FAILURE";
        }

        return response.getStatus() >= 400 ? "FAILURE" : "SUCCESS";
    }

    private String resolveReasonCode(HttpServletRequest request, Exception exception, Integer statusCode) {
        Object attribute = request.getAttribute("audit.reasonCode");
        if (attribute != null) {
            return String.valueOf(attribute);
        }

        if (exception != null) {
            return exception.getClass().getSimpleName();
        }

        if (statusCode != null && statusCode >= 400) {
            return "HTTP_" + statusCode;
        }

        return null;
    }

    private String resolveCorrelationId(HttpServletRequest request) {
        String correlationId = request.getHeader("X-Correlation-ID");
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = request.getHeader("X-Request-ID");
        }

        return (correlationId == null || correlationId.isBlank()) ? UUID.randomUUID().toString() : correlationId.trim();
    }

    private String attributeAsString(HttpServletRequest request, String name) {
        Object attribute = request.getAttribute(name);
        return attribute != null ? String.valueOf(attribute) : null;
    }

    private AuditLog.AuditAction resolveAction(String method, String path) {
        if (path.startsWith("/api/v1/auth/login")) {
            return AuditLog.AuditAction.LOGIN;
        }
        if (path.startsWith("/api/v1/auth/google/login")) {
            return AuditLog.AuditAction.LOGIN;
        }
        if (path.startsWith("/api/v1/auth/google/register")) {
            return AuditLog.AuditAction.CREATE;
        }
        if (path.startsWith("/api/v1/auth/logout")) {
            return AuditLog.AuditAction.LOGOUT;
        }
        if (path.startsWith("/api/v1/auth/refresh")) {
            return AuditLog.AuditAction.REFRESH;
        }
        if (path.contains("/revoke")) {
            return AuditLog.AuditAction.REVOKED;
        }

        return switch (method.toUpperCase()) {
            case "POST" -> AuditLog.AuditAction.CREATE;
            case "PUT", "PATCH" -> AuditLog.AuditAction.UPDATE;
            case "DELETE" -> AuditLog.AuditAction.DELETE;
            case "GET" -> AuditLog.AuditAction.READ;
            default -> AuditLog.AuditAction.UPDATE;
        };
    }

    private String resolveEntityType(String path) {
        String normalizedPath = path == null ? "" : path;
        String[] segments = normalizedPath.split("/");
        if (segments.length >= 4) {
            return segments[3];
        }
        return "api";
    }

    private UUID extractEntityId(String path) {
        String[] segments = path == null ? new String[0] : path.split("/");
        for (String segment : segments) {
            if (segment == null || segment.isBlank()) {
                continue;
            }
            try {
                return UUID.fromString(segment);
            } catch (IllegalArgumentException ignored) {
                // Continue to next segment.
            }
        }
        return null;
    }

    private String resolveIpAddress(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }

        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        return request.getRemoteAddr();
    }

    private String resolveUserAgent(HttpServletRequest request) {
        String clientUserAgent = request.getHeader("X-Client-User-Agent");
        if (clientUserAgent != null && !clientUserAgent.isBlank()) {
            return clientUserAgent;
        }
        return request.getHeader("User-Agent");
    }

    private String buildDetailsJson(HttpServletRequest request) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("method", request.getMethod());
        details.put("path", request.getRequestURI());
        details.put("query", request.getQueryString());
        details.put("requestId", request.getHeader("X-Request-ID"));

        try {
            return objectMapper.writeValueAsString(details);
        } catch (Exception e) {
            return "{}";
        }
    }
}