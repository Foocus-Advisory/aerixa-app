package com.aerixa.app.infrastructure.whatsapp.controller;

import com.aerixa.app.application.whatsapp.dto.EstablishmentWhatsappConfigResponse;
import com.aerixa.app.application.whatsapp.dto.UpdateEstablishmentWhatsappConfigRequest;
import com.aerixa.app.application.whatsapp.service.EstablishmentWhatsappConfigService;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/establishments/{establishmentId}/whatsapp-config")
@RequiredArgsConstructor
@Tag(name = "EstablishmentWhatsappConfig", description = "Configuration WhatsApp Business par etablissement")
@SecurityRequirement(name = "bearerAuth")
public class EstablishmentWhatsappConfigController {

    private final EstablishmentWhatsappConfigService establishmentWhatsappConfigService;

    @GetMapping
    @PreAuthorize("hasAuthority('establishment_whatsapp_config:read')")
    @Operation(summary = "Lire la configuration WhatsApp d'un etablissement")
    public ResponseEntity<EstablishmentWhatsappConfigResponse> get(@PathVariable UUID establishmentId,
                                                                     Authentication authentication,
                                                                     HttpServletRequest httpRequest) {
        return ResponseEntity.ok(establishmentWhatsappConfigService.getOrCreate(
                currentUserId(authentication), establishmentId, resolveCorrelationId(httpRequest)));
    }

    @PutMapping
    @PreAuthorize("hasAuthority('establishment_whatsapp_config:update')")
    @Operation(summary = "Mettre a jour la configuration WhatsApp d'un etablissement")
    public ResponseEntity<EstablishmentWhatsappConfigResponse> update(@PathVariable UUID establishmentId,
                                                                        @RequestBody UpdateEstablishmentWhatsappConfigRequest request,
                                                                        Authentication authentication,
                                                                        HttpServletRequest httpRequest) {
        return ResponseEntity.ok(establishmentWhatsappConfigService.update(
                currentUserId(authentication), establishmentId, request, resolveCorrelationId(httpRequest)));
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
