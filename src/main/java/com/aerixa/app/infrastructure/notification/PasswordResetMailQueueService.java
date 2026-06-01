package com.aerixa.app.infrastructure.notification;

import com.aerixa.app.application.mail.service.MailTemplatePreviewService;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.mail.entity.MailTemplate;
import com.aerixa.app.domain.mail.entity.MailType;
import com.aerixa.app.domain.mail.model.MailTypeCategory;
import com.aerixa.app.domain.mail.repository.MailTemplateRepository;
import com.aerixa.app.domain.mail.repository.MailTypeRepository;
import com.aerixa.app.infrastructure.config.AppProperties;
import com.aerixa.app.infrastructure.security.JwtTokenProvider;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Year;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetMailQueueService {

    private final JavaMailSender mailSender;
    private final AppProperties appProperties;
    private final MailTypeRepository mailTypeRepository;
    private final MailTemplateRepository mailTemplateRepository;
    private final MailTemplatePreviewService mailTemplatePreviewService;
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;

    public MailQueueResult enqueuePasswordResetMail(String userEmail) {
        return enqueuePasswordResetMail(userEmail, null);
    }

    public MailQueueResult enqueuePasswordResetMail(String userEmail, String temporaryPassword) {
        return enqueueMail(userEmail, MailPurpose.PASSWORD_RESET, temporaryPassword);
    }

    public MailQueueResult enqueueInitialPasswordInvitationMail(String userEmail) {
        return enqueueMail(userEmail, MailPurpose.INITIAL_PASSWORD_INVITATION, null);
    }

    private MailQueueResult enqueueMail(String userEmail, MailPurpose mailPurpose, String temporaryPassword) {
        AppProperties.Notifications.MailNotif mailConfig = appProperties.getNotifications().getMail();
        if (!mailConfig.isEnabled()) {
            log.info("Mail skipped because notifications are disabled (purpose={}, email={})", mailPurpose, userEmail);
            return MailQueueResult.builder()
                    .accepted(true)
                    .queued(false)
                    .jobId(null)
                    .recipient(userEmail)
                    .fallbackRecipient(trimToNull(mailConfig.getFallbackRecipient()))
                    .build();
        }

        String jobId = UUID.randomUUID().toString();
        sendMailAsync(jobId, userEmail, mailPurpose, temporaryPassword);

        return MailQueueResult.builder()
                .accepted(true)
                .queued(true)
                .jobId(jobId)
                .recipient(userEmail)
                .fallbackRecipient(trimToNull(mailConfig.getFallbackRecipient()))
                .build();
    }

    @Async("mailTaskExecutor")
    protected void sendMailAsync(String jobId, String userEmail, MailPurpose mailPurpose, String temporaryPassword) {
        AppProperties.Notifications.MailNotif mailConfig = appProperties.getNotifications().getMail();
        int maxAttempts = Math.max(mailConfig.getRetryAttempts(), 1);
        long backoffMillis = Math.max(mailConfig.getRetryBackoffMillis(), 250L);

        Exception lastError = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                sendMail(userEmail, mailPurpose, temporaryPassword);
                log.info("Mail sent (purpose={}, jobId={}, email={}, attempt={}/{})", mailPurpose, jobId, userEmail, attempt, maxAttempts);
                return;
            } catch (Exception ex) {
                lastError = ex;
                log.warn("Mail attempt failed (purpose={}, jobId={}, email={}, attempt={}/{})", mailPurpose, jobId, userEmail, attempt, maxAttempts, ex);
                if (attempt < maxAttempts) {
                    try {
                        Thread.sleep(backoffMillis * attempt);
                    } catch (InterruptedException interrupted) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }

        String fallbackRecipient = trimToNull(mailConfig.getFallbackRecipient());
        if (fallbackRecipient != null && !fallbackRecipient.equalsIgnoreCase(userEmail)) {
            try {
                sendFallbackAlert(fallbackRecipient, userEmail, jobId, mailPurpose, lastError);
                log.info("Fallback mail sent (jobId={}, fallback={})", jobId, fallbackRecipient);
                return;
            } catch (Exception fallbackError) {
                log.error("Fallback mail failed (jobId={}, fallback={})", jobId, fallbackRecipient, fallbackError);
            }
        }

        if (mailConfig.isFailOnError()) {
            log.error("Mail permanently failed and failOnError=true (purpose={}, jobId={}, email={})", mailPurpose, jobId, userEmail, lastError);
        }
    }

    private void sendMail(String userEmail, MailPurpose mailPurpose, String temporaryPassword) {
        String from = trimToNull(appProperties.getMail().getFrom());
        String baseUrl = resolveBaseUrl(mailPurpose);
        String link = buildLinkWithTokenAndEmail(userEmail, baseUrl);
        MailContent mailContent = resolveMailContent(userEmail, link, mailPurpose, temporaryPassword);

        MimeMessage message = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            if (from != null) {
                helper.setFrom(from);
            }
            helper.setTo(userEmail);
            helper.setSubject(mailContent.subject());
            helper.setText(mailContent.textBody(), mailContent.htmlBody());
        } catch (MessagingException exception) {
            throw new IllegalStateException("Impossible de construire le mail", exception);
        }
        mailSender.send(message);
    }

    private String resolveBaseUrl(MailPurpose mailPurpose) {
        if (mailPurpose == MailPurpose.INITIAL_PASSWORD_INVITATION) {
            String operatorSetupBaseUrl = trimToNull(appProperties.getPortal().getOperatorPasswordSetupBaseUrl());
            if (operatorSetupBaseUrl != null) {
                return operatorSetupBaseUrl;
            }
        }
        return trimToNull(appProperties.getPortal().getPasswordResetBaseUrl());
    }

    private String buildLinkWithTokenAndEmail(String userEmail, String baseUrl) {
        if (baseUrl == null || baseUrl.isBlank()) {
            return "";
        }

        String encodedEmail = java.net.URLEncoder.encode(userEmail, StandardCharsets.UTF_8);
        String token = userRepository.findByEmail(userEmail)
                .map(jwtTokenProvider::generatePasswordResetToken)
                .map(value -> java.net.URLEncoder.encode(value, StandardCharsets.UTF_8))
                .orElse("");

        String linkWithToken;
        if (baseUrl.contains("{token}")) {
            linkWithToken = baseUrl.replace("{token}", token);
        } else if (baseUrl.contains("token=")) {
            linkWithToken = baseUrl.replaceFirst("token=[^&]*", "token=" + token);
        } else {
            linkWithToken = baseUrl + (baseUrl.contains("?") ? "&" : "?") + "token=" + token;
        }

        if (linkWithToken.contains("email=")) {
            return linkWithToken;
        }
        return linkWithToken + (linkWithToken.contains("?") ? "&" : "?") + "email=" + encodedEmail;
    }

    private MailContent resolveMailContent(
            String userEmail,
            String link,
            MailPurpose mailPurpose,
            String temporaryPassword
    ) {
        Map<String, String> variables = new HashMap<>();
        variables.put("USER_EMAIL", userEmail);
        variables.put("USER_NAME", userEmail);
        variables.put("RESET_LINK", link);
        variables.put("INVITATION_LINK", link);
        variables.put("SYSTEM_NAME", "AERIXA");
        variables.put("SUPPORT_EMAIL", Optional.ofNullable(trimToNull(appProperties.getMail().getFrom())).orElse("support@aerixa-app.com"));
        variables.put("CURRENT_YEAR", String.valueOf(Year.now().getValue()));
        if (temporaryPassword != null && !temporaryPassword.isBlank()) {
            variables.put("TEMPORARY_PASSWORD", temporaryPassword);
        }

        Optional<MailType> mailTypeOpt = mailTypeRepository.findByCategory(mailPurpose.templateCategory.name());

        if (mailTypeOpt.isEmpty() && mailPurpose == MailPurpose.INITIAL_PASSWORD_INVITATION) {
            // Backward compatibility: if invitation category is missing, fallback to password reset category.
            mailTypeOpt = mailTypeRepository.findByCategory(MailTypeCategory.AUTH_PASSWORD_RESET.name());
        }

        if (mailTypeOpt.isPresent()) {
            MailType mailType = mailTypeOpt.get();
            Optional<MailTemplate> templateOpt = mailTemplateRepository.findCurrentByMailTypeAndLanguage(mailType, "fr")
                    .or(() -> mailTemplateRepository.findCurrentByMailTypeAndLanguage(mailType, "en"));

            if (templateOpt.isPresent()) {
                MailTemplate template = templateOpt.get();
                String subject = mailTemplatePreviewService.renderTemplate(template.getSubject(), variables);
                String renderedHtml = template.getHtmlContent() != null
                        ? mailTemplatePreviewService.renderTemplate(template.getHtmlContent(), variables)
                        : null;
                String renderedText = template.getTextContent() != null
                        ? mailTemplatePreviewService.renderTemplate(template.getTextContent(), variables)
                        : null;

                if (renderedText == null || renderedText.isBlank()) {
                    renderedText = stripHtml(renderedHtml);
                }

                return new MailContent(subject, renderedText, renderedHtml);
            }
        }

        return mailPurpose.buildFallbackContent(link);
    }

    private String stripHtml(String html) {
        if (html == null) {
            return "";
        }
        return html.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
    }

    private void sendFallbackAlert(String fallbackRecipient, String targetEmail, String jobId, MailPurpose mailPurpose, Exception error) {
        String from = trimToNull(appProperties.getMail().getFrom());

        SimpleMailMessage message = new SimpleMailMessage();
        if (from != null) {
            message.setFrom(from);
        }
        message.setTo(fallbackRecipient);
        message.setSubject("AERIXA - ECHEC ENVOI MAIL " + mailPurpose.name());
        message.setText(
                "Le mail de notification n'a pas pu etre envoye.\n\n"
                        + "type: " + mailPurpose + "\n"
                        + "jobId: " + jobId + "\n"
                        + "email cible: " + targetEmail + "\n"
                        + "erreur: " + Optional.ofNullable(error).map(Exception::getMessage).orElse("inconnue") + "\n"
        );
        mailSender.send(message);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    @lombok.Builder
    @lombok.Value
    public static class MailQueueResult {
        boolean accepted;
        boolean queued;
        String jobId;
        String recipient;
        String fallbackRecipient;
    }

    private record MailContent(String subject, String textBody, String htmlBody) {
    }

    private enum MailPurpose {
        PASSWORD_RESET(MailTypeCategory.AUTH_PASSWORD_RESET),
        INITIAL_PASSWORD_INVITATION(MailTypeCategory.AUTH_ACCOUNT_CREATED_INITIAL_PASSWORD);

        private final MailTypeCategory templateCategory;

        MailPurpose(MailTypeCategory templateCategory) {
            this.templateCategory = templateCategory;
        }

        private MailContent buildFallbackContent(String link) {
            if (this == INITIAL_PASSWORD_INVITATION) {
                String fallbackText = "Bonjour,\n\n"
                        + "Votre compte a ete cree. Utilisez le lien ci-dessous pour definir votre mot de passe :\n"
                        + (link.isBlank() ? "(Lien indisponible: contactez l'administrateur)\n" : link + "\n")
                        + "\nSi vous n'etes pas a l'origine de cette demande, ignorez cet email.\n\n"
                        + "AERIXA";
                return new MailContent("AERIXA - Definition du mot de passe", fallbackText, null);
            }

            String fallbackText = "Bonjour,\n\n"
                    + "Une demande de reinitialisation de mot de passe a ete effectuee.\n"
                    + "Utilisez le lien ci-dessous pour choisir un nouveau mot de passe :\n"
                    + (link.isBlank() ? "(Lien indisponible: contactez l'administrateur)\n" : link + "\n")
                    + "\nSi vous n'etes pas a l'origine de cette demande, ignorez cet email.\n\n"
                    + "AERIXA";
            return new MailContent("AERIXA - Reinitialisation du mot de passe", fallbackText, null);
        }
    }
}
