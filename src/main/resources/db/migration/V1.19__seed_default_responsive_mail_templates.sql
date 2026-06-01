-- V1.19__seed_default_responsive_mail_templates.sql
-- Seed des templates mails par defaut (design dark, responsive, CTA en degrade)

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
    'Bienvenue sur $${SYSTEM_NAME}',
  $welcome_html$<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenue</title>
</head>
<body style="margin:0;padding:0;background:#030724;background-image:radial-gradient(circle at 15% 20%, rgba(99,63,255,0.32), transparent 38%),radial-gradient(circle at 85% 80%, rgba(0,190,210,0.26), transparent 40%);font-family:Arial,Helvetica,sans-serif;color:#e8ecff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#07153a;border:1px solid rgba(162,175,255,0.22);border-radius:22px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 16px 28px;text-align:center;">
              <div style="font-size:22px;font-weight:700;letter-spacing:0.8px;color:#ffffff;">$${SYSTEM_NAME}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 14px 28px;color:#cad6ff;font-size:20px;line-height:1.5;">Bonjour $${USER_NAME},</td>
          </tr>
          <tr>
            <td style="padding:0 28px 6px 28px;color:#ffffff;font-size:36px;line-height:1.2;font-weight:800;">Bienvenue sur votre espace</td>
          </tr>
          <tr>
            <td style="padding:0 28px 22px 28px;color:#d5defa;font-size:21px;line-height:1.5;">Votre compte est pret. Commencez des maintenant et profitez de toutes les fonctionnalites.</td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px 28px;">
              <a href="$${VERIFICATION_LINK}" style="display:inline-block;background:linear-gradient(90deg,#7a3dfd 0%,#22d0cf 100%);color:#ffffff;text-decoration:none;font-size:19px;font-weight:700;padding:16px 28px;border-radius:999px;">Activer mon compte</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px 28px;color:#8ba0d5;font-size:16px;line-height:1.7;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur:<br/><a href="$${VERIFICATION_LINK}" style="color:#8bd9ff;word-break:break-all;">$${VERIFICATION_LINK}</a></td>
          </tr>
          <tr>
            <td style="padding:18px 28px;border-top:1px solid rgba(160,172,255,0.18);text-align:center;color:#7f90be;font-size:14px;line-height:1.5;">$${SYSTEM_NAME} - Recrutement intelligent pour etablissements<br/>Support: <a href="mailto:$${SUPPORT_EMAIL}" style="color:#8bd9ff;">$${SUPPORT_EMAIL}</a></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$welcome_html$,
    'Bonjour $${USER_NAME},\n\nBienvenue sur $${SYSTEM_NAME}.\nActivez votre compte ici: $${VERIFICATION_LINK}\n\nSupport: $${SUPPORT_EMAIL}',
    'Bienvenue sur $${SYSTEM_NAME}',
    1,
    TRUE,
    'fr',
    'Template par defaut responsive - WELCOME_EMAIL',
    'USER_NAME|SYSTEM_NAME|VERIFICATION_LINK|SUPPORT_EMAIL',
    (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000)::BIGINT,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM auth.mail_types mt
