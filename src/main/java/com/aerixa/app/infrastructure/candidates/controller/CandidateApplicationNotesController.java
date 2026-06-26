package com.aerixa.app.infrastructure.candidates.controller;

import com.aerixa.app.application.candidates.dto.CandidateNoteResponse;
import com.aerixa.app.application.candidates.service.CandidateNoteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
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
 * Onglet Notes de la page de detail d'une candidature : les notes sont rattachees a la
 * {@code CandidateApplication} (decision actee), pas au candidat transverse.
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "CandidateApplicationNotes", description = "Notes de suivi d'une candidature")
@SecurityRequirement(name = "bearerAuth")
public class CandidateApplicationNotesController {

    private final CandidateNoteService candidateNoteService;

    @GetMapping("/api/v1/candidate-applications/{candidateApplicationId}/notes")
    @PreAuthorize("hasAuthority('candidate_notes:list')")
    @Operation(summary = "Lister les notes de suivi d'une candidature")
    public ResponseEntity<List<CandidateNoteResponse>> list(@PathVariable UUID candidateApplicationId,
                                                              @RequestParam UUID establishmentId,
                                                              Authentication authentication,
                                                              HttpServletRequest httpRequest) {
        return ResponseEntity.ok(candidateNoteService.listByApplication(currentUserId(authentication), establishmentId,
                candidateApplicationId, resolveCorrelationId(httpRequest)));
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
