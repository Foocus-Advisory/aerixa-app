package com.aerixa.app.infrastructure.configuration.controller;

import com.aerixa.app.application.configuration.dto.CreateProgramTrackRequest;
import com.aerixa.app.application.configuration.dto.ProgramTrackImportResultResponse;
import com.aerixa.app.application.configuration.dto.ProgramTrackResponse;
import com.aerixa.app.application.configuration.dto.UpdateProgramTrackRequest;
import com.aerixa.app.application.configuration.service.ProgramTrackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/program-tracks")
@RequiredArgsConstructor
@Tag(name = "ProgramTracks", description = "Gestion des filieres")
@SecurityRequirement(name = "bearerAuth")
public class ProgramTracksController {

    private final ProgramTrackService programTrackService;

    @PostMapping
    @PreAuthorize("hasAuthority('program_tracks:create')")
    @Operation(summary = "Creer une filiere")
    public ResponseEntity<ProgramTrackResponse> create(@RequestBody CreateProgramTrackRequest request,
                                                       Authentication authentication,
                                                       HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(programTrackService.create(currentUserId(authentication), request, resolveCorrelationId(httpRequest)));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('program_tracks:list')")
    @Operation(summary = "Lister les filieres")
    public ResponseEntity<List<ProgramTrackResponse>> list(@RequestParam UUID establishmentId,
                                                           Authentication authentication,
                                                           HttpServletRequest httpRequest) {
        return ResponseEntity.ok(programTrackService.list(currentUserId(authentication), establishmentId, resolveCorrelationId(httpRequest)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('program_tracks:read')")
    @Operation(summary = "Lire une filiere")
    public ResponseEntity<ProgramTrackResponse> getById(@PathVariable UUID id,
                                                        @RequestParam UUID establishmentId,
                                                        Authentication authentication,
                                                        HttpServletRequest httpRequest) {
        return ResponseEntity.ok(programTrackService.getById(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest)));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('program_tracks:update')")
    @Operation(summary = "Mettre a jour une filiere")
    public ResponseEntity<ProgramTrackResponse> update(@PathVariable UUID id,
                                                       @RequestParam UUID establishmentId,
                                                       @RequestBody UpdateProgramTrackRequest request,
                                                       Authentication authentication,
                                                       HttpServletRequest httpRequest) {
        return ResponseEntity.ok(programTrackService.update(currentUserId(authentication), establishmentId, id, request, resolveCorrelationId(httpRequest)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('program_tracks:delete')")
    @Operation(summary = "Supprimer une filiere (soft delete)")
    public ResponseEntity<Void> delete(@PathVariable UUID id,
                                       @RequestParam UUID establishmentId,
                                       Authentication authentication,
                                       HttpServletRequest httpRequest) {
        programTrackService.delete(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/hard")
    @PreAuthorize("hasAuthority('program_tracks:hard_delete')")
    @Operation(summary = "Supprimer definitivement une filiere (hard delete)")
    public ResponseEntity<Void> hardDelete(@PathVariable UUID id,
                                           @RequestParam UUID establishmentId,
                                           Authentication authentication,
                                           HttpServletRequest httpRequest) {
        programTrackService.hardDelete(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAuthority('program_tracks:activate')")
    @Operation(summary = "Activer une filiere")
    public ResponseEntity<ProgramTrackResponse> activate(@PathVariable UUID id,
                                                         @RequestParam UUID establishmentId,
                                                         Authentication authentication,
                                                         HttpServletRequest httpRequest) {
        return ResponseEntity.ok(programTrackService.activate(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest)));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('program_tracks:deactivate')")
    @Operation(summary = "Desactiver une filiere")
    public ResponseEntity<ProgramTrackResponse> deactivate(@PathVariable UUID id,
                                                           @RequestParam UUID establishmentId,
                                                           Authentication authentication,
                                                           HttpServletRequest httpRequest) {
        return ResponseEntity.ok(programTrackService.deactivate(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest)));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('program_tracks:export')")
    @Operation(summary = "Exporter les filieres au format Excel")
    public ResponseEntity<byte[]> exportToExcel(@RequestParam UUID establishmentId,
                                                Authentication authentication,
                                                HttpServletRequest httpRequest) {
        byte[] data = programTrackService.exportToExcel(currentUserId(authentication), establishmentId, resolveCorrelationId(httpRequest));
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDisposition(ContentDisposition.attachment().filename("program-tracks.xlsx").build());
        return ResponseEntity.ok().headers(headers).body(data);
    }

    @GetMapping("/import-template")
    @PreAuthorize("hasAuthority('program_tracks:list')")
    @Operation(summary = "Telecharger le template d'import Excel")
    public ResponseEntity<byte[]> generateImportTemplate() {
        byte[] data = programTrackService.generateImportTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDisposition(ContentDisposition.attachment().filename("program-tracks-import-template.xlsx").build());
        return ResponseEntity.ok().headers(headers).body(data);
    }

    @PostMapping("/import")
    @PreAuthorize("hasAuthority('program_tracks:import')")
    @Operation(summary = "Importer des filieres depuis un fichier Excel")
    public ResponseEntity<ProgramTrackImportResultResponse> importFromExcel(@RequestParam UUID establishmentId,
                                                                             @RequestParam("file") MultipartFile file,
                                                                             Authentication authentication,
                                                                             HttpServletRequest httpRequest) {
        return ResponseEntity.ok(programTrackService.importFromExcel(
                currentUserId(authentication), establishmentId, file, resolveCorrelationId(httpRequest)));
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
