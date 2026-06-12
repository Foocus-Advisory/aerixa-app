package com.aerixa.app.application.whatsapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SendCandidateConversationMessageRequest {
    /** Texte libre du message (obligatoire si templateName est absent). */
    private String content;

    /** Nom du template approuve a utiliser hors fenetre de 24h (optionnel). */
    private String templateName;
}
