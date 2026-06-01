package com.aerixa.app.infrastructure.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Custom application properties, bindées depuis le préfixe "app" dans application.yml.
 * Chaque champ correspond à une variable d'environnement déclarée dans les fichiers .env.
 */
@Component
@ConfigurationProperties(prefix = "app")
@Getter
@Setter
public class AppProperties {

    private Mail mail = new Mail();
    private Portal portal = new Portal();
    private Email email = new Email();
    private Notifications notifications = new Notifications();

    @Getter
    @Setter
    public static class Mail {
        /** Adresse expéditeur des emails système — MAIL_FROM */
        private String from;
    }

    @Getter
    @Setter
    public static class Portal {
        /** URL de la page login du portail web — PORTAL_LOGIN_URL */
        private String loginUrl;

        /** URL de base pour le lien de réinitialisation de mot de passe — PASSWORD_RESET_BASE_URL */
        private String passwordResetBaseUrl;

        /** URL de base pour la définition du mot de passe des invitations opérateur — OPERATOR_PASSWORD_SETUP_BASE_URL */
        private String operatorPasswordSetupBaseUrl;
    }

    @Getter
    @Setter
    public static class Email {
        /** URL de vérification email exposée par l'API (doit inclure ?token=) — EMAIL_VERIFICATION_BASE_URL */
        private String verificationBaseUrl;
    }

    @Getter
    @Setter
    public static class Notifications {
        private MailNotif mail = new MailNotif();
        private WebSocketNotif websocket = new WebSocketNotif();

        @Getter
        @Setter
        public static class MailNotif {
            /** Active/désactive l'envoi d'emails de notification — NOTIF_MAIL_ENABLED */
            private boolean enabled = true;

            /** Si true, propage l'erreur SMTP au lieu de l'ignorer — PASSWORD_RESET_FAIL_ON_EMAIL_ERROR */
            private boolean failOnError = true;

            /** Destinataire global des notifications email (vide = email du candidat) — NOTIF_MAIL_RECIPIENT */
            private String recipient;

            /** Destinataire dédié pour les notifications de changement d'étape — NOTIF_MAIL_STAGE_RECIPIENT */
            private String stageRecipient;

            /** Destinataire fallback en cas d'échec SMTP persistant — NOTIF_MAIL_FALLBACK_RECIPIENT */
            private String fallbackRecipient;

            /** Nombre de tentatives d'envoi avant fallback — NOTIF_MAIL_RETRY_ATTEMPTS */
            private int retryAttempts = 3;

            /** Backoff de base (ms) entre retries — NOTIF_MAIL_RETRY_BACKOFF_MILLIS */
            private long retryBackoffMillis = 1000;
        }

        @Getter
        @Setter
        public static class WebSocketNotif {
            /** Active/désactive les notifications WebSocket — NOTIF_WEBSOCKET_ENABLED */
            private boolean enabled = true;
        }
    }
}
