package com.aerixa.app.infrastructure.configuration.controller;

import com.aerixa.app.application.configuration.dto.CreateFunnelStageTransitionRequest;
import com.aerixa.app.application.configuration.dto.FunnelStageTransitionResponse;
import com.aerixa.app.application.configuration.dto.UpdateFunnelStageTransitionRequest;
import com.aerixa.app.application.configuration.service.FunnelStageTransitionService;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/funnel-stage-transitions")
@RequiredArgsConstructor
@Tag(name = "FunnelStageTransitions", description = "Gestion des transitions funnel")
@SecurityRequirement(name = "bearerAuth")
public class FunnelStageTransitionsController {

    private final FunnelStageTransitionService funnelStageTransitionService;

    @PostMapping
    @PreAuthorize("hasAuthority('funnel_stage_transitions:create')")
    @Operation(summary = "Creer une transition funnel")
    public ResponseEntity<FunnelStageTransitionResponse> create(@RequestBody CreateFunnelStageTransitionRequest request,
                                                                Authentication authentication,
                                                                HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(funnelStageTransitionService.create(currentUserId(authentication), request, resolveCorrelationId(httpRequest)));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('funnel_stage_transitions:list')")
    @Operation(summary = "Lister les transitions funnel")
    public ResponseEntity<List<FunnelStageTransitionResponse>> list(@RequestParam UUID establishmentId,
                                                                    Authentication authentication,
                                                                    HttpServletRequest httpRequest) {
        return ResponseEntity.ok(funnelStageTransitionService.list(currentUserId(authentication), establishmentId, resolveCorrelationId(httpRequest)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('funnel_stage_transitions:read')")
    @Operation(summary = "Lire une transition funnel")
    public ResponseEntity<FunnelStageTransitionResponse> getById(@PathVariable UUID id,
                                                                 @RequestParam UUID establishmentId,
                                                                 Authentication authentication,
                                                                 HttpServletRequest httpRequest) {
        return ResponseEntity.ok(funnelStageTransitionService.getById(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest)));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('funnel_stage_transitions:update')")
    @Operation(summary = "Mettre a jour une transition funnel")
    public ResponseEntity<FunnelStageTransitionResponse> update(@PathVariable UUID id,
                                                                @RequestParam UUID establishmentId,
                                                                @RequestBody UpdateFunnelStageTransitionRequest request,
                                                                Authentication authentication,
                                                                HttpServletRequest httpRequest) {
        return ResponseEntity.ok(funnelStageTransitionService.update(currentUserId(authentication), establishmentId, id, request, resolveCorrelationId(httpRequest)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('funnel_stage_transitions:delete')")
    @Operation(summary = "Supprimer une transition funnel")
    public ResponseEntity<Void> delete(@PathVariable UUID id,
                                       @RequestParam UUID establishmentId,
                                       Authentication authentication,
                                       HttpServletRequest httpRequest) {
        funnelStageTransitionService.delete(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/hard")
    @PreAuthorize("hasAuthority('funnel_stage_transitions:hard_delete')")
    @Operation(summary = "Supprimer definitivement une transition funnel (hard delete)")
    public ResponseEntity<Void> hardDelete(@PathVariable UUID id,
                                           @RequestParam UUID establishmentId,
                                           Authentication authentication,
                                           HttpServletRequest httpRequest) {
        funnelStageTransitionService.hardDelete(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAuthority('funnel_stage_transitions:activate')")
    @Operation(summary = "Activer une transition funnel")
    public ResponseEntity<FunnelStageTransitionResponse> activate(@PathVariable UUID id,
                                                                  @RequestParam UUID establishmentId,
                                                                  Authentication authentication,
                                                                  HttpServletRequest httpRequest) {
        return ResponseEntity.ok(funnelStageTransitionService.activate(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest)));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('funnel_stage_transitions:deactivate')")
    @Operation(summary = "Desactiver une transition funnel")
    public ResponseEntity<FunnelStageTransitionResponse> deactivate(@PathVariable UUID id,
                                                                    @RequestParam UUID establishmentId,
                                                                    Authentication authentication,
                                                                    HttpServletRequest httpRequest) {
        return ResponseEntity.ok(funnelStageTransitionService.deactivate(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest)));
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