WHERE mt.code = 'WELCOME_EMAIL'
  AND NOT EXISTS (
    SELECT 1 FROM auth.mail_templates t
    WHERE t.mail_type_id = mt.id AND t.language = 'fr'
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
    'Invitation $${SYSTEM_NAME} - Finalisez votre acces',
  $invitation_html$<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invitation utilisateur</title>
</head>
<body style="margin:0;padding:0;background:#030724;background-image:radial-gradient(circle at 10% 15%, rgba(122,61,253,0.34), transparent 40%),radial-gradient(circle at 85% 78%, rgba(0,200,210,0.24), transparent 42%);font-family:Arial,Helvetica,sans-serif;color:#e8ecff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#07153a;border:1px solid rgba(162,175,255,0.22);border-radius:22px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 14px 28px;text-align:center;">
              <div style="font-size:22px;font-weight:700;letter-spacing:0.8px;color:#ffffff;">$${SYSTEM_NAME}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 12px 28px;color:#cad6ff;font-size:20px;line-height:1.5;">Bonjour $${USER_NAME},</td>
          </tr>
          <tr>
            <td style="padding:0 28px 8px 28px;color:#ffffff;font-size:34px;line-height:1.2;font-weight:800;">Vous etes invite a rejoindre la plateforme</td>
          </tr>
          <tr>
            <td style="padding:0 28px 22px 28px;color:#d5defa;font-size:20px;line-height:1.55;">Votre acces est presque pret. Confirmez votre invitation pour definir votre mot de passe et commencer.</td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px 28px;">
              <a href="$${INVITATION_LINK}" style="display:inline-block;background:linear-gradient(90deg,#7a3dfd 0%,#22d0cf 100%);color:#ffffff;text-decoration:none;font-size:19px;font-weight:700;padding:16px 28px;border-radius:999px;">Accepter l'invitation</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px 28px;color:#8ba0d5;font-size:16px;line-height:1.7;">Si ce message ne vous est pas destine, ignorez cet email.<br/>Lien direct: <a href="$${INVITATION_LINK}" style="color:#8bd9ff;word-break:break-all;">$${INVITATION_LINK}</a></td>
          </tr>
          <tr>
            <td style="padding:18px 28px;border-top:1px solid rgba(160,172,255,0.18);text-align:center;color:#7f90be;font-size:14px;line-height:1.5;">$${SYSTEM_NAME} - Equipe support<br/><a href="mailto:$${SUPPORT_EMAIL}" style="color:#8bd9ff;">$${SUPPORT_EMAIL}</a></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$invitation_html$,
    'Bonjour $${USER_NAME},\n\nVous etes invite sur $${SYSTEM_NAME}.\nAcceptez l''invitation: $${INVITATION_LINK}\n\nSupport: $${SUPPORT_EMAIL}',
    'Invitation a rejoindre $${SYSTEM_NAME}',
    1,
    TRUE,
    'fr',
    'Template par defaut responsive - USER_INVITATION',
    'USER_NAME|SYSTEM_NAME|INVITATION_LINK|SUPPORT_EMAIL',
    (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000)::BIGINT,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM auth.mail_types mt
WHERE mt.code = 'USER_INVITATION'
  AND NOT EXISTS (
    SELECT 1 FROM auth.mail_templates t
    WHERE t.mail_type_id = mt.id AND t.language = 'fr'
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
    'Reinitialisez votre mot de passe $${SYSTEM_NAME}',
  $reset_html$<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reinitialisation mot de passe</title>
</head>
<body style="margin:0;padding:0;background:#030724;background-image:radial-gradient(circle at 18% 18%, rgba(122,61,253,0.34), transparent 38%),radial-gradient(circle at 86% 80%, rgba(0,200,210,0.24), transparent 42%);font-family:Arial,Helvetica,sans-serif;color:#e8ecff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#07153a;border:1px solid rgba(162,175,255,0.22);border-radius:22px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 14px 28px;text-align:center;">
              <div style="font-size:22px;font-weight:700;letter-spacing:0.8px;color:#ffffff;">$${SYSTEM_NAME}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 12px 28px;color:#cad6ff;font-size:20px;line-height:1.5;">Bonjour $${USER_NAME},</td>
          </tr>
          <tr>
            <td style="padding:0 28px 8px 28px;color:#ffffff;font-size:34px;line-height:1.2;font-weight:800;">Reinitialisation de votre mot de passe</td>
          </tr>
          <tr>
            <td style="padding:0 28px 22px 28px;color:#d5defa;font-size:20px;line-height:1.55;">Une demande de reinitialisation a ete effectuee. Pour securiser votre compte, choisissez un nouveau mot de passe.</td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px 28px;">
              <a href="$${RESET_LINK}" style="display:inline-block;background:linear-gradient(90deg,#7a3dfd 0%,#22d0cf 100%);color:#ffffff;text-decoration:none;font-size:19px;font-weight:700;padding:16px 28px;border-radius:999px;">Reinitialiser mon mot de passe</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px 28px;color:#8ba0d5;font-size:16px;line-height:1.7;">Si vous n'etes pas a l'origine de cette demande, ignorez cet email.<br/>Lien direct: <a href="$${RESET_LINK}" style="color:#8bd9ff;word-break:break-all;">$${RESET_LINK}</a></td>
          </tr>
          <tr>
            <td style="padding:18px 28px;border-top:1px solid rgba(160,172,255,0.18);text-align:center;color:#7f90be;font-size:14px;line-height:1.5;">$${SYSTEM_NAME} - Assistance securite<br/><a href="mailto:$${SUPPORT_EMAIL}" style="color:#8bd9ff;">$${SUPPORT_EMAIL}</a></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$reset_html$,
    'Bonjour $${USER_NAME},\n\nReinitialisez votre mot de passe ici: $${RESET_LINK}\n\nSi vous n''etes pas a l''origine de cette demande, ignorez cet email.\nSupport: $${SUPPORT_EMAIL}',
    'Reinitialisation de mot de passe $${SYSTEM_NAME}',
    1,
    TRUE,
    'fr',
    'Template par defaut responsive - PASSWORD_RESET',
    'USER_NAME|SYSTEM_NAME|RESET_LINK|SUPPORT_EMAIL',
    (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000)::BIGINT,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM auth.mail_types mt
WHERE mt.code = 'PASSWORD_RESET'
  AND NOT EXISTS (
    SELECT 1 FROM auth.mail_templates t
    WHERE t.mail_type_id = mt.id AND t.language = 'fr'
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
    'Verification de votre adresse email $${SYSTEM_NAME}',
  $verification_html$<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verification email</title>
</head>
<body style="margin:0;padding:0;background:#030724;background-image:radial-gradient(circle at 14% 22%, rgba(122,61,253,0.34), transparent 38%),radial-gradient(circle at 88% 80%, rgba(0,200,210,0.24), transparent 42%);font-family:Arial,Helvetica,sans-serif;color:#e8ecff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#07153a;border:1px solid rgba(162,175,255,0.22);border-radius:22px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 14px 28px;text-align:center;">
              <div style="font-size:22px;font-weight:700;letter-spacing:0.8px;color:#ffffff;">$${SYSTEM_NAME}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 12px 28px;color:#cad6ff;font-size:20px;line-height:1.5;">Bonjour $${USER_NAME},</td>
          </tr>
          <tr>
            <td style="padding:0 28px 8px 28px;color:#ffffff;font-size:34px;line-height:1.2;font-weight:800;">Verification de votre compte</td>
          </tr>
          <tr>
            <td style="padding:0 28px 22px 28px;color:#d5defa;font-size:20px;line-height:1.55;">Confirmez votre adresse email pour activer votre espace $${SYSTEM_NAME}.</td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px 28px;">
              <a href="$${VERIFICATION_LINK}" style="display:inline-block;background:linear-gradient(90deg,#7a3dfd 0%,#22d0cf 100%);color:#ffffff;text-decoration:none;font-size:19px;font-weight:700;padding:16px 28px;border-radius:999px;">Verifier mon compte</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px 28px;color:#8ba0d5;font-size:16px;line-height:1.7;">Si vous n'etes pas a l'origine de cette inscription, ignorez cet email.<br/>Lien direct: <a href="$${VERIFICATION_LINK}" style="color:#8bd9ff;word-break:break-all;">$${VERIFICATION_LINK}</a></td>
          </tr>
          <tr>
            <td style="padding:18px 28px;border-top:1px solid rgba(160,172,255,0.18);text-align:center;color:#7f90be;font-size:14px;line-height:1.5;">$${SYSTEM_NAME} - Portail securise<br/>Support: <a href="mailto:$${SUPPORT_EMAIL}" style="color:#8bd9ff;">$${SUPPORT_EMAIL}</a></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$verification_html$,
    'Bonjour $${USER_NAME},\n\nConfirmez votre email: $${VERIFICATION_LINK}\n\nSi vous n''etes pas a l''origine de cette inscription, ignorez cet email.\nSupport: $${SUPPORT_EMAIL}',
    'Verification de votre compte $${SYSTEM_NAME}',
    1,
    TRUE,
    'fr',
    'Template par defaut responsive - EMAIL_VERIFICATION',
    'USER_NAME|SYSTEM_NAME|VERIFICATION_LINK|SUPPORT_EMAIL',
    (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000)::BIGINT,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM auth.mail_types mt
WHERE mt.code = 'EMAIL_VERIFICATION'
  AND NOT EXISTS (
    SELECT 1 FROM auth.mail_templates t
    WHERE t.mail_type_id = mt.id AND t.language = 'fr'
  );
