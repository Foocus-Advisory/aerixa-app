package com.aerixa.app.infrastructure.configuration.controller;

import com.aerixa.app.application.configuration.dto.AcquisitionChannelImportResultResponse;
import com.aerixa.app.application.configuration.dto.AcquisitionChannelResponse;
import com.aerixa.app.application.configuration.dto.CreateAcquisitionChannelRequest;
import com.aerixa.app.application.configuration.dto.UpdateAcquisitionChannelRequest;
import com.aerixa.app.application.configuration.service.AcquisitionChannelService;
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
@RequestMapping("/api/v1/acquisition-channels")
@RequiredArgsConstructor
@Tag(name = "AcquisitionChannels", description = "Gestion des canaux d'acquisition")
@SecurityRequirement(name = "bearerAuth")
public class AcquisitionChannelsController {

    private final AcquisitionChannelService acquisitionChannelService;

    @PostMapping
    @PreAuthorize("hasAuthority('acquisition_channels:create')")
    @Operation(summary = "Creer un canal d'acquisition")
    public ResponseEntity<AcquisitionChannelResponse> create(@RequestBody CreateAcquisitionChannelRequest request,
                                                             Authentication authentication,
                                                             HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(acquisitionChannelService.create(currentUserId(authentication), request, resolveCorrelationId(httpRequest)));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('acquisition_channels:list')")
    @Operation(summary = "Lister les canaux d'acquisition")
    public ResponseEntity<List<AcquisitionChannelResponse>> list(@RequestParam UUID establishmentId,
                                                                 Authentication authentication,
                                                                 HttpServletRequest httpRequest) {
        return ResponseEntity.ok(acquisitionChannelService.list(currentUserId(authentication), establishmentId, resolveCorrelationId(httpRequest)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('acquisition_channels:read')")
    @Operation(summary = "Lire un canal d'acquisition")
    public ResponseEntity<AcquisitionChannelResponse> getById(@PathVariable UUID id,
                                                              @RequestParam UUID establishmentId,
                                                              Authentication authentication,
                                                              HttpServletRequest httpRequest) {
        return ResponseEntity.ok(acquisitionChannelService.getById(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest)));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('acquisition_channels:update')")
    @Operation(summary = "Mettre a jour un canal d'acquisition")
    public ResponseEntity<AcquisitionChannelResponse> update(@PathVariable UUID id,
                                                             @RequestParam UUID establishmentId,
                                                             @RequestBody UpdateAcquisitionChannelRequest request,
                                                             Authentication authentication,
                                                             HttpServletRequest httpRequest) {
        return ResponseEntity.ok(acquisitionChannelService.update(currentUserId(authentication), establishmentId, id, request, resolveCorrelationId(httpRequest)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('acquisition_channels:delete')")
    @Operation(summary = "Supprimer un canal d'acquisition")
    public ResponseEntity<Void> delete(@PathVariable UUID id,
                                       @RequestParam UUID establishmentId,
                                       Authentication authentication,
                                       HttpServletRequest httpRequest) {
        acquisitionChannelService.delete(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/hard")
    @PreAuthorize("hasAuthority('acquisition_channels:hard_delete')")
    @Operation(summary = "Supprimer definitivement un canal d'acquisition (hard delete)")
    public ResponseEntity<Void> hardDelete(@PathVariable UUID id,
                                           @RequestParam UUID establishmentId,
                                           Authentication authentication,
                                           HttpServletRequest httpRequest) {
        acquisitionChannelService.hardDelete(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAuthority('acquisition_channels:activate')")
    @Operation(summary = "Activer un canal d'acquisition")
    public ResponseEntity<AcquisitionChannelResponse> activate(@PathVariable UUID id,
                                                               @RequestParam UUID establishmentId,
                                                               Authentication authentication,
                                                               HttpServletRequest httpRequest) {
        return ResponseEntity.ok(acquisitionChannelService.activate(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest)));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('acquisition_channels:deactivate')")
    @Operation(summary = "Desactiver un canal d'acquisition")
    public ResponseEntity<AcquisitionChannelResponse> deactivate(@PathVariable UUID id,
                                                                 @RequestParam UUID establishmentId,
                                                                 Authentication authentication,
                                                                 HttpServletRequest httpRequest) {
        return ResponseEntity.ok(acquisitionChannelService.deactivate(currentUserId(authentication), establishmentId, id, resolveCorrelationId(httpRequest)));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('acquisition_channels:export')")
    @Operation(summary = "Exporter les canaux d'acquisition au format Excel")
    public ResponseEntity<byte[]> exportToExcel(@RequestParam UUID establishmentId,
                                                Authentication authentication,
                                                HttpServletRequest httpRequest) {
        byte[] data = acquisitionChannelService.exportToExcel(currentUserId(authentication), establishmentId, resolveCorrelationId(httpRequest));
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDisposition(ContentDisposition.attachment().filename("acquisition-channels.xlsx").build());
        return ResponseEntity.ok().headers(headers).body(data);
    }

    @GetMapping("/import-template")
    @PreAuthorize("hasAuthority('acquisition_channels:list')")
    @Operation(summary = "Telecharger le template d'import Excel")
    public ResponseEntity<byte[]> generateImportTemplate() {
        byte[] data = acquisitionChannelService.generateImportTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDisposition(ContentDisposition.attachment().filename("acquisition-channels-import-template.xlsx").build());
        return ResponseEntity.ok().headers(headers).body(data);
    }

    @PostMapping("/import")
    @PreAuthorize("hasAuthority('acquisition_channels:import')")
    @Operation(summary = "Importer des canaux d'acquisition depuis un fichier Excel")
    public ResponseEntity<AcquisitionChannelImportResultResponse> importFromExcel(@RequestParam UUID establishmentId,
                                                                                    @RequestParam("file") MultipartFile file,
                                                                                    Authentication authentication,
                                                                                    HttpServletRequest httpRequest) {
        return ResponseEntity.ok(acquisitionChannelService.importFromExcel(
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
