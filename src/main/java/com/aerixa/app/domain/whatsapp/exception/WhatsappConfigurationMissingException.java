package com.aerixa.app.domain.whatsapp.exception;

import java.util.UUID;

/**
 * Levee lorsqu'un etablissement n'a pas encore configure son acces WhatsApp Business
 * (token, phone number id) alors qu'une action necessitant l'envoi de messages est tentee.
 */
public class WhatsappConfigurationMissingException extends RuntimeException {

    private final UUID establishmentId;

    public WhatsappConfigurationMissingException(UUID establishmentId) {
        super("Configuration WhatsApp introuvable pour cet etablissement");
        this.establishmentId = establishmentId;
    }

    public UUID getEstablishmentId() {
        return establishmentId;
    }
}
