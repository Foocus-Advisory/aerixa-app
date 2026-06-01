package com.aerixa.app.infrastructure.auth.controller;

import com.aerixa.app.application.auth.dto.PagedResponse;
import com.aerixa.app.application.auth.dto.SessionResponse;
import com.aerixa.app.application.auth.service.SessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sessions")
@RequiredArgsConstructor
@Tag(name = "Sessions Admin", description = "Gestion administrateur des sessions")
@SecurityRequirement(name = "bearerAuth")
public class SessionsAdminController {

    private final SessionService sessionService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('sessions:read_all', 'sessions:read_children')")
    @Operation(summary = "Lister les sessions (admin)")
    public ResponseEntity<PagedResponse<SessionResponse>> listSessions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) String userQuery,
            @RequestParam(required = false) String startedFrom,
            @RequestParam(required = false) String startedTo,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            Authentication authentication
    ) {
        UUID actorId = UUID.fromString(authentication.getName());
        String currentToken = extractBearerToken(authorizationHeader);

        LocalDateTime fromDateTime = parseStartDate(startedFrom);
        LocalDateTime toDateTime = parseEndDate(startedTo);

        return ResponseEntity.ok(sessionService.listAdminSessions(
            actorId,
                page,
                size,
                status,
                userId,
                userQuery,
                fromDateTime,
                toDateTime,
                currentToken
        ));
    }

        @GetMapping(value = "/export")
    @PreAuthorize("hasAnyAuthority('sessions:read_all', 'sessions:read_children')")
        @Operation(summary = "Exporter les sessions (admin)")
        public ResponseEntity<byte[]> exportSessions(
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) String userQuery,
            @RequestParam(required = false) String startedFrom,
            @RequestParam(required = false) String startedTo,
            @RequestParam(required = false, defaultValue = "xlsx") String format,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            Authentication authentication
        ) {
        UUID actorId = UUID.fromString(authentication.getName());
        String currentToken = extractBearerToken(authorizationHeader);
        LocalDateTime fromDateTime = parseStartDate(startedFrom);
        LocalDateTime toDateTime = parseEndDate(startedTo);
        String normalizedFormat = "csv".equalsIgnoreCase(format) ? "csv" : "xlsx";
        byte[] file = sessionService.exportAdminSessions(
            actorId,
            status,
            userId,
            userQuery,
            fromDateTime,
            toDateTime,
            normalizedFormat,
            currentToken
        );

        String fileName = "sessions-export." + normalizedFormat;
        MediaType mediaType = "csv".equals(normalizedFormat)
            ? MediaType.parseMediaType("text/csv; charset=UTF-8")
            : MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + fileName)
            .contentType(mediaType)
            .body(file);
        }

    @GetMapping("/{sessionId}")
    @PreAuthorize("hasAnyAuthority('sessions:read_all', 'sessions:read_children')")
    @Operation(summary = "Consulter une session (admin)")
    public ResponseEntity<SessionResponse> getSession(
            @PathVariable UUID sessionId,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            Authentication authentication
    ) {
        UUID actorId = UUID.fromString(authentication.getName());
        String currentToken = extractBearerToken(authorizationHeader);
        return ResponseEntity.ok(sessionService.getSessionByIdForAdmin(actorId, sessionId, currentToken));
    }

    @PostMapping("/{sessionId}/revoke")
    @PreAuthorize("hasAuthority('sessions:revoke')")
    @Operation(summary = "Révoquer une session (admin)")
    public ResponseEntity<Void> revokeSession(@PathVariable UUID sessionId, Authentication authentication) {
        UUID actorId = UUID.fromString(authentication.getName());
        sessionService.revokeSessionByAdmin(actorId, sessionId);
        return ResponseEntity.noContent().build();
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }
        return authorizationHeader.substring(7);
    }

    private LocalDateTime parseStartDate(String rawDate) {
        if (rawDate == null || rawDate.isBlank()) {
            return null;
        }
        if (rawDate.contains("T")) {
            return LocalDateTime.parse(rawDate);
        }
        return LocalDate.parse(rawDate).atStartOfDay();
    }

    private LocalDateTime parseEndDate(String rawDate) {
        if (rawDate == null || rawDate.isBlank()) {
            return null;
        }
        if (rawDate.contains("T")) {
            return LocalDateTime.parse(rawDate);
        }
        return LocalDate.parse(rawDate).atTime(LocalTime.MAX);
    }
}
