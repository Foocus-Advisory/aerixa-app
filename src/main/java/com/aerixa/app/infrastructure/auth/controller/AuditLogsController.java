package com.aerixa.app.infrastructure.auth.controller;

import com.aerixa.app.application.auth.dto.AuditLogResponse;
import com.aerixa.app.application.auth.dto.AuditDashboardSummaryResponse;
import com.aerixa.app.application.auth.dto.PagedResponse;
import com.aerixa.app.application.auth.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Audit Logs", description = "Consultation des journaux d'audit")
@SecurityRequirement(name = "bearerAuth")
public class AuditLogsController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAuthority('audit_logs:read')")
    @Operation(summary = "Lister les logs d'audit")
    public ResponseEntity<PagedResponse<AuditLogResponse>> listAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "ALL") String action,
            @RequestParam(required = false, defaultValue = "ALL") String status
    ) {
        return ResponseEntity.ok(auditLogService.listAuditLogs(page, size, search, action, status));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('audit_logs:read')")
    @Operation(summary = "Résumé KPI des logs d'audit")
    public ResponseEntity<AuditDashboardSummaryResponse> summary() {
        return ResponseEntity.ok(auditLogService.getDashboardSummary());
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mes logs d'audit (filtres par role)")
    public ResponseEntity<PagedResponse<AuditLogResponse>> listMyAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "ALL") String action,
            @RequestParam(required = false, defaultValue = "ALL") String status,
            Authentication authentication
    ) {
        UUID actorId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(auditLogService.listMyAuditLogs(actorId, page, size, search, action, status));
    }
}