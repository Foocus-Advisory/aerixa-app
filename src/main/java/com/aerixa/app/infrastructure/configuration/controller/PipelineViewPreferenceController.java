package com.aerixa.app.infrastructure.configuration.controller;

import com.aerixa.app.application.configuration.dto.PipelineViewPreferenceResponse;
import com.aerixa.app.application.configuration.dto.UpdatePipelineViewPreferenceRequest;
import com.aerixa.app.application.configuration.service.UserPipelineViewPreferenceService;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pipeline-view-preference")
@RequiredArgsConstructor
@Tag(name = "PipelineViewPreference", description = "Gestion de la preference de vue pipeline utilisateur")
@SecurityRequirement(name = "bearerAuth")
public class PipelineViewPreferenceController {

    private final UserPipelineViewPreferenceService userPipelineViewPreferenceService;

    @GetMapping
    @PreAuthorize("hasAuthority('pipeline_view_preference:read')")
    @Operation(summary = "Lire la preference de vue pipeline")
    public ResponseEntity<PipelineViewPreferenceResponse> read(@RequestParam UUID establishmentId,
                                                               Authentication authentication,
                                                               HttpServletRequest httpRequest) {
        return ResponseEntity.ok(userPipelineViewPreferenceService.read(
                currentUserId(authentication), establishmentId, resolveCorrelationId(httpRequest)
        ));
    }

    @PutMapping
    @PreAuthorize("hasAuthority('pipeline_view_preference:update')")
    @Operation(summary = "Mettre a jour la preference de vue pipeline")
    public ResponseEntity<PipelineViewPreferenceResponse> update(@RequestBody UpdatePipelineViewPreferenceRequest request,
                                                                 Authentication authentication,
                                                                 HttpServletRequest httpRequest) {
        return ResponseEntity.ok(userPipelineViewPreferenceService.update(
                currentUserId(authentication), request, resolveCorrelationId(httpRequest)
        ));
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
