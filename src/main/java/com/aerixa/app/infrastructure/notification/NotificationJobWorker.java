package com.aerixa.app.infrastructure.notification;

import com.aerixa.app.application.mail.service.MailTemplatePreviewService;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.mail.entity.MailTemplate;
import com.aerixa.app.domain.mail.entity.MailType;
import com.aerixa.app.domain.mail.repository.MailTemplateRepository;
import com.aerixa.app.domain.mail.repository.MailTypeRepository;
import com.aerixa.app.domain.notification.entity.Notification;
import com.aerixa.app.domain.notification.entity.NotificationJob;
import com.aerixa.app.domain.notification.entity.NotificationJobStatus;
import com.aerixa.app.domain.notification.entity.NotificationJobType;
import com.aerixa.app.domain.whatsapp.entity.CandidateConversation;
import com.aerixa.app.domain.whatsapp.entity.CandidateConversationMessage;
import com.aerixa.app.domain.whatsapp.entity.EstablishmentWhatsappConfig;
import com.aerixa.app.domain.whatsapp.entity.MessageDeliveryStatus;
import com.aerixa.app.domain.whatsapp.entity.MessageType;
import com.aerixa.app.infrastructure.config.AppProperties;
import com.aerixa.app.infrastructure.notification.repository.NotificationJobJpaRepository;
import com.aerixa.app.infrastructure.notification.repository.NotificationJpaRepository;
import com.aerixa.app.infrastructure.security.EncryptionService;
import com.aerixa.app.infrastructure.whatsapp.client.WhatsappGraphApiClient;
import com.aerixa.app.infrastructure.whatsapp.repository.CandidateConversationJpaRepository;
import com.aerixa.app.infrastructure.whatsapp.repository.CandidateConversationMessageJpaRepository;
import com.aerixa.app.infrastructure.whatsapp.repository.EstablishmentWhatsappConfigJpaRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationJobWorker {

    private static final int BATCH_SIZE = 20;

    private static final String DEFAULT_TEMPLATE_LANGUAGE_CODE = "fr";

    private final NotificationJobJpaRepository notificationJobJpaRepository;
    private final NotificationJpaRepository notificationJpaRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final CandidateConversationMessageJpaRepository candidateConversationMessageJpaRepository;
    private final CandidateConversationJpaRepository candidateConversationJpaRepository;
    private final EstablishmentWhatsappConfigJpaRepository establishmentWhatsappConfigJpaRepository;
    private final EncryptionService encryptionService;
    private final WhatsappGraphApiClient whatsappGraphApiClient;
    private final JavaMailSender mailSender;
    private final AppProperties appProperties;
    private final MailTypeRepository mailTypeRepository;
    private final MailTemplateRepository mailTemplateRepository;
    private final MailTemplatePreviewService mailTemplatePreviewService;

    @Scheduled(fixedDelayString = "${app.notifications.job-worker.fixed-delay-ms:10000}")
    @Transactional
    public void processPendingJobs() {
        List<NotificationJob> jobs = notificationJobJpaRepository.lockNextBatch(LocalDateTime.now(), BATCH_SIZE);

        for (NotificationJob job : jobs) {
            job.setStatus(NotificationJobStatus.PROCESSING);
            try {
                switch (job.getJobType()) {
                    case IN_APP_NOTIFICATION -> processInAppNotification(job);
                    case EMAIL -> processEmail(job);
                    case WHATSAPP_OUTBOUND -> processWhatsappOutbound(job);
                }
                job.setStatus(NotificationJobStatus.SENT);
                job.setLastError(null);
            } catch (Exception ex) {
                handleFailure(job, ex);
            }
            notificationJobJpaRepository.save(job);
        }
    }

    private void processInAppNotification(NotificationJob job) {
        JsonNode payload = objectMapper.readTree(job.getPayload());

        UUID userId = UUID.fromString(payload.get("userId").asString());
        String title = payload.get("title").asString();
        String description = payload.get("description").asString();
        String notificationType = payload.has("notificationType") ? payload.get("notificationType").asString() : "INFO";

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("Utilisateur introuvable pour la notification: " + userId));

        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .description(description)
                .notificationType(notificationType)
                .read(false)
                .build();

        notificationJpaRepository.save(notification);
    }

    private void processEmail(NotificationJob job) {
        AppProperties.Notifications.MailNotif mailConfig = appProperties.getNotifications().getMail();
        if (!mailConfig.isEnabled()) {
            log.info("Email job skipped because mail notifications are disabled (jobId={})", job.getId());
            return;
        }

        JsonNode payload = objectMapper.readTree(job.getPayload());

        String recipientEmail = payload.get("recipientEmail").asString();
        String mailTypeCategory = payload.get("mailTypeCategory").asString();

        Map<String, String> variables = new HashMap<>();
        if (payload.has("variables") && payload.get("variables").isObject()) {
            payload.get("variables").propertyStream().forEach(entry ->
                    variables.put(entry.getKey(), entry.getValue().asString()));
        }

        MailType mailType = mailTypeRepository.findByCategory(mailTypeCategory)
                .orElseThrow(() -> new IllegalStateException("MailType introuvable pour la categorie: " + mailTypeCategory));

        if (!Boolean.TRUE.equals(mailType.getActive())) {
            log.info("Email job skipped because mail type is inactive (jobId={}, category={})", job.getId(), mailTypeCategory);
            return;
        }

        MailTemplate template = mailTemplateRepository.findCurrentByMailTypeAndLanguage(mailType, DEFAULT_TEMPLATE_LANGUAGE_CODE)
                .or(() -> mailTemplateRepository.findCurrentByMailTypeAndLanguage(mailType, "en"))
                .orElseThrow(() -> new IllegalStateException("MailTemplate introuvable pour la categorie: " + mailTypeCategory));

        String subject = mailTemplatePreviewService.renderTemplate(template.getSubject(), variables);
        String htmlBody = template.getHtmlContent() != null
                ? mailTemplatePreviewService.renderTemplate(template.getHtmlContent(), variables)
                : null;
        String textBody = template.getTextContent() != null
                ? mailTemplatePreviewService.renderTemplate(template.getTextContent(), variables)
                : null;

        String from = trimToNull(appProperties.getMail().getFrom());

        MimeMessage message = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            if (from != null) {
                helper.setFrom(from);
            }
            helper.setTo(recipientEmail);
            helper.setSubject(subject);
            helper.setText(Optional.ofNullable(textBody).orElse(""), htmlBody);
        } catch (MessagingException ex) {
            throw new IllegalStateException("Impossible de construire le mail (jobId=" + job.getId() + ")", ex);
        }
        mailSender.send(message);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void processWhatsappOutbound(NotificationJob job) {
        JsonNode payload = objectMapper.readTree(job.getPayload());
        UUID conversationMessageId = UUID.fromString(payload.get("conversationMessageId").asString());

        CandidateConversationMessage message = candidateConversationMessageJpaRepository.findById(conversationMessageId)
                .orElseThrow(() -> new IllegalStateException("Message de conversation introuvable: " + conversationMessageId));

        if (message.getDeliveryStatus() != MessageDeliveryStatus.PENDING) {
            return;
        }

        CandidateConversation conversation = candidateConversationJpaRepository.findById(message.getConversationId())
                .orElseThrow(() -> new IllegalStateException("Conversation introuvable: " + message.getConversationId()));

        EstablishmentWhatsappConfig config = establishmentWhatsappConfigJpaRepository.findByEstablishmentId(conversation.getEstablishmentId())
                .orElseThrow(() -> new IllegalStateException("Configuration WhatsApp introuvable pour l'etablissement: " + conversation.getEstablishmentId()));

        if (config.getAccessTokenCiphertext() == null || config.getPhoneNumberId() == null) {
            throw new IllegalStateException("Configuration WhatsApp incomplete pour l'etablissement: " + conversation.getEstablishmentId());
        }

        String accessToken = encryptionService.decryptWithMasterKey(config.getAccessTokenCiphertext());
        byte[] dataEncryptionKey = encryptionService.decryptKeyWithMasterKey(config.getEncryptionKeyCiphertext());
        String content = encryptionService.decryptWithKey(message.getContentCiphertext(), dataEncryptionKey);

        String whatsappMessageId;
        if (message.getMessageType() == MessageType.TEMPLATE) {
            whatsappMessageId = whatsappGraphApiClient.sendTemplateMessage(
                    config.getPhoneNumberId(), accessToken, conversation.getTargetPhoneNumber(),
                    message.getTemplateName(), DEFAULT_TEMPLATE_LANGUAGE_CODE);
        } else {
            whatsappMessageId = whatsappGraphApiClient.sendTextMessage(
                    config.getPhoneNumberId(), accessToken, conversation.getTargetPhoneNumber(), content);
        }

        message.setWhatsappMessageId(whatsappMessageId);
        message.setDeliveryStatus(MessageDeliveryStatus.SENT);
        candidateConversationMessageJpaRepository.save(message);
    }

    private void markConversationMessageFailed(NotificationJob job) {
        if (job.getJobType() != NotificationJobType.WHATSAPP_OUTBOUND) {
            return;
        }
        try {
            JsonNode payload = objectMapper.readTree(job.getPayload());
            UUID conversationMessageId = UUID.fromString(payload.get("conversationMessageId").asString());
            candidateConversationMessageJpaRepository.findById(conversationMessageId).ifPresent(message -> {
                if (message.getDeliveryStatus() == MessageDeliveryStatus.PENDING) {
                    message.setDeliveryStatus(MessageDeliveryStatus.FAILED);
                    candidateConversationMessageJpaRepository.save(message);
                }
            });
        } catch (RuntimeException ex) {
            log.error("Impossible de marquer le message de conversation en echec (jobId={})", job.getId(), ex);
        }
    }

    private void handleFailure(NotificationJob job, Exception ex) {
        log.warn("Notification job failed (jobId={}, jobType={}, attempt={})", job.getId(), job.getJobType(), job.getAttempts() + 1, ex);

        int attempts = job.getAttempts() + 1;
        job.setAttempts(attempts);
        job.setLastError(ex.getMessage());

        if (attempts >= job.getMaxAttempts()) {
            job.setStatus(NotificationJobStatus.DEAD_LETTER);
            markConversationMessageFailed(job);
        } else {
            job.setStatus(NotificationJobStatus.PENDING);
            long backoffSeconds = (long) Math.pow(2, attempts);
            job.setNextAttemptAt(LocalDateTime.now().plusSeconds(backoffSeconds));
        }
    }
}
