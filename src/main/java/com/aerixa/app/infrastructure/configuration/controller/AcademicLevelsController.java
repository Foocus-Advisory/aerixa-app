package com.aerixa.app.infrastructure.configuration.controller;

import com.aerixa.app.application.configuration.dto.AcademicLevelImportResultResponse;
import com.aerixa.app.application.configuration.dto.AcademicLevelResponse;
import com.aerixa.app.application.configuration.dto.CreateAcademicLevelRequest;
import com.aerixa.app.application.configuration.dto.EntryDiplomaResponse;
import com.aerixa.app.application.configuration.dto.UpdateAcademicLevelRequest;
import com.aerixa.app.application.configuration.service.AcademicLevelService;
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
@RequestMapping("/api/v1/academic-levels")
@RequiredArgsConstructor
@Tag(name = "AcademicLevels", description = "Gestion des niveaux academiques")
@SecurityRequirement(name = "bearerAuth")
public class AcademicLevelsController {

    private final AcademicLevelService academicLevelService;

    @PostMapping
    @PreAuthorize("hasAuthority('academic_levels:create')")
    @Operation(summary = "Creer un niveau academique")
    public ResponseEntity<AcademicLevelResponse> create(
            @RequestBody CreateAcademicLevelRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(academicLevelService.create(actorId, request, correlationId));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('academic_levels:list')")
    @Operation(summary = "Lister les niveaux academiques")
    public ResponseEntity<List<AcademicLevelResponse>> list(
            @RequestParam UUID establishmentId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.ok(academicLevelService.list(actorId, establishmentId, correlationId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('academic_levels:read')")
    @Operation(summary = "Lire un niveau academique")
    public ResponseEntity<AcademicLevelResponse> getById(
            @PathVariable UUID id,
            @RequestParam UUID establishmentId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.ok(academicLevelService.getById(actorId, establishmentId, id, correlationId));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('academic_levels:update')")
    @Operation(summary = "Mettre a jour un niveau academique")
    public ResponseEntity<AcademicLevelResponse> update(
            @PathVariable UUID id,
            @RequestParam UUID establishmentId,
            @RequestBody UpdateAcademicLevelRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.ok(academicLevelService.update(actorId, establishmentId, id, request, correlationId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('academic_levels:delete')")
    @Operation(summary = "Supprimer un niveau academique (soft delete)")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @RequestParam UUID establishmentId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        academicLevelService.delete(actorId, establishmentId, id, correlationId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/hard-delete")
    @PreAuthorize("hasAuthority('academic_levels:hard_delete')")
    @Operation(summary = "Supprimer definitivement un niveau academique")
    public ResponseEntity<Void> hardDelete(
            @PathVariable UUID id,
            @RequestParam UUID establishmentId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        academicLevelService.hardDelete(actorId, establishmentId, id, correlationId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAuthority('academic_levels:activate')")
    @Operation(summary = "Activer un niveau academique")
    public ResponseEntity<AcademicLevelResponse> activate(
            @PathVariable UUID id,
            @RequestParam UUID establishmentId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.ok(academicLevelService.activate(actorId, establishmentId, id, correlationId));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('academic_levels:deactivate')")
    @Operation(summary = "Desactiver un niveau academique")
    public ResponseEntity<AcademicLevelResponse> deactivate(
            @PathVariable UUID id,
            @RequestParam UUID establishmentId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.ok(academicLevelService.deactivate(actorId, establishmentId, id, correlationId));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('academic_levels:export')")
    @Operation(summary = "Exporter les niveaux academiques en Excel")
    public ResponseEntity<byte[]> export(
            @RequestParam UUID establishmentId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        byte[] bytes = academicLevelService.exportToExcel(actorId, establishmentId, correlationId);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDisposition(ContentDisposition.attachment().filename("academic-levels-export.xlsx").build());
        return ResponseEntity.ok().headers(headers).body(bytes);
    }

    @GetMapping("/import-template")
    @PreAuthorize("hasAuthority('academic_levels:list')")
    @Operation(summary = "Telecharger le template d'import Excel")
    public ResponseEntity<byte[]> importTemplate(
            Authentication authentication,
            HttpServletRequest httpRequest) {
        byte[] bytes = academicLevelService.generateImportTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDisposition(ContentDisposition.attachment().filename("academic-levels-import-template.xlsx").build());
        return ResponseEntity.ok().headers(headers).body(bytes);
    }

    @PostMapping("/import")
    @PreAuthorize("hasAuthority('academic_levels:import')")
    @Operation(summary = "Importer des niveaux academiques depuis un fichier Excel")
    public ResponseEntity<AcademicLevelImportResultResponse> importFromExcel(
            @RequestParam UUID establishmentId,
            @RequestParam("file") MultipartFile file,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.ok(academicLevelService.importFromExcel(actorId, establishmentId, file, correlationId));
    }

    @GetMapping("/{id}/entry-diplomas")
    @PreAuthorize("hasAuthority('academic_levels:read')")
    @Operation(summary = "Lister les diplomes d'entree associes a un niveau academique")
    public ResponseEntity<List<EntryDiplomaResponse>> listEntryDiplomas(
            @PathVariable UUID id,
            @RequestParam UUID establishmentId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.ok(academicLevelService.listEntryDiplomas(actorId, establishmentId, id, correlationId));
    }

    @PostMapping("/{id}/entry-diplomas/{entryDiplomaId}")
    @PreAuthorize("hasAuthority('academic_levels:attach_entry_diploma')")
    @Operation(summary = "Associer un diplome d'entree a un niveau academique")
    public ResponseEntity<Void> attachEntryDiploma(
            @PathVariable UUID id,
            @PathVariable UUID entryDiplomaId,
            @RequestParam UUID establishmentId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        academicLevelService.attachEntryDiploma(actorId, establishmentId, id, entryDiplomaId, correlationId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/entry-diplomas/{entryDiplomaId}")
    @PreAuthorize("hasAuthority('academic_levels:detach_entry_diploma')")
    @Operation(summary = "Desassocier un diplome d'entree d'un niveau academique")
    public ResponseEntity<Void> detachEntryDiploma(
            @PathVariable UUID id,
            @PathVariable UUID entryDiplomaId,
            @RequestParam UUID establishmentId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        academicLevelService.detachEntryDiploma(actorId, establishmentId, id, entryDiplomaId, correlationId);
        return ResponseEntity.noContent().build();
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
