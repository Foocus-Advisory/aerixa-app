package com.aerixa.app.infrastructure.candidates.controller;

import com.aerixa.app.application.candidates.dto.CandidateNoteResponse;
import com.aerixa.app.application.candidates.dto.CreateCandidateNoteRequest;
import com.aerixa.app.application.candidates.service.CandidateNoteService;
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
@RequestMapping("/api/v1/candidates/{candidateId}/notes")
@RequiredArgsConstructor
@Tag(name = "CandidateNotes", description = "Notes et historique candidat")
@SecurityRequirement(name = "bearerAuth")
public class CandidateNotesController {

    private final CandidateNoteService candidateNoteService;

    @PostMapping
    @PreAuthorize("hasAuthority('candidate_notes:create')")
    @Operation(summary = "Creer une note pour un candidat")
    public ResponseEntity<CandidateNoteResponse> create(@PathVariable UUID candidateId,
                                                         @RequestBody CreateCandidateNoteRequest request,
                                                         Authentication authentication,
                                                         HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(candidateNoteService.create(currentUserId(authentication), candidateId, request, resolveCorrelationId(httpRequest)));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('candidate_notes:list')")
    @Operation(summary = "Lister les notes d'un candidat")
    public ResponseEntity<List<CandidateNoteResponse>> list(@PathVariable UUID candidateId,
                                                             @RequestParam UUID establishmentId,
                                                             Authentication authentication,
                                                             HttpServletRequest httpRequest) {
        return ResponseEntity.ok(candidateNoteService.list(currentUserId(authentication), establishmentId, candidateId, resolveCorrelationId(httpRequest)));
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
