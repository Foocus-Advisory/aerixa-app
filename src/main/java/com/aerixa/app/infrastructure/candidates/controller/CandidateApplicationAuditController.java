package com.aerixa.app.infrastructure.candidates.controller;

import com.aerixa.app.application.candidates.dto.CandidateApplicationAuditEntryResponse;
import com.aerixa.app.application.candidates.service.CandidateApplicationAuditService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Onglet Audit de la page de detail d'une candidature : activite agregee (notes, pieces
 * jointes) reconstituee depuis le journal d'audit generique.
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "CandidateApplicationAudit", description = "Audit agrege d'une candidature")
@SecurityRequirement(name = "bearerAuth")
public class CandidateApplicationAuditController {

    private final CandidateApplicationAuditService candidateApplicationAuditService;

    @GetMapping("/api/v1/candidate-applications/{candidateApplicationId}/audit")
    @PreAuthorize("hasAuthority('candidate_application_audit:read')")
    @Operation(summary = "Consulter l'audit agrege d'une candidature")
    public ResponseEntity<List<CandidateApplicationAuditEntryResponse>> list(@PathVariable UUID candidateApplicationId,
                                                                              @RequestParam UUID establishmentId,
                                                                              Authentication authentication) {
        return ResponseEntity.ok(candidateApplicationAuditService.listByApplication(currentUserId(authentication), establishmentId,
                candidateApplicationId));
    }

    private UUID currentUserId(Authentication authentication) {
        Authentication resolved = authentication != null ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (resolved == null || resolved.getName() == null) {
            throw new IllegalStateException("Utilisateur authentifie introuvable");
        }
        return UUID.fromString(resolved.getName());
    }
}
