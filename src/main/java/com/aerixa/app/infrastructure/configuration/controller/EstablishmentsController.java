package com.aerixa.app.infrastructure.configuration.controller;

import com.aerixa.app.application.configuration.dto.CreateEstablishmentRequest;
import com.aerixa.app.application.configuration.dto.EstablishmentResponse;
import com.aerixa.app.application.configuration.dto.UpdateEstablishmentRequest;
import com.aerixa.app.application.configuration.service.EstablishmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
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
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/establishments")
@RequiredArgsConstructor
@Tag(name = "Establishments", description = "Gestion des etablissements")
@SecurityRequirement(name = "bearerAuth")
public class EstablishmentsController {

    private final EstablishmentService establishmentService;

    @PostMapping
    @PreAuthorize("hasAuthority('establishments:create')")
    @Operation(summary = "Creer un etablissement")
    public ResponseEntity<EstablishmentResponse> createEstablishment(
            @RequestBody CreateEstablishmentRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        EstablishmentResponse created = establishmentService.createEstablishment(actorId, request, correlationId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('establishments:list')")
    @Operation(summary = "Lister les etablissements")
    public ResponseEntity<List<EstablishmentResponse>> listEstablishments(
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.ok(establishmentService.listEstablishments(actorId, correlationId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('establishments:read')")
    @Operation(summary = "Lire un etablissement")
    public ResponseEntity<EstablishmentResponse> getEstablishment(
            @PathVariable UUID id,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.ok(establishmentService.getEstablishment(actorId, id, correlationId));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('establishments:update')")
    @Operation(summary = "Mettre a jour un etablissement")
    public ResponseEntity<EstablishmentResponse> updateEstablishment(
            @PathVariable UUID id,
            @RequestBody UpdateEstablishmentRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.ok(establishmentService.updateEstablishment(actorId, id, request, correlationId));
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAuthority('establishments:activate')")
    @Operation(summary = "Activer un etablissement")
    public ResponseEntity<EstablishmentResponse> activateEstablishment(
            @PathVariable UUID id,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.ok(establishmentService.activateEstablishment(actorId, id, correlationId));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('establishments:deactivate')")
    @Operation(summary = "Desactiver un etablissement")
    public ResponseEntity<EstablishmentResponse> deactivateEstablishment(
            @PathVariable UUID id,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.ok(establishmentService.deactivateEstablishment(actorId, id, correlationId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('establishments:delete')")
    @Operation(summary = "Supprimer un etablissement")
    public ResponseEntity<EstablishmentResponse> deleteEstablishment(
            @PathVariable UUID id,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.ok(establishmentService.deleteEstablishment(actorId, id, correlationId));
    }

    @PostMapping(value = "/{id}/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('establishments:update')")
    @Operation(summary = "Televerser le logo d'un etablissement")
    public ResponseEntity<EstablishmentResponse> uploadEstablishmentLogo(
            @PathVariable UUID id,
            @RequestPart("file") MultipartFile file,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.ok(establishmentService.updateEstablishmentLogo(actorId, id, file, correlationId));
    }

    @DeleteMapping("/{id}/logo")
    @PreAuthorize("hasAuthority('establishments:update')")
    @Operation(summary = "Supprimer le logo d'un etablissement")
    public ResponseEntity<EstablishmentResponse> deleteEstablishmentLogo(
            @PathVariable UUID id,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);
        return ResponseEntity.ok(establishmentService.deleteEstablishmentLogo(actorId, id, correlationId));
    }

    @GetMapping("/{id}/logo")
    @PreAuthorize("hasAuthority('establishments:read')")
    @Operation(summary = "Lire le logo d'un etablissement")
    public ResponseEntity<byte[]> getEstablishmentLogo(
            @PathVariable UUID id,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        UUID actorId = currentUserId(authentication);
        String correlationId = resolveCorrelationId(httpRequest);

        EstablishmentService.LogoContent logo = establishmentService.getEstablishmentLogo(actorId, id, correlationId);
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        try {
            mediaType = MediaType.parseMediaType(logo.contentType());
        } catch (Exception ignored) {
        }

        ResponseEntity.BodyBuilder responseBuilder = ResponseEntity.ok().contentType(mediaType);
        if (logo.fileName() != null && !logo.fileName().isBlank()) {
            responseBuilder.header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + logo.fileName() + "\"");
        }

        return responseBuilder.body(logo.content());
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
