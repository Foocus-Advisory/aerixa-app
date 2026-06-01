-- V1.20__ensure_initial_password_invitation_template.sql
-- Garantit l'existence du type/template pour l'invitation de definition de mot de passe

INSERT INTO auth.mail_types (
    code,
    category,
    name,
    description,
    default_recipient,
    active,
    min_resend_interval_seconds,
    max_retries,
    show_system_comments
)
SELECT
    'ACCOUNT_CREATED_INITIAL_PASSWORD',
    'AUTH_ACCOUNT_CREATED_INITIAL_PASSWORD',
    'Creation compte et initialisation mot de passe',
    'Template d''invitation apres creation de compte utilisateur',
    'USER',
    TRUE,
    0,
    3,
    TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM auth.mail_types mt
    WHERE mt.category = 'AUTH_ACCOUNT_CREATED_INITIAL_PASSWORD'
);

INSERT INTO auth.mail_templates (
    mail_type_id,
    subject,
    html_content,
    text_content,
    preview,
    version_number,
    is_current,
    language,
    version_notes,
    supported_variables,
    published_at,
    created_at,
    updated_at
)
SELECT
    mt.id,
    'Bienvenue sur $${SYSTEM_NAME} - Definissez votre mot de passe',
    $invite_html$<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Configuration du mot de passe</title>
</head>
<body style="margin:0;padding:0;background:#f5f7ff;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:24px 24px 12px 24px;text-align:center;font-size:22px;font-weight:700;color:#0f172a;">$${SYSTEM_NAME}</td>
          </tr>
          <tr>
            <td style="padding:0 24px 8px 24px;font-size:18px;color:#111827;">Bonjour $${USER_NAME},</td>
          </tr>
          <tr>
            <td style="padding:0 24px 16px 24px;font-size:15px;line-height:1.6;color:#374151;">
              Votre compte vient d'etre cree. Cliquez sur le bouton ci-dessous pour definir votre mot de passe et finaliser votre premiere connexion.
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 20px 24px;">
              <a href="$${INVITATION_LINK}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:12px 20px;border-radius:999px;">Definir mon mot de passe</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 20px 24px;font-size:13px;line-height:1.6;color:#6b7280;">
              Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur:<br/>
              <a href="$${INVITATION_LINK}" style="color:#2563eb;word-break:break-all;">$${INVITATION_LINK}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$invite_html$,
    'Bonjour $${USER_NAME},\n\nVotre compte a ete cree sur $${SYSTEM_NAME}.\nDefinissez votre mot de passe ici: $${INVITATION_LINK}\n\nSi vous n''etes pas a l''origine de cette demande, ignorez cet email.',
    'Invitation a definir le mot de passe',
    1,
    TRUE,
    'fr',
    'Template par defaut - AUTH_ACCOUNT_CREATED_INITIAL_PASSWORD',
    'USER_NAME|SYSTEM_NAME|INVITATION_LINK|USER_EMAIL',
    (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000)::BIGINT,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM auth.mail_types mt
WHERE mt.category = 'AUTH_ACCOUNT_CREATED_INITIAL_PASSWORD'
  AND NOT EXISTS (
    SELECT 1
    FROM auth.mail_templates t
    WHERE t.mail_type_id = mt.id AND t.language = 'fr'
  );
