package com.aerixa.app.infrastructure.configuration.controller;

import com.aerixa.app.application.configuration.dto.CreateEntryDiplomaRequest;
import com.aerixa.app.application.configuration.dto.EntryDiplomaImportResultResponse;
import com.aerixa.app.application.configuration.dto.EntryDiplomaResponse;
import com.aerixa.app.application.configuration.dto.UpdateEntryDiplomaRequest;
import com.aerixa.app.application.configuration.service.EntryDiplomaService;
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
@RequestMapping("/api/v1/entry-diplomas")
@RequiredArgsConstructor
@Tag(name = "EntryDiplomas", description = "Gestion des diplomes d'entree")
@SecurityRequirement(name = "bearerAuth")
public class EntryDiplomasController {

    private final EntryDiplomaService entryDiplomaService;

    @PostMapping
    @PreAuthorize("hasAuthority('entry_diplomas:create')")
    @Operation(summary = "Creer un diplome d'entree")
    public ResponseEntity<EntryDiplomaResponse> create(
            @RequestBody CreateEntryDiplomaRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(entryDiplomaService.create(actorId, request, correlationId));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('entry_diplomas:list')")
    @Operation(summary = "Lister les diplomes d'entree")
    public ResponseEntity<List<EntryDiplomaResponse>> list(
            @RequestParam UUID establishmentId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.ok(entryDiplomaService.list(actorId, establishmentId, correlationId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('entry_diplomas:read')")
    @Operation(summary = "Lire un diplome d'entree")
    public ResponseEntity<EntryDiplomaResponse> getById(
            @PathVariable UUID id,
            @RequestParam UUID establishmentId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.ok(entryDiplomaService.getById(actorId, establishmentId, id, correlationId));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('entry_diplomas:update')")
    @Operation(summary = "Mettre a jour un diplome d'entree")
    public ResponseEntity<EntryDiplomaResponse> update(
            @PathVariable UUID id,
            @RequestParam UUID establishmentId,
            @RequestBody UpdateEntryDiplomaRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.ok(entryDiplomaService.update(actorId, establishmentId, id, request, correlationId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('entry_diplomas:delete')")
    @Operation(summary = "Supprimer un diplome d'entree")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @RequestParam UUID establishmentId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        entryDiplomaService.delete(actorId, establishmentId, id, correlationId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAuthority('entry_diplomas:activate')")
    @Operation(summary = "Activer un diplome d'entree")
    public ResponseEntity<EntryDiplomaResponse> activate(
            @PathVariable UUID id,
            @RequestParam UUID establishmentId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.ok(entryDiplomaService.activate(actorId, establishmentId, id, correlationId));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('entry_diplomas:deactivate')")
    @Operation(summary = "Desactiver un diplome d'entree")
    public ResponseEntity<EntryDiplomaResponse> deactivate(
            @PathVariable UUID id,
            @RequestParam UUID establishmentId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.ok(entryDiplomaService.deactivate(actorId, establishmentId, id, correlationId));
    }

    @DeleteMapping("/{id}/hard-delete")
    @PreAuthorize("hasAuthority('entry_diplomas:hard_delete')")
    @Operation(summary = "Supprimer definitivement un diplome d'entree")
    public ResponseEntity<Void> hardDelete(
            @PathVariable UUID id,
            @RequestParam UUID establishmentId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        entryDiplomaService.hardDelete(actorId, establishmentId, id, correlationId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('entry_diplomas:export')")
    @Operation(summary = "Exporter les diplomes d'entree en Excel")
    public ResponseEntity<byte[]> export(
            @RequestParam UUID establishmentId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        byte[] bytes = entryDiplomaService.exportToExcel(actorId, establishmentId, correlationId);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDisposition(ContentDisposition.attachment().filename("entry-diplomas-export.xlsx").build());
        return ResponseEntity.ok().headers(headers).body(bytes);
    }

    @GetMapping("/import-template")
    @PreAuthorize("hasAuthority('entry_diplomas:list')")
    @Operation(summary = "Telecharger le template d'import Excel")
    public ResponseEntity<byte[]> importTemplate(
            Authentication authentication,
            HttpServletRequest httpRequest) {
        byte[] bytes = entryDiplomaService.generateImportTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDisposition(ContentDisposition.attachment().filename("entry-diplomas-import-template.xlsx").build());
        return ResponseEntity.ok().headers(headers).body(bytes);
    }

    @PostMapping("/import")
    @PreAuthorize("hasAuthority('entry_diplomas:import')")
    @Operation(summary = "Importer des diplomes d'entree depuis un fichier Excel")
    public ResponseEntity<EntryDiplomaImportResultResponse> importFromExcel(
            @RequestParam UUID establishmentId,
            @RequestParam("file") MultipartFile file,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.ok(entryDiplomaService.importFromExcel(actorId, establishmentId, file, correlationId));
    }

    private String resolveCorrelationId(HttpServletRequest request) {
        String correlationId = request.getHeader("X-Correlation-ID");
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = request.getHeader("X-Request-ID");
        }
        return (correlationId == null || correlationId.isBlank()) ? UUID.randomUUID().toString() : correlationId.trim();
    }

    private UUID currentUserId(Authentication authentication) {
        Authentication resolved = authentication != null ? authentication : SecurityContextHolder.getContext().getAuthentication();
        if (resolved == null || resolved.getName() == null) {
            throw new IllegalStateException("Utilisateur authentifie introuvable");
        }
        return UUID.fromString(resolved.getName());
    }
}
