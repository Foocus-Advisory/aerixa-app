package com.aerixa.app.infrastructure.notification;

import com.aerixa.app.application.mail.service.MailTemplatePreviewService;
import com.aerixa.app.domain.auth.entity.User;
import com.aerixa.app.domain.auth.repository.UserRepository;
import com.aerixa.app.domain.mail.entity.MailTemplate;
import com.aerixa.app.domain.mail.entity.MailType;
import com.aerixa.app.domain.mail.repository.MailTemplateRepository;
import com.aerixa.app.domain.mail.repository.MailTypeRepository;
import com.aerixa.app.infrastructure.config.AppProperties;
import com.aerixa.app.infrastructure.security.JwtTokenProvider;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Optional;
import java.util.Properties;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordResetMailQueueServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private MailTypeRepository mailTypeRepository;

    @Mock
    private MailTemplateRepository mailTemplateRepository;

        @Mock
        private UserRepository userRepository;

        @Mock
        private JwtTokenProvider jwtTokenProvider;

    private PasswordResetMailQueueService service;

    @BeforeEach
    void setUp() {
        AppProperties properties = new AppProperties();
        properties.getMail().setFrom("no-reply@aerixa-app.com");
        properties.getPortal().setOperatorPasswordSetupBaseUrl("http://localhost:3003/fr/reset-password?token=abc");
        properties.getNotifications().getMail().setEnabled(true);

        service = new PasswordResetMailQueueService(
                mailSender,
                properties,
                mailTypeRepository,
                mailTemplateRepository,
                new MailTemplatePreviewService(),
                userRepository,
                jwtTokenProvider
        );
    }

    @Test
    void sendMailAsync_rendersInvitationTemplateAsHtmlAndText() throws Exception {
        MailType mailType = MailType.builder()
                .category("AUTH_ACCOUNT_CREATED_INITIAL_PASSWORD")
                .code("ACCOUNT_CREATED_INITIAL_PASSWORD")
                .name("Invitation")
                .build();

        MailTemplate template = MailTemplate.builder()
                .mailType(mailType)
                .subject("Invitation $${SYSTEM_NAME} - Finalisez votre acces")
                .htmlContent("<p>Bonjour $${USER_NAME}</p><p>Support: $${SUPPORT_EMAIL}</p><a href=\"$${INVITATION_LINK}\">Lien</a>")
                .textContent("Bonjour $${USER_NAME},\\nSupport: $${SUPPORT_EMAIL}\\nLien: $${INVITATION_LINK}")
                .language("fr")
                .isCurrent(true)
                .build();

        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));

        when(mailTypeRepository.findByCategory("AUTH_ACCOUNT_CREATED_INITIAL_PASSWORD"))
                .thenReturn(Optional.of(mailType));
        when(mailTemplateRepository.findCurrentByMailTypeAndLanguage(mailType, "fr"))
                .thenReturn(Optional.of(template));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        when(userRepository.findByEmail("josephine.mballa@example.com"))
                .thenReturn(Optional.of(User.builder().email("josephine.mballa@example.com").build()));
        when(jwtTokenProvider.generatePasswordResetToken(any(User.class))).thenReturn("jwt-token");

        service.enqueueInitialPasswordInvitationMail("josephine.mballa@example.com");

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());

        MimeMessage sent = captor.getValue();
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        sent.writeTo(output);
        String rawMessage = output.toString(StandardCharsets.UTF_8);

        assertThat(sent.getSubject()).isEqualTo("Invitation AERIXA - Finalisez votre acces");
        assertThat(rawMessage).contains("Bonjour josephine.mballa@example.com");
        assertThat(rawMessage).contains("Support: no-reply@aerixa-app.com");
        assertThat(rawMessage).contains("<p>Bonjour josephine.mballa@example.com</p>");
                assertThat(rawMessage).contains("token=jwt-token");
        assertThat(rawMessage).doesNotContain("$${");
        assertThat(rawMessage).doesNotContain("\\nSupport:");
    }
}