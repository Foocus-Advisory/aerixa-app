package com.aerixa.app.application.whatsapp.dto;

import com.aerixa.app.domain.whatsapp.entity.MessageDeliveryStatus;
import com.aerixa.app.domain.whatsapp.entity.MessageDirection;
import com.aerixa.app.domain.whatsapp.entity.MessageType;
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
public class CandidateConversationMessageResponse {
    private UUID id;
    private UUID conversationId;
    private MessageDirection direction;
    private UUID senderUserId;
    private String whatsappMessageId;
    private MessageType messageType;
    private String templateName;

    /** Contenu dechiffre, uniquement a la demande d'affichage. */
    private String content;

    private String mediaUrl;
    private MessageDeliveryStatus deliveryStatus;
    private LocalDateTime occurredAt;
}
