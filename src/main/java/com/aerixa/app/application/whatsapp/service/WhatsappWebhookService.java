package com.aerixa.app.application.whatsapp.service;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditAction;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEntityType;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEvent;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditOutcome;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.domain.candidates.entity.Candidate;
import com.aerixa.app.domain.candidates.entity.WhatsappTarget;
import com.aerixa.app.domain.whatsapp.entity.CandidateConversation;
import com.aerixa.app.domain.whatsapp.entity.CandidateConversationMessage;
import com.aerixa.app.domain.whatsapp.entity.ConversationTargetPhoneOwner;
import com.aerixa.app.domain.whatsapp.entity.EstablishmentWhatsappConfig;
import com.aerixa.app.domain.whatsapp.entity.MessageDeliveryStatus;
import com.aerixa.app.domain.whatsapp.entity.MessageDirection;
import com.aerixa.app.domain.whatsapp.entity.MessageType;
import com.aerixa.app.infrastructure.candidates.repository.CandidateJpaRepository;
import com.aerixa.app.infrastructure.config.AppProperties;
import com.aerixa.app.infrastructure.security.EncryptionService;
import com.aerixa.app.infrastructure.whatsapp.repository.CandidateConversationJpaRepository;
import com.aerixa.app.infrastructure.whatsapp.repository.CandidateConversationMessageJpaRepository;
import com.aerixa.app.infrastructure.whatsapp.repository.EstablishmentWhatsappConfigJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class WhatsappWebhookService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String SIGNATURE_PREFIX = "sha256=";

    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;
    private final EstablishmentWhatsappConfigJpaRepository establishmentWhatsappConfigJpaRepository;
    private final CandidateConversationJpaRepository candidateConversationJpaRepository;
    private final CandidateConversationMessageJpaRepository candidateConversationMessageJpaRepository;
    private final CandidateJpaRepository candidateJpaRepository;
    private final EncryptionService encryptionService;
    private final ConfigurationAuditPublisher auditPublisher;

    /**
     * Verifie le challenge d'abonnement webhook (GET hub.verify_token).
     * Le verify_token est specifique a chaque etablissement (establishment_whatsapp_configs.webhook_verify_token).
     */
    public Optional<String> verifySubscription(String mode, String verifyToken, String challenge) {
        if (!"subscribe".equals(mode) || verifyToken == null || challenge == null) {
            return Optional.empty();
        }
        boolean known = establishmentWhatsappConfigJpaRepository.findAll().stream()
                .anyMatch(config -> verifyToken.equals(config.getWebhookVerifyToken()));
        return known ? Optional.of(challenge) : Optional.empty();
    }

    /**
     * Verifie la signature HMAC-SHA256 du payload (header X-Hub-Signature-256), calculee avec l'app secret Meta.
     */
    public boolean verifySignature(String rawBody, String signatureHeader) {
        String appSecret = appProperties.getSecurity().getWhatsapp().getAppSecret();
        if (appSecret == null || appSecret.isBlank()) {
            log.warn("WHATSAPP_APP_SECRET non configure - verification de signature ignoree");
            return true;
        }
        if (signatureHeader == null || !signatureHeader.startsWith(SIGNATURE_PREFIX)) {
            return false;
        }
        String expectedHex = signatureHeader.substring(SIGNATURE_PREFIX.length());
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(appSecret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            byte[] computed = mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8));
            String computedHex = HexFormat.of().formatHex(computed);
            return MessageDigest.isEqual(
                    computedHex.getBytes(StandardCharsets.UTF_8),
                    expectedHex.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.error("Echec de verification de la signature webhook WhatsApp", e);
            return false;
        }
    }

    /**
     * Traite le payload de notification Meta (messages entrants et statuts de livraison).
     */
    @Transactional
    public void processNotification(String rawBody) {
        JsonNode root = objectMapper.readTree(rawBody);
        if (!"whatsapp_business_account".equals(root.path("object").asString(""))) {
            return;
        }

        for (JsonNode entry : root.path("entry")) {
            for (JsonNode change : entry.path("changes")) {
                JsonNode value = change.path("value");
                JsonNode metadata = value.path("metadata");
                String phoneNumberId = metadata.path("phone_number_id").asString(null);
                if (phoneNumberId == null) {
                    continue;
                }

                Optional<EstablishmentWhatsappConfig> configOpt = establishmentWhatsappConfigJpaRepository.findByPhoneNumberId(phoneNumberId);
                if (configOpt.isEmpty()) {
                    log.warn("Aucune configuration WhatsApp trouvee pour phone_number_id={}", phoneNumberId);
                    continue;
                }
                EstablishmentWhatsappConfig config = configOpt.get();

                for (JsonNode message : value.path("messages")) {
                    handleInboundMessage(config, message);
                }
                for (JsonNode status : value.path("statuses")) {
                    handleStatusUpdate(status);
                }
            }
        }
    }

    private void handleInboundMessage(EstablishmentWhatsappConfig config, JsonNode message) {
        String fromPhoneRaw = message.path("from").asString(null);
        String whatsappMessageId = message.path("id").asString(null);
        if (fromPhoneRaw == null || whatsappMessageId == null) {
            return;
        }

        if (candidateConversationMessageJpaRepository.findByWhatsappMessageId(whatsappMessageId).isPresent()) {
            return;
        }

        String fromPhone = PhoneNumberNormalizer.normalize(fromPhoneRaw);
        UUID establishmentId = config.getEstablishmentId();

        CandidateConversation conversation = candidateConversationJpaRepository
                .findByEstablishmentIdAndTargetPhoneNumber(establishmentId, fromPhone)
                .orElseGet(() -> createConversation(establishmentId, fromPhone));

        LocalDateTime occurredAt = resolveTimestamp(message);

        try {
            byte[] dataEncryptionKey = encryptionService.decryptKeyWithMasterKey(config.getEncryptionKeyCiphertext());
            String content = extractContent(message);
            String ciphertext = encryptionService.encryptWithKey(content, dataEncryptionKey);

            CandidateConversationMessage savedMessage = candidateConversationMessageJpaRepository.save(CandidateConversationMessage.builder()
                    .conversationId(conversation.getId())
                    .direction(MessageDirection.INBOUND)
                    .whatsappMessageId(whatsappMessageId)
                    .messageType(resolveMessageType(message))
                    .contentCiphertext(ciphertext)
                    .mediaUrl(extractMediaUrl(message))
                    .deliveryStatus(MessageDeliveryStatus.DELIVERED)
                    .occurredAt(occurredAt)
                    .build());

            conversation.setLastInboundAt(occurredAt);
            if (conversation.getCandidateId() == null) {
                tryMatchCandidate(conversation);
            }
            candidateConversationJpaRepository.save(conversation);

            publish(ConfigurationAuditEntityType.CANDIDATE_CONVERSATION_MESSAGE, ConfigurationAuditAction.CREATE,
                    establishmentId, savedMessage.getId(), ConfigurationAuditOutcome.SUCCESS, null,
                    Map.of("conversationId", conversation.getId().toString(), "direction", "INBOUND"));
        } catch (RuntimeException ex) {
            log.error("Echec du traitement d'un message WhatsApp entrant (conversationId={})", conversation.getId(), ex);
            publish(ConfigurationAuditEntityType.CANDIDATE_CONVERSATION_MESSAGE, ConfigurationAuditAction.CREATE,
                    establishmentId, conversation.getId(), ConfigurationAuditOutcome.FAILURE,
                    "WHATSAPP_INBOUND_MESSAGE_PROCESSING_FAILED", Map.of());
        }
    }

    private void handleStatusUpdate(JsonNode status) {
        String whatsappMessageId = status.path("id").asString(null);
        String statusValue = status.path("status").asString(null);
        if (whatsappMessageId == null || statusValue == null) {
            return;
        }

        MessageDeliveryStatus deliveryStatus = mapDeliveryStatus(statusValue);
        if (deliveryStatus == null) {
            return;
        }

        candidateConversationMessageJpaRepository.findByWhatsappMessageId(whatsappMessageId)
                .ifPresent(message -> {
                    message.setDeliveryStatus(deliveryStatus);
                    candidateConversationMessageJpaRepository.save(message);
                });
    }

    private CandidateConversation createConversation(UUID establishmentId, String phoneNumber) {
        return candidateConversationJpaRepository.save(CandidateConversation.builder()
                .establishmentId(establishmentId)
                .candidateId(null)
                .targetPhoneNumber(phoneNumber)
                .targetPhoneOwner(ConversationTargetPhoneOwner.CANDIDATE)
                .build());
    }

    private void tryMatchCandidate(CandidateConversation conversation) {
        Optional<Candidate> candidateOpt = candidateJpaRepository.findFirstByEstablishmentIdAndAnyPhoneNumber(
                conversation.getEstablishmentId(), conversation.getTargetPhoneNumber());

        candidateOpt.ifPresent(candidate -> {
            conversation.setCandidateId(candidate.getId());
            conversation.setTargetPhoneOwner(resolvePhoneOwner(candidate, conversation.getTargetPhoneNumber()));
        });
    }

    private ConversationTargetPhoneOwner resolvePhoneOwner(Candidate candidate, String phoneNumber) {
        if (phoneNumber.equals(candidate.getParentPhone1())) {
            return ConversationTargetPhoneOwner.PARENT_1;
        }
        if (phoneNumber.equals(candidate.getParentPhone2())) {
            return ConversationTargetPhoneOwner.PARENT_2;
        }
        return ConversationTargetPhoneOwner.CANDIDATE;
    }

    private MessageType resolveMessageType(JsonNode message) {
        String type = message.path("type").asString("");
        return switch (type) {
            case "text" -> MessageType.TEXT;
            case "image", "video", "audio", "document", "sticker" -> MessageType.MEDIA;
            default -> MessageType.SYSTEM;
        };
    }

    private String extractContent(JsonNode message) {
        String type = message.path("type").asString("");
        return switch (type) {
            case "text" -> message.path("text").path("body").asString("");
            case "image" -> message.path("image").path("caption").asString("");
            case "video" -> message.path("video").path("caption").asString("");
            case "document" -> message.path("document").path("caption").asString("");
            default -> "";
        };
    }

    private String extractMediaUrl(JsonNode message) {
        String type = message.path("type").asString("");
        return switch (type) {
            case "image" -> message.path("image").path("id").asString(null);
            case "video" -> message.path("video").path("id").asString(null);
            case "audio" -> message.path("audio").path("id").asString(null);
            case "document" -> message.path("document").path("id").asString(null);
            case "sticker" -> message.path("sticker").path("id").asString(null);
            default -> null;
        };
    }

    private MessageDeliveryStatus mapDeliveryStatus(String statusValue) {
        return switch (statusValue) {
            case "sent" -> MessageDeliveryStatus.SENT;
            case "delivered" -> MessageDeliveryStatus.DELIVERED;
            case "read" -> MessageDeliveryStatus.READ;
            case "failed" -> MessageDeliveryStatus.FAILED;
            default -> null;
        };
    }

    private LocalDateTime resolveTimestamp(JsonNode message) {
        String timestamp = message.path("timestamp").asString(null);
        if (timestamp == null) {
            return LocalDateTime.now();
        }
        try {
            return LocalDateTime.ofInstant(Instant.ofEpochSecond(Long.parseLong(timestamp)), ZoneOffset.UTC);
        } catch (NumberFormatException e) {
            return LocalDateTime.now();
        }
    }

    private void publish(ConfigurationAuditEntityType entityType, ConfigurationAuditAction action, UUID establishmentId,
                          UUID entityId, ConfigurationAuditOutcome outcome, String reasonCode, Map<String, Object> payloadDiff) {
        auditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(systemActorId())
                .establishmentId(establishmentId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .correlationId(UUID.randomUUID().toString())
                .outcome(outcome)
                .reasonCode(reasonCode)
                .payloadDiff(payloadDiff)
                .build());
    }

    private UUID systemActorId() {
        return new UUID(0L, 0L);
    }
}
