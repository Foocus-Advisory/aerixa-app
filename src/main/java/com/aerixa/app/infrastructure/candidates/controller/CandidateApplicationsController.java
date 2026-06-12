package com.aerixa.app.infrastructure.candidates.controller;

import com.aerixa.app.application.candidates.dto.CandidateApplicationResponse;
import com.aerixa.app.application.candidates.dto.CandidateApplicationStageHistoryResponse;
import com.aerixa.app.application.candidates.dto.CreateCandidateApplicationRequest;
import com.aerixa.app.application.candidates.dto.TransitionCandidateApplicationRequest;
import com.aerixa.app.application.candidates.service.CandidateApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Tag(name = "CandidateApplications", description = "Gestion des candidatures")
@SecurityRequirement(name = "bearerAuth")
public class CandidateApplicationsController {

    private final CandidateApplicationService candidateApplicationService;

    @PostMapping("/api/v1/candidates/{candidateId}/applications")
    @PreAuthorize("hasAuthority('candidate_applications:create')")
    @Operation(summary = "Creer une candidature pour un candidat")
    public ResponseEntity<CandidateApplicationResponse> create(@PathVariable UUID candidateId,
                                                                 @RequestBody CreateCandidateApplicationRequest request,
                                                                 Authentication authentication,
                                                                 HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(candidateApplicationService.create(currentUserId(authentication), candidateId, request, resolveCorrelationId(httpRequest)));
    }

    @GetMapping("/api/v1/candidates/{candidateId}/applications")
    @PreAuthorize("hasAuthority('candidate_applications:list')")
    @Operation(summary = "Lister les candidatures d'un candidat")
    public ResponseEntity<List<CandidateApplicationResponse>> list(@PathVariable UUID candidateId,
                                                                     @RequestParam UUID establishmentId,
                                                                     Authentication authentication,
                                                                     HttpServletRequest httpRequest) {
        return ResponseEntity.ok(candidateApplicationService.list(currentUserId(authentication), establishmentId, candidateId, resolveCorrelationId(httpRequest)));
    }

    @GetMapping("/api/v1/candidate-applications/{id}")
    @PreAuthorize("hasAuthority('candidate_applications:read')")
    @Operation(summary = "Lire une candidature")
    public ResponseEntity<CandidateApplicationResponse> getById(@PathVariable UUID id,
                                                                  @RequestParam UUID establishmentId,
                                                                  Authentication authentication,
                                                                  HttpServletRequest httpRequest) {
        return ResponseEntity.ok(candidateApplicationService.getById(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest)));
    }

    @PostMapping("/api/v1/candidate-applications/{id}/transitions")
    @PreAuthorize("hasAuthority('candidate_applications:transition')")
    @Operation(summary = "Faire transiter une candidature dans le funnel")
    public ResponseEntity<CandidateApplicationResponse> transition(@PathVariable UUID id,
                                                                     @RequestBody TransitionCandidateApplicationRequest request,
                                                                     Authentication authentication,
                                                                     HttpServletRequest httpRequest) {
        UUID establishmentId = request != null ? request.getEstablishmentId() : null;
        return ResponseEntity.ok(candidateApplicationService.transition(
                currentUserId(authentication), establishmentId, id, request, resolveCorrelationId(httpRequest)));
    }

    @GetMapping("/api/v1/candidate-applications/{id}/history")
    @PreAuthorize("hasAuthority('candidate_applications:history')")
    @Operation(summary = "Consulter l'historique des etapes d'une candidature")
    public ResponseEntity<List<CandidateApplicationStageHistoryResponse>> history(@PathVariable UUID id,
                                                                                    @RequestParam UUID establishmentId,
                                                                                    Authentication authentication,
                                                                                    HttpServletRequest httpRequest) {
        return ResponseEntity.ok(candidateApplicationService.history(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest)));
    }

    private UUID currentUserId(Authentication authentication) {
        Authentication resolved = authentication != null ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (resolved == null || resolved.getName() == null) {
            throw new IllegalStateException("Utilisateur authentifie introuvable");
        }
        return UUID.fromString(resolved.getName());
    }

    private String resolveCorrelationId(HttpServletRequest request) {
        String correlationId = request.getHeader("X-Correlation-ID");
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = request.getHeader("X-Request-ID");
        }
        return (correlationId == null || correlationId.isBlank()) ? UUID.randomUUID().toString() : correlationId.trim();
    }
}
