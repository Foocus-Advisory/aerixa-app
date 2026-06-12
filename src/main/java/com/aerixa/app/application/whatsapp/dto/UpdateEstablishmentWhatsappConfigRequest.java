package com.aerixa.app.application.whatsapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateEstablishmentWhatsappConfigRequest {
    private String wabaId;
    private String phoneNumberId;
    private String displayPhoneNumber;

    /** Token d'acces WhatsApp en clair, fourni une seule fois a la saisie. Jamais retourne. */
    private String accessToken;
}
