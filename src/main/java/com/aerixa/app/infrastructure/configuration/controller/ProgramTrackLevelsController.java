package com.aerixa.app.infrastructure.configuration.controller;

import com.aerixa.app.application.configuration.dto.CreateProgramTrackLevelRequest;
import com.aerixa.app.application.configuration.dto.ProgramTrackLevelResponse;
import com.aerixa.app.application.configuration.dto.UpdateProgramTrackLevelRequest;
import com.aerixa.app.application.configuration.service.ProgramTrackLevelService;
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
@RequestMapping("/api/v1/program-track-levels")
@RequiredArgsConstructor
@Tag(name = "ProgramTrackLevels", description = "Gestion des associations filiere-niveau")
@SecurityRequirement(name = "bearerAuth")
public class ProgramTrackLevelsController {

    private final ProgramTrackLevelService programTrackLevelService;

    @PostMapping
    @PreAuthorize("hasAuthority('program_track_levels:create')")
    @Operation(summary = "Creer une association filiere-niveau")
    public ResponseEntity<ProgramTrackLevelResponse> create(@RequestBody CreateProgramTrackLevelRequest request,
                                                            Authentication authentication,
                                                            HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(programTrackLevelService.create(currentUserId(authentication), request, resolveCorrelationId(httpRequest)));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('program_track_levels:list')")
    @Operation(summary = "Lister les associations filiere-niveau")
    public ResponseEntity<List<ProgramTrackLevelResponse>> list(@RequestParam UUID establishmentId,
                                                                Authentication authentication,
                                                                HttpServletRequest httpRequest) {
        return ResponseEntity.ok(programTrackLevelService.list(currentUserId(authentication), establishmentId, resolveCorrelationId(httpRequest)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('program_track_levels:read')")
    @Operation(summary = "Lire une association filiere-niveau")
    public ResponseEntity<ProgramTrackLevelResponse> getById(@PathVariable UUID id,
                                                             @RequestParam UUID establishmentId,
                                                             Authentication authentication,
                                                             HttpServletRequest httpRequest) {
        return ResponseEntity.ok(programTrackLevelService.getById(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest)));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('program_track_levels:update')")
    @Operation(summary = "Mettre a jour une association filiere-niveau")
    public ResponseEntity<ProgramTrackLevelResponse> update(@PathVariable UUID id,
                                                            @RequestParam UUID establishmentId,
                                                            @RequestBody UpdateProgramTrackLevelRequest request,
                                                            Authentication authentication,
                                                            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(programTrackLevelService.update(currentUserId(authentication), establishmentId, id, request, resolveCorrelationId(httpRequest)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('program_track_levels:delete')")
    @Operation(summary = "Supprimer une association filiere-niveau")
    public ResponseEntity<Void> delete(@PathVariable UUID id,
                                       @RequestParam UUID establishmentId,
                                       Authentication authentication,
                                       HttpServletRequest httpRequest) {
        programTrackLevelService.delete(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAuthority('program_track_levels:activate')")
    @Operation(summary = "Ouvrir une association filiere-niveau")
    public ResponseEntity<ProgramTrackLevelResponse> activate(@PathVariable UUID id,
                                                              @RequestParam UUID establishmentId,
                                                              Authentication authentication,
                                                              HttpServletRequest httpRequest) {
        return ResponseEntity.ok(programTrackLevelService.activate(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest)));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('program_track_levels:deactivate')")
    @Operation(summary = "Fermer une association filiere-niveau")
    public ResponseEntity<ProgramTrackLevelResponse> deactivate(@PathVariable UUID id,
                                                                @RequestParam UUID establishmentId,
                                                                Authentication authentication,
                                                                HttpServletRequest httpRequest) {
        return ResponseEntity.ok(programTrackLevelService.deactivate(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest)));
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
