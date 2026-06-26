package com.aerixa.app.application.whatsapp.service;

import com.aerixa.app.application.configuration.audit.ConfigurationAuditAction;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEntityType;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditEvent;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditOutcome;
import com.aerixa.app.application.configuration.audit.ConfigurationAuditPublisher;
import com.aerixa.app.application.configuration.security.ConfigurationPermissionGuard;
import com.aerixa.app.application.notification.service.NotificationJobService;
import com.aerixa.app.application.whatsapp.dto.CandidateConversationMessageResponse;
import com.aerixa.app.application.whatsapp.dto.CandidateConversationResponse;
import com.aerixa.app.application.whatsapp.dto.CreateCandidateConversationRequest;
import com.aerixa.app.application.whatsapp.dto.SendCandidateConversationMessageRequest;
import com.aerixa.app.application.whatsapp.security.CandidateConversationsPermissions;
import com.aerixa.app.application.whatsapp.security.ConversationVisibilityService;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.exception.UserNotFoundException;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.candidates.entity.Candidate;
import com.aerixa.app.domain.notification.entity.NotificationJobType;
import com.aerixa.app.domain.whatsapp.entity.CandidateConversation;
import com.aerixa.app.domain.whatsapp.entity.CandidateConversationMessage;
import com.aerixa.app.domain.whatsapp.entity.ConversationTargetPhoneOwner;
import com.aerixa.app.domain.whatsapp.entity.EstablishmentWhatsappConfig;
import com.aerixa.app.domain.whatsapp.entity.MessageDeliveryStatus;
import com.aerixa.app.domain.whatsapp.entity.MessageDirection;
import com.aerixa.app.domain.whatsapp.entity.MessageType;
import com.aerixa.app.domain.whatsapp.exception.WhatsappConfigurationMissingException;
import com.aerixa.app.infrastructure.candidates.repository.CandidateJpaRepository;
import com.aerixa.app.infrastructure.error.ResourceNotFoundException;
import com.aerixa.app.infrastructure.security.EncryptionService;
import com.aerixa.app.infrastructure.whatsapp.repository.CandidateConversationJpaRepository;
import com.aerixa.app.infrastructure.whatsapp.repository.CandidateConversationMessageJpaRepository;
import com.aerixa.app.infrastructure.whatsapp.repository.EstablishmentWhatsappConfigJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CandidateConversationService {

    private static final long MESSAGING_WINDOW_HOURS = 24;

    private final CandidateConversationJpaRepository candidateConversationJpaRepository;
    private final CandidateConversationMessageJpaRepository candidateConversationMessageJpaRepository;
    private final CandidateJpaRepository candidateJpaRepository;
    private final EstablishmentWhatsappConfigJpaRepository establishmentWhatsappConfigJpaRepository;
    private final UserRepository userRepository;
    private final ConfigurationPermissionGuard permissionGuard;
    private final ConfigurationAuditPublisher auditPublisher;
    private final EncryptionService encryptionService;
    private final NotificationJobService notificationJobService;
    private final ConversationVisibilityService conversationVisibilityService;

    @Transactional(readOnly = true)
    public List<CandidateConversationResponse> listForCandidate(UUID actorUserId, UUID establishmentId, UUID candidateId, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidateConversationsPermissions.CANDIDATE_CONVERSATIONS_LIST);
        conversationVisibilityService.assertCanAccessEstablishment(actor, establishmentId);

        candidateJpaRepository.findByIdAndEstablishmentId(candidateId, establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidat introuvable"));

        List<CandidateConversation> conversations = candidateConversationJpaRepository
                .findAllByEstablishmentIdAndCandidateId(establishmentId, candidateId, Sort.by(Sort.Direction.DESC, "lastInboundAt"));

        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.LIST, candidateId, correlationId, Map.of("count", conversations.size()));
        return conversations.stream().map(this::toResponse).toList();
    }

    @Transactional
    public CandidateConversationResponse createForCandidate(UUID actorUserId, UUID establishmentId, UUID candidateId,
                                                              CreateCandidateConversationRequest request, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidateConversationsPermissions.CANDIDATE_CONVERSATIONS_CREATE);
        conversationVisibilityService.assertCanAccessEstablishment(actor, establishmentId);

        try {
            Candidate candidate = candidateJpaRepository.findByIdAndEstablishmentId(candidateId, establishmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Candidat introuvable"));

            if (request == null || request.getTargetPhoneOwner() == null) {
                throw new IllegalArgumentException("Le destinataire de la conversation est obligatoire");
            }

            String phoneNumber = resolvePhoneNumber(candidate, request.getTargetPhoneOwner());
            if (phoneNumber == null || phoneNumber.isBlank()) {
                throw new IllegalStateException("Aucun numero de telephone disponible pour ce destinataire");
            }

            CandidateConversation conversation = candidateConversationJpaRepository
                    .findByEstablishmentIdAndTargetPhoneNumber(establishmentId, phoneNumber)
                    .orElseGet(() -> candidateConversationJpaRepository.save(CandidateConversation.builder()
                            .establishmentId(establishmentId)
                            .candidateId(candidate.getId())
                            .targetPhoneNumber(phoneNumber)
                            .targetPhoneOwner(request.getTargetPhoneOwner())
                            .build()));

            if (conversation.getCandidateId() == null) {
                conversation.setCandidateId(candidate.getId());
                conversation.setTargetPhoneOwner(request.getTargetPhoneOwner());
                conversation = candidateConversationJpaRepository.save(conversation);
            }

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.CREATE, conversation.getId(), correlationId,
                    Map.of("candidateId", candidate.getId().toString(), "targetPhoneOwner", request.getTargetPhoneOwner().name()));

            return toResponse(conversation);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.CREATE, candidateId, correlationId,
                    "CANDIDATE_CONVERSATION_CREATE_FAILED", ex);
            throw ex;
        }
    }

    private String resolvePhoneNumber(Candidate candidate, ConversationTargetPhoneOwner owner) {
        return switch (owner) {
            case PARENT_1 -> candidate.getParentPhone1();
            case PARENT_2 -> candidate.getParentPhone2();
            case CANDIDATE -> candidate.getCandidatePhone();
        };
    }

    @Transactional(readOnly = true)
    public List<CandidateConversationMessageResponse> listMessages(UUID actorUserId, UUID establishmentId, UUID conversationId, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidateConversationsPermissions.CANDIDATE_CONVERSATIONS_READ);
        conversationVisibilityService.assertCanAccessEstablishment(actor, establishmentId);

        CandidateConversation conversation = resolveScoped(conversationId, establishmentId);
        EstablishmentWhatsappConfig config = resolveConfig(establishmentId);
        byte[] dataEncryptionKey = decryptEstablishmentKey(config);

        List<CandidateConversationMessage> messages = candidateConversationMessageJpaRepository
                .findAllByConversationId(conversation.getId(), Sort.by(Sort.Direction.ASC, "occurredAt"));

        publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.READ, conversation.getId(), correlationId,
                Map.of("count", messages.size(), "context", "conversation_messages"));

        return messages.stream().map(message -> toMessageResponse(message, dataEncryptionKey)).toList();
    }

    @Transactional
    public CandidateConversationMessageResponse sendMessage(UUID actorUserId, UUID establishmentId, UUID conversationId,
                                                              SendCandidateConversationMessageRequest request, String correlationId) {
        User actor = actor(actorUserId);
        permissionGuard.assertHasPermission(actor, CandidateConversationsPermissions.CANDIDATE_CONVERSATIONS_SEND_MESSAGE);
        conversationVisibilityService.assertCanAccessEstablishment(actor, establishmentId);

        CandidateConversation conversation = resolveScoped(conversationId, establishmentId);

        try {
            if (request == null) {
                throw new IllegalArgumentException("La requete d'envoi est obligatoire");
            }

            boolean isTemplate = request.getTemplateName() != null && !request.getTemplateName().isBlank();
            if (!isTemplate) {
                if (request.getContent() == null || request.getContent().isBlank()) {
                    throw new IllegalArgumentException("Le contenu du message est obligatoire");
                }
                if (!isWithinMessagingWindow(conversation)) {
                    throw new IllegalStateException(
                            "Conversation fermee (fenetre de 24h depassee) - utilisez un message template approuve");
                }
            }

            EstablishmentWhatsappConfig config = resolveConfig(establishmentId);
            byte[] dataEncryptionKey = decryptEstablishmentKey(config);

            String content = isTemplate ? request.getTemplateName() : request.getContent();
            String ciphertext = encryptionService.encryptWithKey(content, dataEncryptionKey);

            CandidateConversationMessage message = candidateConversationMessageJpaRepository.save(CandidateConversationMessage.builder()
                    .conversationId(conversation.getId())
                    .direction(MessageDirection.OUTBOUND)
                    .senderUserId(actor.getId())
                    .messageType(isTemplate ? MessageType.TEMPLATE : MessageType.TEXT)
                    .templateName(isTemplate ? request.getTemplateName() : null)
                    .contentCiphertext(ciphertext)
                    .deliveryStatus(MessageDeliveryStatus.PENDING)
                    .occurredAt(LocalDateTime.now())
                    .build());

            conversation.setLastOutboundAt(message.getOccurredAt());
            candidateConversationJpaRepository.save(conversation);

            notificationJobService.enqueue(establishmentId, NotificationJobType.WHATSAPP_OUTBOUND, Map.of(
                    "conversationMessageId", message.getId().toString(),
                    "conversationId", conversation.getId().toString(),
                    "triggeredByUserId", actor.getId().toString()
            ));

            publishSuccess(actor.getId(), establishmentId, ConfigurationAuditAction.CREATE, message.getId(), correlationId,
                    Map.of("conversationId", conversation.getId().toString(), "messageType", message.getMessageType().name()));

            return toMessageResponse(message, dataEncryptionKey);
        } catch (RuntimeException ex) {
            publishFailure(actor.getId(), establishmentId, ConfigurationAuditAction.CREATE, conversation.getId(), correlationId,
                    "CANDIDATE_CONVERSATION_SEND_MESSAGE_FAILED", ex);
            throw ex;
        }
    }

    private boolean isWithinMessagingWindow(CandidateConversation conversation) {
        return conversation.getLastInboundAt() != null
                && conversation.getLastInboundAt().isAfter(LocalDateTime.now().minusHours(MESSAGING_WINDOW_HOURS));
    }

    private byte[] decryptEstablishmentKey(EstablishmentWhatsappConfig config) {
        return encryptionService.decryptKeyWithMasterKey(config.getEncryptionKeyCiphertext());
    }

    private EstablishmentWhatsappConfig resolveConfig(UUID establishmentId) {
        return establishmentWhatsappConfigJpaRepository.findByEstablishmentId(establishmentId)
                .orElseThrow(() -> new WhatsappConfigurationMissingException(establishmentId));
    }

    private CandidateConversation resolveScoped(UUID conversationId, UUID establishmentId) {
        return candidateConversationJpaRepository.findByIdAndEstablishmentId(conversationId, establishmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation introuvable"));
    }

    private User actor(UUID actorUserId) {
        return userRepository.findById(actorUserId)
                .orElseThrow(() -> new UserNotFoundException(actorUserId));
    }

    private CandidateConversationResponse toResponse(CandidateConversation conversation) {
        return CandidateConversationResponse.builder()
                .id(conversation.getId())
                .establishmentId(conversation.getEstablishmentId())
                .candidateId(conversation.getCandidateId())
                .targetPhoneNumber(conversation.getTargetPhoneNumber())
                .targetPhoneOwner(conversation.getTargetPhoneOwner())
                .lastInboundAt(conversation.getLastInboundAt())
                .lastOutboundAt(conversation.getLastOutboundAt())
                .withinMessagingWindow(isWithinMessagingWindow(conversation))
                .createdAt(conversation.getCreatedAt())
                .updatedAt(conversation.getUpdatedAt())
                .build();
    }

    private CandidateConversationMessageResponse toMessageResponse(CandidateConversationMessage message, byte[] dataEncryptionKey) {
        return CandidateConversationMessageResponse.builder()
                .id(message.getId())
                .conversationId(message.getConversationId())
                .direction(message.getDirection())
                .senderUserId(message.getSenderUserId())
                .whatsappMessageId(message.getWhatsappMessageId())
                .messageType(message.getMessageType())
                .templateName(message.getTemplateName())
                .content(encryptionService.decryptWithKey(message.getContentCiphertext(), dataEncryptionKey))
                .mediaUrl(message.getMediaUrl())
                .deliveryStatus(message.getDeliveryStatus())
                .occurredAt(message.getOccurredAt())
                .build();
    }

    private void publishSuccess(UUID actorId, UUID establishmentId, ConfigurationAuditAction action, UUID entityId,
                                 String correlationId, Map<String, Object> payloadDiff) {
        auditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.CANDIDATE_CONVERSATION)
                .entityId(entityId)
                .correlationId(normalizeCorrelationId(correlationId))
                .outcome(ConfigurationAuditOutcome.SUCCESS)
                .payloadDiff(payloadDiff)
                .build());
    }

    private void publishFailure(UUID actorId, UUID establishmentId, ConfigurationAuditAction action, UUID entityId,
                                 String correlationId, String reasonCode, RuntimeException ex) {
        auditPublisher.publish(ConfigurationAuditEvent.builder()
                .actorId(actorId)
                .establishmentId(establishmentId)
                .action(action)
                .entityType(ConfigurationAuditEntityType.CANDIDATE_CONVERSATION)
                .entityId(entityId)
                .correlationId(normalizeCorrelationId(correlationId))
                .outcome(ConfigurationAuditOutcome.FAILURE)
                .reasonCode(reasonCode)
                .errorMessage(ex.getMessage())
                .payloadDiff(Map.of())
                .build());
    }

    private String normalizeCorrelationId(String correlationId) {
        return correlationId == null || correlationId.isBlank() ? UUID.randomUUID().toString() : correlationId.trim();
    }
}
