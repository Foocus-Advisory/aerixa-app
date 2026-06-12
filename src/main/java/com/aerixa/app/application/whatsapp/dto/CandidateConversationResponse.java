package com.aerixa.app.application.whatsapp.dto;

import com.aerixa.app.domain.whatsapp.entity.ConversationTargetPhoneOwner;
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
public class CandidateConversationResponse {
    private UUID id;
    private UUID establishmentId;
    private UUID candidateId;
    private String targetPhoneNumber;
    private ConversationTargetPhoneOwner targetPhoneOwner;
    private LocalDateTime lastInboundAt;
    private LocalDateTime lastOutboundAt;

    /** true si un message texte libre peut etre envoye (fenetre Meta de 24h respectee). */
    private boolean withinMessagingWindow;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
