package com.aerixa.app.infrastructure.candidates.controller;

import com.aerixa.app.application.auth.dto.PagedResponse;
import com.aerixa.app.application.candidates.dto.CandidateImportResultResponse;
import com.aerixa.app.application.candidates.dto.CandidateResponse;
import com.aerixa.app.application.candidates.dto.CreateCandidateRequest;
import com.aerixa.app.application.candidates.dto.EligibleProgramTrackLevelResponse;
import com.aerixa.app.application.candidates.dto.UpdateCandidateRequest;
import com.aerixa.app.application.candidates.service.CandidateService;
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
@RequestMapping("/api/v1/candidates")
@RequiredArgsConstructor
@Tag(name = "Candidates", description = "Gestion des candidats")
@SecurityRequirement(name = "bearerAuth")
public class CandidatesController {

    private final CandidateService candidateService;

    @PostMapping
    @PreAuthorize("hasAuthority('candidates:create')")
    @Operation(summary = "Creer un candidat")
    public ResponseEntity<CandidateResponse> create(@RequestBody CreateCandidateRequest request,
                                                     Authentication authentication,
                                                     HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(candidateService.create(currentUserId(authentication), request, resolveCorrelationId(httpRequest)));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('candidates:list')")
    @Operation(summary = "Lister les candidats (pagine)")
    public ResponseEntity<PagedResponse<CandidateResponse>> list(@RequestParam UUID establishmentId,
                                                                   @RequestParam(defaultValue = "0") int page,
                                                                   @RequestParam(defaultValue = "20") int size,
                                                                   @RequestParam(defaultValue = "createdAt") String sortBy,
                                                                   @RequestParam(defaultValue = "desc") String direction,
                                                                   @RequestParam(required = false) String search,
                                                                   @RequestParam(required = false) String status,
                                                                   Authentication authentication,
                                                                   HttpServletRequest httpRequest) {
        return ResponseEntity.ok(candidateService.listPaged(currentUserId(authentication), establishmentId,
                page, size, sortBy, direction, search, status, resolveCorrelationId(httpRequest)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('candidates:read')")
    @Operation(summary = "Lire un candidat")
    public ResponseEntity<CandidateResponse> getById(@PathVariable UUID id,
                                                      @RequestParam UUID establishmentId,
                                                      Authentication authentication,
                                                      HttpServletRequest httpRequest) {
        return ResponseEntity.ok(candidateService.getById(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest)));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('candidates:update')")
    @Operation(summary = "Mettre a jour un candidat")
    public ResponseEntity<CandidateResponse> update(@PathVariable UUID id,
                                                     @RequestParam UUID establishmentId,
                                                     @RequestBody UpdateCandidateRequest request,
                                                     Authentication authentication,
                                                     HttpServletRequest httpRequest) {
        return ResponseEntity.ok(candidateService.update(currentUserId(authentication), establishmentId, id, request, resolveCorrelationId(httpRequest)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('candidates:delete')")
    @Operation(summary = "Supprimer un candidat")
    public ResponseEntity<Void> delete(@PathVariable UUID id,
                                        @RequestParam UUID establishmentId,
                                        Authentication authentication,
                                        HttpServletRequest httpRequest) {
        candidateService.delete(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/hard")
    @PreAuthorize("hasAuthority('candidates:hard_delete')")
    @Operation(summary = "Supprimer definitivement un candidat (hard delete)")
    public ResponseEntity<Void> hardDelete(@PathVariable UUID id,
                                            @RequestParam UUID establishmentId,
                                            Authentication authentication,
                                            HttpServletRequest httpRequest) {
        candidateService.hardDelete(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAuthority('candidates:activate')")
    @Operation(summary = "Reactiver un candidat")
    public ResponseEntity<CandidateResponse> activate(@PathVariable UUID id,
                                                       @RequestParam UUID establishmentId,
                                                       Authentication authentication,
                                                       HttpServletRequest httpRequest) {
        return ResponseEntity.ok(candidateService.activate(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest)));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('candidates:deactivate')")
    @Operation(summary = "Archiver un candidat")
    public ResponseEntity<CandidateResponse> deactivate(@PathVariable UUID id,
                                                         @RequestParam UUID establishmentId,
                                                         Authentication authentication,
                                                         HttpServletRequest httpRequest) {
        return ResponseEntity.ok(candidateService.deactivate(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest)));
    }

    @GetMapping("/{id}/eligible-program-track-levels")
    @PreAuthorize("hasAuthority('candidates:read')")
    @Operation(summary = "Lister les couples filiere/niveau eligibles pour ce candidat")
    public ResponseEntity<List<EligibleProgramTrackLevelResponse>> listEligibleProgramTrackLevels(
            @PathVariable UUID id,
            @RequestParam UUID establishmentId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(candidateService.listEligibleProgramTrackLevels(
                currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest)));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('candidates:export')")
    @Operation(summary = "Exporter les candidats en Excel")
    public ResponseEntity<byte[]> exportToExcel(@RequestParam UUID establishmentId,
                                                 Authentication authentication,
                                                 HttpServletRequest httpRequest) {
        byte[] data = candidateService.exportToExcel(currentUserId(authentication), establishmentId, resolveCorrelationId(httpRequest));
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDisposition(ContentDisposition.attachment().filename("candidates.xlsx").build());
        return ResponseEntity.ok().headers(headers).body(data);
    }

    @GetMapping("/import-template")
    @PreAuthorize("hasAuthority('candidates:list')")
    @Operation(summary = "Telecharger le template d'import des candidats")
    public ResponseEntity<byte[]> generateImportTemplate() {
        byte[] data = candidateService.generateImportTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDisposition(ContentDisposition.attachment().filename("candidates-import-template.xlsx").build());
        return ResponseEntity.ok().headers(headers).body(data);
    }

    @PostMapping("/import")
    @PreAuthorize("hasAuthority('candidates:import')")
    @Operation(summary = "Importer des candidats depuis un fichier Excel")
    public ResponseEntity<CandidateImportResultResponse> importFromExcel(@RequestParam UUID establishmentId,
                                                                           @RequestParam("file") MultipartFile file,
                                                                           Authentication authentication,
                                                                           HttpServletRequest httpRequest) {
        return ResponseEntity.ok(candidateService.importFromExcel(
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
