package com.aerixa.app.application.whatsapp.dto;

import com.aerixa.app.domain.whatsapp.entity.WhatsappConnectionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EstablishmentWhatsappConfigResponse {
    private UUID id;
    private UUID establishmentId;
    private String wabaId;
    private String phoneNumberId;
    private String displayPhoneNumber;

    /** true si un access token est configure (jamais expose en clair). */
    private boolean accessTokenConfigured;

    /** Token a renseigner cote App Meta pour la verification du webhook (GET challenge). */
    private String webhookVerifyToken;

    private WhatsappConnectionStatus connectionStatus;
    private LocalDateTime lastSyncedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
