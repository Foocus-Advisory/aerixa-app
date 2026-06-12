package com.aerixa.app.domain.mail.model;

import java.util.Arrays;

public enum MailTypeCategory {
    AUTH_PASSWORD_RESET(
            "AUTH",
            "RESET_PASSWORD",
            "PASSWORD_RESET",
            "Reinitialisation mot de passe",
            "Envoi du lien de reinitialisation mot de passe"
    ),
    AUTH_EMAIL_VERIFICATION(
            "AUTH",
            "VERIFY_EMAIL",
            "EMAIL_VERIFICATION",
            "Verification email",
            "Envoi du lien de verification email"
    ),
    AUTH_RESEND_EMAIL_VERIFICATION(
            "AUTH",
            "RESEND_VERIFY_EMAIL",
            "RESEND_EMAIL_VERIFICATION",
            "Relance verification email",
            "Renvoi du lien de verification email"
    ),
    AUTH_ACCOUNT_CREATED_INITIAL_PASSWORD(
            "AUTH",
            "ACCOUNT_CREATED_INITIALIZE_PASSWORD",
            "ACCOUNT_CREATED_INITIAL_PASSWORD",
            "Creation compte et initialisation mot de passe",
            "Invitation apres creation de compte"
    ),
    ACCOUNT_ACTION_REMINDER(
            "ACCOUNT",
            "ACTION_REMINDER",
            "ACCOUNT_ACTION_REMINDER",
            "Relance action compte",
            "Relance pour une action precise sur le compte"
    ),
    ACCOUNT_SUSPENDED(
            "ACCOUNT",
            "SUSPEND",
            "ACCOUNT_SUSPENDED",
            "Suspension de compte",
            "Notification de suspension de compte"
    ),
    ACCOUNT_REACTIVATED(
            "ACCOUNT",
            "REACTIVATE",
            "ACCOUNT_REACTIVATED",
            "Reactivation de compte",
            "Notification de reactivation de compte"
    ),
    SYSTEM_NOTIFICATION(
            "SYSTEM",
            "NOTIFY",
            "SYSTEM_NOTIFICATION",
            "Notification par mail",
            "Notification systeme par email"
    ),
    CANDIDATE_APPLICATION_ACCEPTED(
            "CANDIDATES",
            "APPLICATION_ACCEPTED",
            "CANDIDATE_APPLICATION_ACCEPTED",
            "Candidature acceptee",
            "Felicitations envoyees au candidat lorsque sa candidature atteint une etape d'admission finale"
    );

    private final String module;
    private final String action;
    private final String defaultCode;
    private final String label;
    private final String description;

    MailTypeCategory(String module, String action, String defaultCode, String label, String description) {
        this.module = module;
        this.action = action;
        this.defaultCode = defaultCode;
        this.label = label;
        this.description = description;
    }

    public String getModule() {
        return module;
    }

    public String getAction() {
        return action;
    }

    public String getDefaultCode() {
        return defaultCode;
    }

    public String getLabel() {
        return label;
    }

    public String getDescription() {
        return description;
    }

    public static MailTypeCategory fromValue(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            throw new IllegalArgumentException("Mail type category is required");
        }

        return Arrays.stream(values())
                .filter(value -> value.name().equalsIgnoreCase(rawValue.trim()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported mail type category: " + rawValue));
    }
}
