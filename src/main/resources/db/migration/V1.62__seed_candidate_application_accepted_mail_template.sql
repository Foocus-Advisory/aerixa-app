-- V1.62__seed_candidate_application_accepted_mail_template.sql
-- Seed du MailType/MailTemplate pour la categorie CANDIDATE_APPLICATION_ACCEPTED
-- (mail de felicitations envoye au candidat lorsque sa candidature atteint une etape FINAL_SUCCESS)

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
    'CANDIDATE_APPLICATION_ACCEPTED',
    'CANDIDATE_APPLICATION_ACCEPTED',
    'Candidature acceptee',
    'Mail de felicitations envoye au candidat lorsque sa candidature atteint une etape d''admission finale',
    'CANDIDATE',
    TRUE,
    0,
    3,
    TRUE
WHERE NOT EXISTS (
    SELECT 1
    FROM auth.mail_types mt
    WHERE mt.category = 'CANDIDATE_APPLICATION_ACCEPTED'
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
    'Felicitations $${CANDIDATE_NAME}, votre candidature est acceptee !',
    $accepted_html$<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Candidature acceptee</title>
</head>
<body style="margin:0;padding:0;background:#f5f7ff;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:24px 24px 12px 24px;text-align:center;font-size:22px;font-weight:700;color:#0f172a;">$${ESTABLISHMENT_NAME}</td>
          </tr>
          <tr>
            <td style="padding:0 24px 8px 24px;font-size:18px;color:#111827;">Felicitations $${CANDIDATE_NAME},</td>
          </tr>
          <tr>
            <td style="padding:0 24px 16px 24px;font-size:15px;line-height:1.6;color:#374151;">
              Nous avons le plaisir de vous informer que votre candidature pour la filiere
              <strong>$${PROGRAM_TRACK_NAME}</strong> - niveau <strong>$${ACADEMIC_LEVEL_NAME}</strong>
              a ete acceptee par $${ESTABLISHMENT_NAME}.
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 20px 24px;font-size:15px;line-height:1.6;color:#374151;">
              Notre equipe reviendra vers vous prochainement avec les prochaines etapes a suivre.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$accepted_html$,
    'Felicitations $${CANDIDATE_NAME},\n\nVotre candidature pour la filiere $${PROGRAM_TRACK_NAME} - niveau $${ACADEMIC_LEVEL_NAME} a ete acceptee par $${ESTABLISHMENT_NAME}.\n\nNotre equipe reviendra vers vous prochainement avec les prochaines etapes a suivre.',
    'Votre candidature a ete acceptee',
    1,
    TRUE,
    'fr',
    'Template par defaut - CANDIDATE_APPLICATION_ACCEPTED',
    'CANDIDATE_NAME|PROGRAM_TRACK_NAME|ACADEMIC_LEVEL_NAME|ESTABLISHMENT_NAME',
    (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000)::BIGINT,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM auth.mail_types mt
WHERE mt.category = 'CANDIDATE_APPLICATION_ACCEPTED'
  AND NOT EXISTS (
    SELECT 1
    FROM auth.mail_templates t
    WHERE t.mail_type_id = mt.id AND t.language = 'fr'
);
