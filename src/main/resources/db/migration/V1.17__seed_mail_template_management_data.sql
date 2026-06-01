-- V1.17__seed_mail_template_management_data.sql
-- Seed initial des types de mail et variables de base

INSERT INTO auth.mail_types (code, name, description, default_recipient, active, min_resend_interval_seconds, max_retries, show_system_comments)
VALUES
    ('PASSWORD_RESET', 'Reinitialisation mot de passe', 'Template pour la reinitialisation du mot de passe utilisateur', 'USER', TRUE, 60, 3, TRUE),
    ('USER_INVITATION', 'Invitation utilisateur', 'Template pour inviter un utilisateur a rejoindre la plateforme', 'USER', TRUE, 0, 3, TRUE),
    ('EMAIL_VERIFICATION', 'Verification email', 'Template pour verifier l''adresse email utilisateur', 'USER', TRUE, 0, 3, TRUE),
    ('WELCOME_EMAIL', 'Email de bienvenue', 'Template de bienvenue apres activation de compte', 'USER', TRUE, 0, 3, TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO auth.mail_template_variables (code, label, description, example_value, category, data_type, required, active, display_order, pattern, applicable_mail_types)
VALUES
    ('USER_NAME', 'Nom utilisateur', 'Nom complet de l''utilisateur', 'Jean Dupont', 'USER', 'STRING', TRUE, TRUE, 10, NULL, 'PASSWORD_RESET|USER_INVITATION|EMAIL_VERIFICATION|WELCOME_EMAIL'),
    ('USER_EMAIL', 'Email utilisateur', 'Adresse email du destinataire', 'jean.dupont@example.com', 'USER', 'EMAIL', TRUE, TRUE, 20, '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$', 'PASSWORD_RESET|USER_INVITATION|EMAIL_VERIFICATION|WELCOME_EMAIL'),
    ('RESET_LINK', 'Lien de reinitialisation', 'URL de reinitialisation de mot de passe', 'https://app.example.com/reset?token=abc', 'ACTION', 'URL', TRUE, TRUE, 30, '^https?://.+', 'PASSWORD_RESET'),
    ('INVITATION_LINK', 'Lien d''invitation', 'URL d''acceptation de l''invitation', 'https://app.example.com/invite?token=xyz', 'ACTION', 'URL', TRUE, TRUE, 40, '^https?://.+', 'USER_INVITATION'),
    ('VERIFICATION_LINK', 'Lien de verification', 'URL de verification de l''email', 'https://api.example.com/verify-email?token=123', 'ACTION', 'URL', TRUE, TRUE, 50, '^https?://.+', 'EMAIL_VERIFICATION'),
    ('SYSTEM_NAME', 'Nom du systeme', 'Nom de la plateforme expeditrice', 'AERIXA', 'SYSTEM', 'STRING', TRUE, TRUE, 60, NULL, 'PASSWORD_RESET|USER_INVITATION|EMAIL_VERIFICATION|WELCOME_EMAIL'),
    ('SUPPORT_EMAIL', 'Email support', 'Adresse email du support', 'support@aerixa.com', 'SYSTEM', 'EMAIL', FALSE, TRUE, 70, '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$', 'PASSWORD_RESET|USER_INVITATION|EMAIL_VERIFICATION|WELCOME_EMAIL'),
    ('CURRENT_YEAR', 'Annee courante', 'Annee courante pour le footer', '2026', 'SYSTEM', 'STRING', FALSE, TRUE, 80, '^[0-9]{4}$', 'PASSWORD_RESET|USER_INVITATION|EMAIL_VERIFICATION|WELCOME_EMAIL')
ON CONFLICT (code) DO NOTHING;
