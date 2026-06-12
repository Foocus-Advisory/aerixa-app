package com.aerixa.app.domain.whatsapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "candidate_conversation_messages", schema = "auth")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CandidateConversationMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private MessageDirection direction;

    @Column(name = "sender_user_id")
    private UUID senderUserId;

    @Column(name = "whatsapp_message_id")
    private String whatsappMessageId;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false, length = 20)
    private MessageType messageType;

    @Column(name = "template_name")
    private String templateName;

    @Column(name = "content_ciphertext", nullable = false, columnDefinition = "TEXT")
    private String contentCiphertext;

    @Column(name = "content_preview_hash")
    private String contentPreviewHash;

    @Column(name = "media_url", length = 500)
    private String mediaUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_status", nullable = false, length = 20)
    private MessageDeliveryStatus deliveryStatus;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;
}
