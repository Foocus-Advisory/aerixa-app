package com.aerixa.app.application.auth.service;

import com.aerixa.app.application.auth.dto.SessionResponse;
import com.aerixa.app.domain.auth.entity.Session;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.PermissionDeniedException;
import com.aerixa.app.domain.auth.exception.SessionExpiredException;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.SessionRepository;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.infrastructure.security.TokenHashUtils;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SessionService {

    private static final DateTimeFormatter EXPORT_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final LocalDateTime ADMIN_SESSIONS_MIN_DATE = LocalDateTime.of(1970, 1, 1, 0, 0);
    private static final LocalDateTime ADMIN_SESSIONS_MAX_DATE = LocalDateTime.of(9999, 12, 31, 23, 59, 59);
    private static final String PERMISSION_SESSIONS_READ_ALL = "sessions:read_all";
    private static final String PERMISSION_SESSIONS_READ_CHILDREN = "sessions:read_children";

    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<SessionResponse> getUserActiveSessions(UUID userId, String currentAccessToken) {
        UUID currentSessionId = resolveCurrentSessionId(currentAccessToken);

        return sessionRepository.findAllActiveSessionsByUserId(userId)
                .stream()
            .map(session -> toSessionResponse(session, currentSessionId))
                .toList();
    }

        @Transactional(readOnly = true)
        public com.aerixa.app.application.auth.dto.PagedResponse<SessionResponse> listAdminSessions(
            UUID actorUserId,
            int page,
            int size,
            String status,
            UUID userId,
            String userQuery,
            LocalDateTime startedFrom,
            LocalDateTime startedTo,
            String currentAccessToken
        ) {
        User actor = userRepository.findById(actorUserId)
            .orElseThrow(() -> new UserNotFoundException(actorUserId));
        boolean canReadAll = hasPermission(actor, PERMISSION_SESSIONS_READ_ALL) || actor.hasRole("SUPER_ADMIN");
        boolean canReadChildren = hasPermission(actor, PERMISSION_SESSIONS_READ_CHILDREN);

        if (!canReadAll && !canReadChildren) {
            throw new PermissionDeniedException("sessions:read");
        }

        UUID currentSessionId = resolveCurrentSessionId(currentAccessToken);
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        LocalDateTime effectiveStartedFrom = normalizeStartedFrom(startedFrom);
        LocalDateTime effectiveStartedTo = normalizeStartedTo(startedTo);

        Page<Session> sessionsPage = sessionRepository.findAllForAdmin(
            actor.getId(),
            canReadAll,
            userId,
            status,
            effectiveStartedFrom,
            effectiveStartedTo,
            userQuery,
            PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"))
        );

        List<SessionResponse> content = sessionsPage.getContent().stream()
            .map(session -> toSessionResponse(session, currentSessionId))
            .toList();

        return com.aerixa.app.application.auth.dto.PagedResponse.<SessionResponse>builder()
            .content(content)
            .page(safePage)
            .size(safeSize)
            .totalElements(sessionsPage.getTotalElements())
            .totalPages(sessionsPage.getTotalPages())
            .build();
        }

        @Transactional(readOnly = true)
        public SessionResponse getSessionByIdForAdmin(UUID actorUserId, UUID sessionId, String currentAccessToken) {
        User actor = userRepository.findById(actorUserId)
            .orElseThrow(() -> new UserNotFoundException(actorUserId));
        boolean canReadAll = hasPermission(actor, PERMISSION_SESSIONS_READ_ALL) || actor.hasRole("SUPER_ADMIN");
        boolean canReadChildren = hasPermission(actor, PERMISSION_SESSIONS_READ_CHILDREN);

        if (!canReadAll && !canReadChildren) {
            throw new PermissionDeniedException("sessions:read");
        }

        UUID currentSessionId = resolveCurrentSessionId(currentAccessToken);
        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(SessionExpiredException::new);

        if (!canReadAll) {
            UUID parentAdminId = session.getUser() != null && session.getUser().getParentAdmin() != null
                    ? session.getUser().getParentAdmin().getId()
                    : null;
            if (!actor.getId().equals(parentAdminId)) {
                throw new PermissionDeniedException("sessions:read");
            }
        }

        return toSessionResponse(session, currentSessionId);
        }

        @Transactional(readOnly = true)
        public byte[] exportAdminSessions(
            UUID actorUserId,
            String status,
            UUID userId,
            String userQuery,
            LocalDateTime startedFrom,
            LocalDateTime startedTo,
            String format,
            String currentAccessToken
        ) {
            User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
            boolean canReadAll = hasPermission(actor, PERMISSION_SESSIONS_READ_ALL) || actor.hasRole("SUPER_ADMIN");
            boolean canReadChildren = hasPermission(actor, PERMISSION_SESSIONS_READ_CHILDREN);

            if (!canReadAll && !canReadChildren) {
                throw new PermissionDeniedException("sessions:read");
            }

            UUID currentSessionId = resolveCurrentSessionId(currentAccessToken);
                LocalDateTime effectiveStartedFrom = normalizeStartedFrom(startedFrom);
                LocalDateTime effectiveStartedTo = normalizeStartedTo(startedTo);
            List<SessionResponse> sessions = sessionRepository.findAllForAdmin(
                    actor.getId(),
                    canReadAll,
                    userId,
                    status,
                    effectiveStartedFrom,
                    effectiveStartedTo,
                    normalizeUserQuery(userQuery),
                    Sort.by(Sort.Direction.DESC, "createdAt")
                )
                .stream()
                .map(session -> toSessionResponse(session, currentSessionId))
                .toList();

            if ("csv".equalsIgnoreCase(format)) {
                return exportAdminSessionsToCsv(sessions);
            }

            return exportAdminSessionsToExcel(sessions);
        }

        @Transactional
        public void revokeSessionByAdmin(UUID actorUserId, UUID sessionId) {
        User actor = userRepository.findById(actorUserId)
            .orElseThrow(() -> new UserNotFoundException(actorUserId));
        boolean canReadAll = hasPermission(actor, PERMISSION_SESSIONS_READ_ALL) || actor.hasRole("SUPER_ADMIN");
        boolean canReadChildren = hasPermission(actor, PERMISSION_SESSIONS_READ_CHILDREN);

        if (!canReadAll && !canReadChildren) {
            throw new PermissionDeniedException("sessions:revoke");
        }

        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(SessionExpiredException::new);

        if (!canReadAll) {
            UUID parentAdminId = session.getUser() != null && session.getUser().getParentAdmin() != null
                    ? session.getUser().getParentAdmin().getId()
                    : null;
            if (!actor.getId().equals(parentAdminId)) {
                throw new PermissionDeniedException("sessions:revoke");
            }
        }

        session.setRevokedAt(LocalDateTime.now());
        sessionRepository.save(session);
        }

    private boolean hasPermission(User actor, String permissionName) {
        return actor.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .anyMatch(permission -> permissionName.equals(permission.getName()));
    }

    @Transactional
    public void revokeSession(UUID userId, UUID sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(SessionExpiredException::new);

        if (!session.getUser().getId().equals(userId)) {
            throw new SessionExpiredException();
        }

        session.setRevokedAt(LocalDateTime.now());
        sessionRepository.save(session);
    }

    @Transactional
    public void revokeOtherSessions(UUID userId, String currentAccessToken) {
        UUID currentSessionId = resolveCurrentSessionId(currentAccessToken);

        List<Session> sessions = sessionRepository.findAllActiveSessionsByUserId(userId);
        for (Session session : sessions) {
            if (currentSessionId == null || !session.getId().equals(currentSessionId)) {
                session.setRevokedAt(LocalDateTime.now());
                sessionRepository.save(session);
            }
        }
    }

    @Transactional
    public Session createSession(Session session) {
        return sessionRepository.save(session);
    }

    @Transactional(readOnly = true)
    public Session findActiveByRefreshToken(String refreshToken) {
        String hash = TokenHashUtils.sha256(refreshToken);
        Session session = sessionRepository.findByRefreshTokenHash(hash)
                .orElseThrow(SessionExpiredException::new);

        if (!session.isActive()) {
            throw new SessionExpiredException();
        }

        return session;
    }

    @Transactional
    public void revokeByAccessToken(String accessToken) {
        String hash = TokenHashUtils.sha256(accessToken);
        sessionRepository.findByAccessTokenHash(hash).ifPresent(session -> {
            session.setRevokedAt(LocalDateTime.now());
            sessionRepository.save(session);
        });
    }

    private UUID resolveCurrentSessionId(String currentAccessToken) {
        if (currentAccessToken == null || currentAccessToken.isBlank()) {
            return null;
        }

        return sessionRepository.findByAccessTokenHash(TokenHashUtils.sha256(currentAccessToken))
                .map(Session::getId)
                .orElse(null);
    }

    private String normalizeUserQuery(String userQuery) {
        if (userQuery == null) {
            return null;
        }

        String normalized = userQuery.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private LocalDateTime normalizeStartedFrom(LocalDateTime startedFrom) {
        return startedFrom != null ? startedFrom : ADMIN_SESSIONS_MIN_DATE;
    }

    private LocalDateTime normalizeStartedTo(LocalDateTime startedTo) {
        return startedTo != null ? startedTo : ADMIN_SESSIONS_MAX_DATE;
    }

    private byte[] exportAdminSessionsToExcel(List<SessionResponse> sessions) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("sessions");

            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("userDisplayName");
            header.createCell(1).setCellValue("userEmail");
            header.createCell(2).setCellValue("status");
            header.createCell(3).setCellValue("isCurrentSession");
            header.createCell(4).setCellValue("deviceName");
            header.createCell(5).setCellValue("deviceType");
            header.createCell(6).setCellValue("ipAddress");
            header.createCell(7).setCellValue("userAgent");
            header.createCell(8).setCellValue("createdAt");
            header.createCell(9).setCellValue("lastActivityAt");
            header.createCell(10).setCellValue("endedAt");
            header.createCell(11).setCellValue("expiresAt");
            header.createCell(12).setCellValue("revokedAt");

            int rowIndex = 1;
            for (SessionResponse session : sessions) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(nullSafe(session.getUserDisplayName()));
                row.createCell(1).setCellValue(nullSafe(session.getUserEmail()));
                row.createCell(2).setCellValue(nullSafe(session.getStatus()));
                row.createCell(3).setCellValue(session.isCurrentSession());
                row.createCell(4).setCellValue(nullSafe(session.getDeviceName()));
                row.createCell(5).setCellValue(nullSafe(session.getDeviceType()));
                row.createCell(6).setCellValue(nullSafe(session.getIpAddress()));
                row.createCell(7).setCellValue(nullSafe(session.getUserAgent()));
                row.createCell(8).setCellValue(formatDateTime(session.getCreatedAt()));
                row.createCell(9).setCellValue(formatDateTime(session.getLastActivityAt()));
                row.createCell(10).setCellValue(formatDateTime(session.getEndedAt()));
                row.createCell(11).setCellValue(formatDateTime(session.getExpiresAt()));
                row.createCell(12).setCellValue(formatDateTime(session.getRevokedAt()));
            }

            for (int i = 0; i <= 12; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("Impossible de générer l'export Excel des sessions", exception);
        }
    }

    private byte[] exportAdminSessionsToCsv(List<SessionResponse> sessions) {
        StringBuilder builder = new StringBuilder();
        builder.append("userDisplayName,userEmail,status,isCurrentSession,deviceName,deviceType,ipAddress,userAgent,createdAt,lastActivityAt,endedAt,expiresAt,revokedAt\n");

        for (SessionResponse session : sessions) {
            builder
                .append(csvCell(session.getUserDisplayName())).append(',')
                .append(csvCell(session.getUserEmail())).append(',')
                .append(csvCell(session.getStatus())).append(',')
                .append(csvCell(Boolean.toString(session.isCurrentSession()))).append(',')
                .append(csvCell(session.getDeviceName())).append(',')
                .append(csvCell(session.getDeviceType())).append(',')
                .append(csvCell(session.getIpAddress())).append(',')
                .append(csvCell(session.getUserAgent())).append(',')
                .append(csvCell(formatDateTime(session.getCreatedAt()))).append(',')
                .append(csvCell(formatDateTime(session.getLastActivityAt()))).append(',')
                .append(csvCell(formatDateTime(session.getEndedAt()))).append(',')
                .append(csvCell(formatDateTime(session.getExpiresAt()))).append(',')
                .append(csvCell(formatDateTime(session.getRevokedAt())))
                .append('\n');
        }

        return builder.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private String formatDateTime(LocalDateTime value) {
        return value == null ? "" : EXPORT_FORMATTER.format(value);
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }

    private String csvCell(String value) {
        String normalized = nullSafe(value).replace("\r", " ").replace("\n", " ");
        return '"' + normalized.replace("\"", "\"\"") + '"';
    }

    private SessionResponse toSessionResponse(Session session, UUID currentSessionId) {
        LocalDateTime endedAt = null;
        String status = "ACTIVE";

        if (session.getRevokedAt() != null) {
            status = "REVOKED";
            endedAt = session.getRevokedAt();
        } else if (session.getExpiresAt() != null && !LocalDateTime.now().isBefore(session.getExpiresAt())) {
            status = "EXPIRED";
            endedAt = session.getExpiresAt();
        }

        String userDisplayName = null;
        if (session.getUser() != null) {
            String firstName = session.getUser().getFirstName() != null ? session.getUser().getFirstName().trim() : "";
            String lastName = session.getUser().getLastName() != null ? session.getUser().getLastName().trim() : "";
            String fullName = (firstName + " " + lastName).trim();
            userDisplayName = fullName.isBlank() ? session.getUser().getEmail() : fullName;
        }

        return SessionResponse.builder()
                .id(session.getId())
                .userId(session.getUser() != null ? session.getUser().getId() : null)
                .userEmail(session.getUser() != null ? session.getUser().getEmail() : null)
                .userDisplayName(userDisplayName)
                .deviceName(session.getDeviceName())
                .deviceType(session.getDeviceType() != null ? session.getDeviceType().name() : null)
                .ipAddress(session.getIpAddress())
                .userAgent(session.getUserAgent())
                .status(status)
                .createdAt(session.getCreatedAt())
                .endedAt(endedAt)
                .lastActivityAt(session.getLastActivityAt())
                .expiresAt(session.getExpiresAt())
                .revokedAt(session.getRevokedAt())
                .isCurrentSession(currentSessionId != null && session.getId().equals(currentSessionId))
                .build();
    }
}
