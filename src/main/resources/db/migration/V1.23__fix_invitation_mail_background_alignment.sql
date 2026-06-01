-- V1.23__fix_invitation_mail_background_alignment.sql
-- Corrige le decalage visuel du background dans le template d'invitation

UPDATE auth.mail_templates AS t
SET
    html_content = $invitation_background_fixed_html$
<!doctype html>
<html lang="fr" style="margin:0;padding:0;background:#07142f;">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Invitation AERIXA</title>
  <style>
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #07142f !important;
    }

    table, td {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }

    @media only screen and (max-width: 620px) {
      .mail-shell {
        width: 100% !important;
      }

      .mail-card {
        border-radius: 18px !important;
      }

      .mail-pad {
        padding-left: 22px !important;
        padding-right: 22px !important;
      }

      .mail-title {
        font-size: 17px !important;
        line-height: 1.35 !important;
      }

      .mail-copy {
        font-size: 14px !important;
      }

      .mail-button {
        display: block !important;
        width: 100% !important;
        text-align: center !important;
        box-sizing: border-box !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#07142f;font-family:'Grift','Aptos','Segoe UI','Helvetica Neue',Arial,sans-serif;color:#e8eefb;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;padding:26px 14px;background:#07142f;background-image:radial-gradient(circle at 18% 20%, rgba(116,72,255,0.28), transparent 36%),radial-gradient(circle at 85% 82%, rgba(17,195,214,0.18), transparent 40%);">
    <tr>
      <td align="center" valign="top" style="vertical-align:top;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="mail-shell" style="border-collapse:collapse;max-width:620px;">
          <tr>
            <td class="mail-card" style="background:#0d1a42;border:1px solid rgba(145,160,230,0.22);border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(3,9,27,0.38);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                <tr>
                  <td class="mail-pad" style="padding:28px 32px 10px 32px;text-align:center;font-family:'Grift','Aptos','Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:17px;line-height:1.2;font-weight:600;letter-spacing:0.08em;color:#ffffff;">
                    AERIXA
                  </td>
                </tr>
                <tr>
                  <td class="mail-pad" style="padding:2px 32px 8px 32px;font-family:'Grift','Aptos','Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.6;font-weight:400;color:#d7e1fb;">
                    Bonjour $${USER_NAME},
                  </td>
                </tr>
                <tr>
                  <td class="mail-pad mail-title" style="padding:0 32px 12px 32px;font-family:'Grift','Aptos','Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:22px;line-height:1.22;font-weight:600;letter-spacing:-0.02em;color:#ffffff;">
                    Votre invitation est prete.
                  </td>
                </tr>
                <tr>
                  <td class="mail-pad mail-copy" style="padding:0 32px 20px 32px;font-family:'Grift','Aptos','Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.68;font-weight:400;color:#c7d4f6;">
                    Finalisez votre acces en definissant votre mot de passe. Le lien ci-dessous vous permet d'activer votre espace $${SYSTEM_NAME} en quelques secondes.
                  </td>
                </tr>
                <tr>
                  <td class="mail-pad" style="padding:0 32px 22px 32px;">
                    <a href="$${INVITATION_LINK}" class="mail-button" style="display:inline-block;background:linear-gradient(90deg,#6f45ff 0%,#22c7cf 100%);color:#ffffff;text-decoration:none;font-family:'Grift','Aptos','Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.2;font-weight:600;padding:14px 22px;border-radius:999px;letter-spacing:0.01em;">Definir mon mot de passe</a>
                  </td>
                </tr>
                <tr>
                  <td class="mail-pad" style="padding:0 32px 22px 32px;font-family:'Grift','Aptos','Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:13px;line-height:1.7;font-weight:400;color:#8ea1d2;">
                    Si vous n'etes pas a l'origine de cette demande, ignorez simplement cet email.<br />
                    Lien direct : <a href="$${INVITATION_LINK}" style="color:#7fdcf3;text-decoration:underline;word-break:break-all;">$${INVITATION_LINK}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 32px 18px 32px;border-top:1px solid rgba(145,160,230,0.16);text-align:center;font-family:'Grift','Aptos','Segoe UI','Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.65;font-weight:400;color:#8093c0;">
                    $${SYSTEM_NAME} - Equipe support<br />
                    <a href="mailto:$${SUPPORT_EMAIL}" style="color:#a9dff1;text-decoration:none;">$${SUPPORT_EMAIL}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
$invitation_background_fixed_html$,
    preview = 'Invitation AERIXA - correction alignement background',
    updated_at = CURRENT_TIMESTAMP
FROM auth.mail_types AS mt
WHERE t.mail_type_id = mt.id
  AND t.language = 'fr'
  AND t.is_current = TRUE
  AND (
    mt.category = 'AUTH_ACCOUNT_CREATED_INITIAL_PASSWORD'
    OR mt.code = 'USER_INVITATION'
    OR mt.code = 'ACCOUNT_CREATED_INITIAL_PASSWORD'
  );
