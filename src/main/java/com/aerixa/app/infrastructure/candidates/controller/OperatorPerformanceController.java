package com.aerixa.app.infrastructure.candidates.controller;

import com.aerixa.app.application.candidates.dto.OperatorPerformanceResponse;
import com.aerixa.app.application.candidates.service.OperatorPerformanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/establishments/{establishmentId}/operator-performance")
@RequiredArgsConstructor
@Tag(name = "OperatorPerformance", description = "KPI de performance des operateurs par etablissement")
@SecurityRequirement(name = "bearerAuth")
public class OperatorPerformanceController {

    private final OperatorPerformanceService operatorPerformanceService;

    @GetMapping
    @PreAuthorize("hasAuthority('candidates:read_operator_performance')")
    @Operation(summary = "Lister les KPI de performance des operateurs d'un etablissement")
    public ResponseEntity<List<OperatorPerformanceResponse>> list(@PathVariable UUID establishmentId,
                                                                     Authentication authentication) {
        return ResponseEntity.ok(operatorPerformanceService.listForEstablishment(currentUserId(authentication), establishmentId));
    }

    private UUID currentUserId(Authentication authentication) {
        Authentication resolved = authentication != null ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (resolved == null || resolved.getName() == null) {
            throw new IllegalStateException("Utilisateur authentifie introuvable");
        }
        return UUID.fromString(resolved.getName());
    }
}
