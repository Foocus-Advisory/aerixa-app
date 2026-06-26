import type { Guide } from "./types";

export const whatsappConfigurationGuide: Guide = {
  title: {
    fr: "Guide de configuration du WhatsApp Business pour votre établissement",
    en: "WhatsApp Business configuration guide for your establishment",
  },
  icon: "messageCircle",
  intro: [
    {
      fr: "Ce guide est destiné aux utilisateurs ADMIN d'un établissement sur AERIXA. Il explique comment connecter le numéro WhatsApp Business de votre établissement à la plateforme afin d'utiliser la section Échanges sur les fiches candidats.",
      en: "This guide is intended for ADMIN users of an establishment on AERIXA. It explains how to connect your establishment's WhatsApp Business number to the platform in order to use the Conversations section on candidate profiles.",
    },
  ],
  sections: [
    {
      heading: { fr: "Avant de commencer", en: "Before you start" },
      icon: "rocket",
      blocks: [
        { type: "paragraph", text: { fr: "Vous aurez besoin de :", en: "You will need:" } },
        {
          type: "list",
          items: [
            {
              fr: "Un numéro de téléphone dédié à votre établissement, différent de celui utilisé sur l'application WhatsApp ou WhatsApp Business grand public (ce numéro ne pourra plus être utilisé dans l'app mobile WhatsApp une fois basculé sur l'API)",
              en: "A phone number dedicated to your establishment, different from the one used on the WhatsApp or WhatsApp Business consumer app (this number can no longer be used in the WhatsApp mobile app once switched to the API)",
            },
            {
              fr: "Un accès administrateur à un compte Meta Business Manager (gratuit, à créer sur business.facebook.com si vous n'en avez pas)",
              en: "Administrator access to a Meta Business Manager account (free, create one at business.facebook.com if you don't have one)",
            },
            { fr: "Environ 30 à 45 minutes", en: "About 30 to 45 minutes" },
          ],
        },
        {
          type: "quote",
          text: {
            fr: "Ce guide correspond au Modèle B décrit dans la documentation d'intégration WhatsApp (configuration manuelle). Il s'agit du modèle officiel proposé par Meta pour les entreprises qui gèrent elles-mêmes leur compte WhatsApp Business — ce n'est pas une solution de contournement.",
            en: "This guide corresponds to Model B described in the WhatsApp integration documentation (manual configuration). It is the official model proposed by Meta for businesses that manage their own WhatsApp Business account — it is not a workaround.",
          },
        },
      ],
    },
    {
      heading: { fr: "Étape 1 — Créer ou ouvrir votre Meta Business Manager", en: "Step 1 — Create or open your Meta Business Manager" },
      icon: "settings",
      blocks: [
        {
          type: "list",
          ordered: true,
          items: [
            { fr: "Rendez-vous sur business.facebook.com", en: "Go to business.facebook.com" },
            {
              fr: "Connectez-vous avec un compte Facebook professionnel (ou créez-en un dédié à l'établissement)",
              en: "Sign in with a professional Facebook account (or create one dedicated to the establishment)",
            },
            {
              fr: "Si vous n'avez pas encore d'espace \"Business Manager\", cliquez sur Créer un compte et renseignez le nom de votre établissement",
              en: "If you don't have a \"Business Manager\" space yet, click Create an account and enter your establishment's name",
            },
          ],
        },
      ],
    },
    {
      heading: { fr: "Étape 2 — Créer une App Meta avec le produit WhatsApp", en: "Step 2 — Create a Meta App with the WhatsApp product" },
      icon: "sparkles",
      blocks: [
        {
          type: "list",
          ordered: true,
          items: [
            { fr: "Allez sur developers.facebook.com/apps", en: "Go to developers.facebook.com/apps" },
            { fr: "Cliquez sur Créer une application", en: "Click Create an app" },
            { fr: "Choisissez le type Entreprise (Business)", en: "Choose the Business app type" },
            { fr: "Donnez un nom à l'application (ex : \"ISTEC WhatsApp\")", en: "Give the app a name (e.g. \"ISTEC WhatsApp\")" },
            {
              fr: "Une fois l'application créée, dans le tableau de bord, ajoutez le produit WhatsApp (bouton Configurer)",
              en: "Once the app is created, on the dashboard, add the WhatsApp product (Set up button)",
            },
          ],
        },
      ],
    },
    {
      heading: { fr: "Étape 3 — Créer votre WABA et votre numéro WhatsApp Business", en: "Step 3 — Create your WABA and your WhatsApp Business number" },
      icon: "radio",
      blocks: [
        {
          type: "list",
          ordered: true,
          items: [
            {
              fr: "Dans la configuration WhatsApp de votre App, suivez l'assistant pour créer (ou relier) un compte WhatsApp Business (WABA)",
              en: "In your App's WhatsApp configuration, follow the wizard to create (or link) a WhatsApp Business Account (WABA)",
            },
            {
              fr: "Ajoutez votre numéro de téléphone dédié : saisissez le numéro au format international, choisissez la vérification par SMS ou appel vocal, validez le code reçu",
              en: "Add your dedicated phone number: enter the number in international format, choose verification by SMS or voice call, confirm the received code",
            },
            {
              fr: "Notez le nom affiché (display name) que verront vos candidats — il doit correspondre au nom de votre établissement (sujet à vérification par Meta pour les noms définitifs)",
              en: "Note the display name your candidates will see — it must match your establishment's name (subject to Meta verification for final names)",
            },
          ],
        },
      ],
    },
    {
      heading: { fr: "Étape 4 — Récupérer les identifiants nécessaires", en: "Step 4 — Retrieve the required credentials" },
      icon: "search",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "Dans le tableau de bord WhatsApp de votre App Meta (section API Setup / Configuration de l'API), notez :",
            en: "In your Meta App's WhatsApp dashboard (API Setup section), note down:",
          },
        },
        {
          type: "table",
          headers: [
            { fr: "Information", en: "Information" },
            { fr: "Où la trouver", en: "Where to find it" },
          ],
          rows: [
            [
              { fr: "Phone Number ID", en: "Phone Number ID" },
              {
                fr: "Section \"From\" / numéro de téléphone, sous le numéro affiché",
                en: "\"From\" section / phone number, below the displayed number",
              },
            ],
            [
              { fr: "WhatsApp Business Account ID (WABA ID)", en: "WhatsApp Business Account ID (WABA ID)" },
              { fr: "Section \"WhatsApp Business Account\"", en: "\"WhatsApp Business Account\" section" },
            ],
            [
              { fr: "Numéro affiché (display phone number)", en: "Display phone number" },
              { fr: "Le numéro international configuré à l'étape 3", en: "The international number configured in step 3" },
            ],
          ],
        },
      ],
    },
    {
      heading: { fr: "Étape 5 — Générer un token d'accès permanent (System User)", en: "Step 5 — Generate a permanent access token (System User)" },
      icon: "key",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "Le token temporaire affiché par défaut dans l'interface expire au bout de 24h. Pour un usage en production, générez un token permanent via un System User :",
            en: "The temporary token shown by default in the interface expires after 24 hours. For production use, generate a permanent token via a System User:",
          },
        },
        {
          type: "list",
          ordered: true,
          items: [
            {
              fr: "Dans Business Manager, allez dans Paramètres de l'entreprise > Utilisateurs > Utilisateurs systèmes",
              en: "In Business Manager, go to Business Settings > Users > System Users",
            },
            {
              fr: "Cliquez sur Ajouter, donnez un nom (ex : \"AERIXA Integration\"), rôle Admin",
              en: "Click Add, give it a name (e.g. \"AERIXA Integration\"), role Admin",
            },
            {
              fr: "Une fois créé, cliquez sur Ajouter des actifs et associez : votre App Meta (créée à l'étape 2) avec le rôle Manage app, et votre WABA (créé à l'étape 3) avec le rôle Manage WhatsApp Business Account",
              en: "Once created, click Add Assets and link: your Meta App (created in step 2) with the Manage app role, and your WABA (created in step 3) with the Manage WhatsApp Business Account role",
            },
            {
              fr: "Cliquez sur Générer un nouveau token : application = celle créée à l'étape 2 ; permissions = cochez whatsapp_business_messaging et whatsapp_business_management ; durée = Token sans expiration (ou la durée maximale proposée)",
              en: "Click Generate new token: app = the one created in step 2; permissions = check whatsapp_business_messaging and whatsapp_business_management; duration = Never expires (or the maximum duration offered)",
            },
            {
              fr: "Copiez immédiatement ce token (il ne sera plus affiché par la suite) et conservez-le dans un gestionnaire de mots de passe en attendant l'étape suivante",
              en: "Copy this token immediately (it will not be shown again) and keep it in a password manager until the next step",
            },
          ],
        },
        {
          type: "quote",
          text: {
            fr: "Ce token donne accès à l'envoi de messages au nom de votre établissement. Ne le partagez jamais en dehors de la configuration AERIXA.",
            en: "This token grants access to send messages on behalf of your establishment. Never share it outside of the AERIXA configuration.",
          },
        },
      ],
    },
    {
      heading: { fr: "Étape 6 — Renseigner la configuration dans AERIXA", en: "Step 6 — Enter the configuration in AERIXA" },
      icon: "settings",
      blocks: [
        {
          type: "list",
          ordered: true,
          items: [
            { fr: "Connectez-vous à AERIXA en tant qu'ADMIN de votre établissement", en: "Log in to AERIXA as an ADMIN of your establishment" },
            { fr: "Allez dans Paramètres > Établissement > onglet WhatsApp Business", en: "Go to Settings > Establishment > WhatsApp Business tab" },
            {
              fr: "Renseignez : WABA ID, Phone Number ID, Numéro affiché (étape 4) et Token d'accès (étape 5)",
              en: "Enter: WABA ID, Phone Number ID, Display number (step 4) and Access token (step 5)",
            },
            {
              fr: "Enregistrez. Le statut de connexion passe à En attente de vérification, puis Active une fois le webhook configuré (étape suivante)",
              en: "Save. The connection status changes to Pending verification, then Active once the webhook is configured (next step)",
            },
          ],
        },
      ],
    },
    {
      heading: { fr: "Étape 7 — Configurer le webhook (réception des messages)", en: "Step 7 — Configure the webhook (receiving messages)" },
      icon: "link",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "Pour que les réponses de vos candidats apparaissent dans AERIXA, vous devez indiquer à Meta où envoyer les messages reçus.",
            en: "For your candidates' replies to appear in AERIXA, you must tell Meta where to send received messages.",
          },
        },
        {
          type: "list",
          ordered: true,
          items: [
            {
              fr: "Sur la page de configuration WhatsApp d'AERIXA (étape 6), copiez les deux valeurs affichées : URL de webhook (fournie par AERIXA, propre à la plateforme) et Token de vérification (généré automatiquement par AERIXA pour votre établissement)",
              en: "On AERIXA's WhatsApp configuration page (step 6), copy the two displayed values: Webhook URL (provided by AERIXA, specific to the platform) and Verification token (automatically generated by AERIXA for your establishment)",
            },
            {
              fr: "Retournez sur le tableau de bord de votre App Meta, section Configuration > Webhooks",
              en: "Go back to your Meta App's dashboard, Configuration > Webhooks section",
            },
            {
              fr: "Cliquez sur Modifier (callback URL pour le produit WhatsApp), collez l'URL de webhook et le Verify token copiés",
              en: "Click Edit (callback URL for the WhatsApp product), paste the copied webhook URL and Verify token",
            },
            {
              fr: "Cliquez sur Vérifier et enregistrer — Meta appelle l'URL pour valider la configuration. Si tout est correct, la vérification réussit immédiatement",
              en: "Click Verify and save — Meta calls the URL to validate the configuration. If everything is correct, verification succeeds immediately",
            },
            {
              fr: "Dans la liste des champs webhook (Webhook fields), abonnez-vous au champ messages (et message_template_status_update si vous comptez utiliser des modèles)",
              en: "In the webhook fields list, subscribe to the messages field (and message_template_status_update if you plan to use templates)",
            },
          ],
        },
      ],
    },
    {
      heading: { fr: "Étape 8 — Tester la connexion", en: "Step 8 — Test the connection" },
      icon: "flaskConical",
      blocks: [
        {
          type: "list",
          ordered: true,
          items: [
            {
              fr: "Depuis AERIXA, ouvrez la fiche d'un candidat de test (avec un numéro WhatsApp que vous contrôlez), section Échanges",
              en: "From AERIXA, open a test candidate's profile (with a WhatsApp number you control), Conversations section",
            },
            { fr: "Envoyez un message de test", en: "Send a test message" },
            { fr: "Répondez depuis le téléphone portant le numéro candidat", en: "Reply from the phone holding the candidate number" },
            { fr: "Vérifiez que la réponse apparaît dans AERIXA en quelques secondes", en: "Check that the reply appears in AERIXA within a few seconds" },
          ],
        },
        { type: "paragraph", text: { fr: "Si le message de test n'arrive pas :", en: "If the test message does not arrive:" } },
        {
          type: "list",
          items: [
            {
              fr: "Vérifiez que le webhook est bien marqué \"Vérifié\" dans le tableau de bord Meta",
              en: "Check that the webhook is marked \"Verified\" in the Meta dashboard",
            },
            {
              fr: "Vérifiez que le champ messages est bien coché dans les abonnements webhook",
              en: "Check that the messages field is checked in the webhook subscriptions",
            },
            {
              fr: "Vérifiez que le token d'accès n'a pas expiré (privilégier un token System User sans expiration, étape 5)",
              en: "Check that the access token has not expired (prefer a non-expiring System User token, step 5)",
            },
          ],
        },
      ],
    },
    {
      heading: {
        fr: "Étape 9 — Créer un modèle de message pour les relances (optionnel mais recommandé)",
        en: "Step 9 — Create a message template for follow-ups (optional but recommended)",
      },
      icon: "megaphone",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "WhatsApp impose qu'après 24h sans réponse du candidat, seuls des modèles de message pré-approuvés peuvent être envoyés (voir section \"Indicateur fenêtre de conversation\" du Guide d'utilisation).",
            en: "WhatsApp requires that after 24 hours without a reply from the candidate, only pre-approved message templates can be sent (see the \"Conversation window indicator\" section of the Usage guide).",
          },
        },
        {
          type: "list",
          ordered: true,
          items: [
            {
              fr: "Dans le tableau de bord Meta, allez dans WhatsApp Manager > Modèles de message",
              en: "In the Meta dashboard, go to WhatsApp Manager > Message templates",
            },
            {
              fr: "Créez un modèle, par exemple : nom \"relance_candidature\", catégorie Marketing ou Utilité selon le contenu, langue Français, corps \"Bonjour {{1}}, nous revenons vers vous concernant votre candidature à {{2}}. N'hésitez pas à nous contacter si vous avez des questions.\"",
              en: "Create a template, for example: name \"application_follow_up\", category Marketing or Utility depending on content, language French/English, body \"Hello {{1}}, we are following up regarding your application to {{2}}. Feel free to contact us if you have any questions.\"",
            },
            { fr: "Soumettez pour approbation (délai de quelques heures à quelques jours)", en: "Submit for approval (delay of a few hours to a few days)" },
            {
              fr: "Une fois approuvé, le modèle apparaîtra automatiquement dans la liste proposée par AERIXA lors de l'envoi à une conversation fermée",
              en: "Once approved, the template will automatically appear in the list offered by AERIXA when sending to a closed conversation",
            },
          ],
        },
      ],
    },
    {
      heading: { fr: "Questions fréquentes", en: "Frequently asked questions" },
      icon: "helpCircle",
      blocks: [
        {
          type: "faq",
          question: {
            fr: "Le numéro WhatsApp de mon établissement reste-t-il utilisable sur l'application mobile WhatsApp ?",
            en: "Does my establishment's WhatsApp number remain usable on the WhatsApp mobile app?",
          },
          answer: {
            fr: "Non. Une fois un numéro connecté à l'API Cloud, il ne peut plus être utilisé dans l'application WhatsApp ou WhatsApp Business classique. Utilisez un numéro dédié.",
            en: "No. Once a number is connected to the Cloud API, it can no longer be used in the regular WhatsApp or WhatsApp Business app. Use a dedicated number.",
          },
        },
        {
          type: "faq",
          question: { fr: "Qui peut voir le token d'accès une fois enregistré dans AERIXA ?", en: "Who can see the access token once saved in AERIXA?" },
          answer: {
            fr: "Le token est chiffré en base de données et n'est jamais affiché en clair après l'enregistrement initial, y compris aux administrateurs AERIXA.",
            en: "The token is encrypted in the database and is never displayed in plain text after the initial save, including to AERIXA administrators.",
          },
        },
        {
          type: "faq",
          question: { fr: "Puis-je changer de numéro plus tard ?", en: "Can I change the number later?" },
          answer: {
            fr: "Oui, répétez les étapes 3 à 8 avec le nouveau numéro, puis mettez à jour la configuration dans AERIXA. L'historique des conversations avec l'ancien numéro reste conservé.",
            en: "Yes, repeat steps 3 to 8 with the new number, then update the configuration in AERIXA. The conversation history with the old number remains preserved.",
          },
        },
        {
          type: "faq",
          question: { fr: "Que se passe-t-il si je ne configure pas WhatsApp ?", en: "What happens if I don't configure WhatsApp?" },
          answer: {
            fr: "Le module Candidats fonctionne normalement (gestion des candidatures, parcours, notes). Seule la section \"Échanges\" reste indisponible jusqu'à la configuration.",
            en: "The Candidates module works normally (managing applications, funnel, notes). Only the \"Conversations\" section remains unavailable until configuration is complete.",
          },
        },
      ],
    },
  ],
};
