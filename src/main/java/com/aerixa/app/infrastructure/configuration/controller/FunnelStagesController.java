package com.aerixa.app.infrastructure.configuration.controller;

import com.aerixa.app.application.configuration.dto.CreateFunnelStageRequest;
import com.aerixa.app.application.configuration.dto.FunnelStageImportResultResponse;
import com.aerixa.app.application.configuration.dto.FunnelStageResponse;
import com.aerixa.app.application.configuration.dto.UpdateFunnelStageRequest;
import com.aerixa.app.application.configuration.service.FunnelStageService;
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
@RequestMapping("/api/v1/funnel-stages")
@RequiredArgsConstructor
@Tag(name = "FunnelStages", description = "Gestion des etapes funnel")
@SecurityRequirement(name = "bearerAuth")
public class FunnelStagesController {

    private final FunnelStageService funnelStageService;

    @PostMapping
    @PreAuthorize("hasAuthority('funnel_stages:create')")
    @Operation(summary = "Creer une etape funnel")
    public ResponseEntity<FunnelStageResponse> create(@RequestBody CreateFunnelStageRequest request,
                                                      Authentication authentication,
                                                      HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(funnelStageService.create(currentUserId(authentication), request, resolveCorrelationId(httpRequest)));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('funnel_stages:list')")
    @Operation(summary = "Lister les etapes funnel")
    public ResponseEntity<List<FunnelStageResponse>> list(@RequestParam UUID establishmentId,
                                                          Authentication authentication,
                                                          HttpServletRequest httpRequest) {
        return ResponseEntity.ok(funnelStageService.list(currentUserId(authentication), establishmentId, resolveCorrelationId(httpRequest)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('funnel_stages:read')")
    @Operation(summary = "Lire une etape funnel")
    public ResponseEntity<FunnelStageResponse> getById(@PathVariable UUID id,
                                                       @RequestParam UUID establishmentId,
                                                       Authentication authentication,
                                                       HttpServletRequest httpRequest) {
        return ResponseEntity.ok(funnelStageService.getById(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest)));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('funnel_stages:update')")
    @Operation(summary = "Mettre a jour une etape funnel")
    public ResponseEntity<FunnelStageResponse> update(@PathVariable UUID id,
                                                      @RequestParam UUID establishmentId,
                                                      @RequestBody UpdateFunnelStageRequest request,
                                                      Authentication authentication,
                                                      HttpServletRequest httpRequest) {
        return ResponseEntity.ok(funnelStageService.update(currentUserId(authentication), establishmentId, id, request, resolveCorrelationId(httpRequest)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('funnel_stages:delete')")
    @Operation(summary = "Supprimer une etape funnel")
    public ResponseEntity<Void> delete(@PathVariable UUID id,
                                       @RequestParam UUID establishmentId,
                                       Authentication authentication,
                                       HttpServletRequest httpRequest) {
        funnelStageService.delete(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/hard")
    @PreAuthorize("hasAuthority('funnel_stages:hard_delete')")
    @Operation(summary = "Supprimer definitivement une etape funnel (hard delete)")
    public ResponseEntity<Void> hardDelete(@PathVariable UUID id,
                                           @RequestParam UUID establishmentId,
                                           Authentication authentication,
                                           HttpServletRequest httpRequest) {
        funnelStageService.hardDelete(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAuthority('funnel_stages:activate')")
    @Operation(summary = "Activer une etape funnel")
    public ResponseEntity<FunnelStageResponse> activate(@PathVariable UUID id,
                                                        @RequestParam UUID establishmentId,
                                                        Authentication authentication,
                                                        HttpServletRequest httpRequest) {
        return ResponseEntity.ok(funnelStageService.activate(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest)));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('funnel_stages:deactivate')")
    @Operation(summary = "Desactiver une etape funnel")
    public ResponseEntity<FunnelStageResponse> deactivate(@PathVariable UUID id,
                                                          @RequestParam UUID establishmentId,
                                                          Authentication authentication,
                                                          HttpServletRequest httpRequest) {
        return ResponseEntity.ok(funnelStageService.deactivate(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest)));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('funnel_stages:export')")
    @Operation(summary = "Exporter les etapes funnel au format Excel")
    public ResponseEntity<byte[]> exportToExcel(@RequestParam UUID establishmentId,
                                                Authentication authentication,
                                                HttpServletRequest httpRequest) {
        byte[] data = funnelStageService.exportToExcel(currentUserId(authentication), establishmentId, resolveCorrelationId(httpRequest));
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDisposition(ContentDisposition.attachment().filename("funnel-stages.xlsx").build());
        return ResponseEntity.ok().headers(headers).body(data);
    }

    @GetMapping("/import-template")
    @PreAuthorize("hasAuthority('funnel_stages:list')")
    @Operation(summary = "Telecharger le template d'import Excel")
    public ResponseEntity<byte[]> generateImportTemplate() {
        byte[] data = funnelStageService.generateImportTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDisposition(ContentDisposition.attachment().filename("funnel-stages-import-template.xlsx").build());
        return ResponseEntity.ok().headers(headers).body(data);
    }

    @PostMapping("/import")
    @PreAuthorize("hasAuthority('funnel_stages:import')")
    @Operation(summary = "Importer des etapes funnel depuis un fichier Excel")
    public ResponseEntity<FunnelStageImportResultResponse> importFromExcel(@RequestParam UUID establishmentId,
                                                                            @RequestParam("file") MultipartFile file,
                                                                            Authentication authentication,
                                                                            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(funnelStageService.importFromExcel(
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
