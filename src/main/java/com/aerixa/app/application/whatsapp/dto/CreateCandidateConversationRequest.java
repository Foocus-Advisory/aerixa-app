package com.aerixa.app.application.whatsapp.dto;

import com.aerixa.app.domain.whatsapp.entity.ConversationTargetPhoneOwner;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateCandidateConversationRequest {
    private UUID establishmentId;
    private ConversationTargetPhoneOwner targetPhoneOwner;
}
