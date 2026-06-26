import type { Guide } from "./types";

export const candidatesUsageGuide: Guide = {
  title: {
    fr: "Guide d'utilisation — Module Candidats & Candidatures",
    en: "Usage guide — Candidates & Applications module",
  },
  icon: "clipboardList",
  intro: [
    {
      fr: "Ce guide est destiné aux utilisateurs ADMIN et OPERATOR d'un établissement sur AERIXA. Il couvre l'ensemble du module Candidats : création et gestion des fiches, affectation d'un candidat à un opérateur, suivi des candidatures dans le funnel, notes et pièces jointes, audit, échanges WhatsApp, ainsi que les outils de recherche, filtrage, import et export.",
      en: "This guide is intended for ADMIN and OPERATOR users of an establishment on AERIXA. It covers the entire Candidates module: creating and managing profiles, assigning a candidate to an operator, tracking applications through the funnel, notes and attachments, audit, WhatsApp conversations, as well as search, filtering, import and export tools.",
    },
  ],
  sections: [
    {
      heading: { fr: "1. Vue d'ensemble de la liste des candidats", en: "1. Overview of the candidates list" },
      icon: "search",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "La page Candidats affiche la liste de tous les candidats de l'établissement sélectionné, avec des indicateurs clés en haut de page : nombre total de candidats, candidats actifs, candidats archivés, et candidats avec une adresse email renseignée.",
            en: "The Candidates page displays the list of all candidates for the selected establishment, with key indicators at the top: total number of candidates, active candidates, archived candidates, and candidates with an email address on file.",
          },
        },
        {
          type: "list",
          items: [
            {
              fr: "Sélecteur d'établissement : si vous avez accès à plusieurs établissements, choisissez celui à consulter en haut de la page",
              en: "Establishment selector: if you have access to several establishments, choose which one to view at the top of the page",
            },
            {
              fr: "Barre de recherche : recherche instantanée par nom, prénom, téléphone ou email",
              en: "Search bar: instant search by last name, first name, phone number or email",
            },
            { fr: "Filtre par statut : Tous / Actif / Archivé", en: "Status filter: All / Active / Archived" },
            { fr: "Filtre par genre : Tous / Masculin / Féminin / Non précisé", en: "Gender filter: All / Male / Female / Unspecified" },
            { fr: "Lignes par page : 5, 10 ou 20 candidats affichés simultanément", en: "Rows per page: 5, 10 or 20 candidates displayed at once" },
            {
              fr: "Bouton Filtres (icône entonnoir) pour afficher ou masquer le panneau de filtres avancés",
              en: "Filters button (funnel icon) to show or hide the advanced filters panel",
            },
          ],
        },
        {
          type: "callout",
          tone: "tip",
          title: { fr: "Astuce", en: "Tip" },
          text: {
            fr: "Combinez recherche texte et filtres de statut/genre pour retrouver rapidement un candidat dans un établissement comptant plusieurs centaines de fiches.",
            en: "Combine text search with status/gender filters to quickly find a candidate in an establishment with hundreds of profiles.",
          },
        },
      ],
    },
    {
      heading: { fr: "2. Créer un candidat", en: "2. Create a candidate" },
      icon: "userPlus",
      blocks: [
        {
          type: "list",
          ordered: true,
          items: [
            { fr: "Aller dans Candidats > bouton Ajouter (icône +)", en: "Go to Candidates > Add button (+ icon)" },
            {
              fr: "Renseigner les informations obligatoires : nom et prénom(s), numéro de téléphone du candidat, canal d'acquisition (comment le candidat a connu l'établissement), diplôme d'entrée (le plus haut diplôme obtenu par le candidat)",
              en: "Fill in the required information: last and first name(s), candidate's phone number, acquisition channel (how the candidate heard about the establishment), entry diploma (the candidate's highest diploma obtained)",
            },
            {
              fr: "Renseigner si disponible (facultatif) : numéro de téléphone du parent/tuteur 1 et éventuellement un second numéro, email, établissement fréquenté précédemment, date de naissance, genre, adresse, ville, pays, observations",
              en: "Fill in if available (optional): parent/guardian 1 phone number and possibly a second number, email, previously attended school, date of birth, gender, address, city, country, notes",
            },
            {
              fr: "Choisir le numéro WhatsApp prioritaire (parent 1, parent 2 ou candidat) — c'est le numéro proposé par défaut pour les échanges WhatsApp. Vous pourrez en changer à tout moment.",
              en: "Choose the priority WhatsApp number (parent 1, parent 2 or candidate) — this is the number proposed by default for WhatsApp conversations. You can change it at any time.",
            },
            { fr: "Enregistrer", en: "Save" },
          ],
        },
        {
          type: "callout",
          tone: "info",
          title: { fr: "Bon à savoir", en: "Good to know" },
          text: {
            fr: "Le canal d'acquisition et le diplôme d'entrée sont obligatoires car ils conditionnent directement les statistiques de recrutement et les filières accessibles au candidat.",
            en: "The acquisition channel and entry diploma are mandatory because they directly drive recruitment statistics and the program tracks accessible to the candidate.",
          },
        },
      ],
    },
    {
      heading: { fr: "3. Modifier, archiver ou supprimer un candidat", en: "3. Edit, archive or delete a candidate" },
      icon: "settings",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "Depuis la liste (menu d'actions sur chaque ligne) ou depuis la fiche détaillée du candidat, plusieurs actions sont disponibles selon vos permissions :",
            en: "From the list (actions menu on each row) or from the candidate's detail page, several actions are available depending on your permissions:",
          },
        },
        {
          type: "list",
          items: [
            { fr: "Consulter — ouvre la fiche complète du candidat", en: "View — opens the candidate's full profile" },
            { fr: "Modifier — met à jour les informations du candidat", en: "Edit — updates the candidate's information" },
            {
              fr: "Activer / Archiver — bascule le statut du candidat sans supprimer ses données (un candidat archivé reste consultable mais n'apparaît plus dans les filtres \"Actif\" par défaut)",
              en: "Activate / Archive — toggles the candidate's status without deleting their data (an archived candidate remains viewable but no longer appears in the \"Active\" filter by default)",
            },
            {
              fr: "Supprimer — propose un choix entre suppression logique (réversible, recommandée) et suppression définitive (irréversible, réservée aux administrateurs disposant du droit de suppression définitive)",
              en: "Delete — offers a choice between soft delete (reversible, recommended) and permanent delete (irreversible, reserved for administrators with the permanent delete permission)",
            },
          ],
        },
        {
          type: "list",
          items: [
            {
              fr: "Sélection multiple : cochez plusieurs candidats dans la liste pour supprimer la sélection en une seule action",
              en: "Bulk selection: check several candidates in the list to delete the selection in a single action",
            },
          ],
        },
      ],
    },
    {
      heading: { fr: "4. Affecter un candidat à un opérateur", en: "4. Assign a candidate to an operator" },
      icon: "userPlus",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "Un ADMIN ou un SUPER_ADMIN peut désigner l'opérateur responsable de la gestion d'un candidat précis, en plus de l'établissement auquel l'opérateur a déjà été affecté (voir le guide de configuration, section Établissements).",
            en: "An ADMIN or a SUPER_ADMIN can designate the operator responsible for managing a specific candidate, in addition to the establishment the operator has already been assigned to (see the configuration guide, Establishments section).",
          },
        },
        {
          type: "list",
          ordered: true,
          items: [
            {
              fr: "Dans le menu d'actions du candidat (icône ⋮ sur sa ligne, ou bouton dédié en vue mobile), cliquer sur Affecter un opérateur",
              en: "In the candidate's actions menu (⋮ icon on its row, or dedicated button on mobile), click Assign operator",
            },
            {
              fr: "Sélectionner l'opérateur dans la liste proposée — seuls les opérateurs déjà affectés à l'établissement courant apparaissent",
              en: "Select the operator from the proposed list — only operators already assigned to the current establishment appear",
            },
            { fr: "Confirmer avec le bouton Affecter", en: "Confirm with the Assign button" },
          ],
        },
        {
          type: "paragraph",
          text: {
            fr: "L'opérateur affecté peut également être modifié directement depuis le formulaire d'édition du candidat (champ Opérateur affecté).",
            en: "The assigned operator can also be changed directly from the candidate's edit form (Assigned operator field).",
          },
        },
        {
          type: "callout",
          tone: "info",
          title: { fr: "Effet sur la visibilité", en: "Effect on visibility" },
          text: {
            fr: "Un OPERATOR ne voit, dans la liste des candidats et leurs candidatures, que les candidats qu'il a lui-même créés ou qui lui ont été explicitement affectés via cette action. Un ADMIN ou un SUPER_ADMIN continue de voir tous les candidats de l'établissement, quel que soit leur opérateur affecté.",
            en: "An OPERATOR only sees, in the candidates list and their applications, candidates they created themselves or that were explicitly assigned to them via this action. An ADMIN or SUPER_ADMIN continues to see all candidates of the establishment, regardless of their assigned operator.",
          },
        },
      ],
    },
    {
      heading: { fr: "5. Importer et exporter des candidats", en: "5. Import and export candidates" },
      icon: "fileSpreadsheet",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "Pour les établissements migrant des données existantes ou souhaitant extraire un rapport, la liste des candidats propose des outils Excel dans la barre d'outils :",
            en: "For establishments migrating existing data or wanting to extract a report, the candidates list provides Excel tools in the toolbar:",
          },
        },
        {
          type: "list",
          items: [
            {
              fr: "Télécharger le modèle — récupère un fichier Excel vierge avec les colonnes attendues pour l'import",
              en: "Download the template — retrieves a blank Excel file with the columns expected for import",
            },
            {
              fr: "Exporter — télécharge la liste actuelle des candidats (selon les filtres appliqués) au format Excel",
              en: "Export — downloads the current candidates list (based on applied filters) in Excel format",
            },
            {
              fr: "Importer — charge un fichier Excel : l'écran d'import permet de faire correspondre chaque colonne du fichier à un champ AERIXA (mapping automatique proposé, modifiable manuellement), puis valide ligne par ligne en affichant les éventuelles erreurs (champ obligatoire manquant, format invalide, doublon)",
              en: "Import — loads an Excel file: the import screen lets you map each file column to an AERIXA field (automatic mapping suggested, manually editable), then validates row by row, showing any errors (missing required field, invalid format, duplicate)",
            },
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: { fr: "Avant un import en masse", en: "Before a bulk import" },
          text: {
            fr: "Téléchargez toujours le modèle à jour avant un import : la structure des colonnes peut évoluer entre deux versions de la plateforme.",
            en: "Always download the up-to-date template before an import: the column structure may change between platform versions.",
          },
        },
      ],
    },
    {
      heading: { fr: "6. Ajouter une ou plusieurs candidatures", en: "6. Add one or several applications" },
      icon: "workflow",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "Une fois le candidat enregistré, sur sa fiche, onglet Candidatures :",
            en: "Once the candidate is saved, on their profile, Applications tab:",
          },
        },
        {
          type: "list",
          ordered: true,
          items: [
            { fr: "Cliquer sur Nouvelle candidature", en: "Click New application" },
            {
              fr: "La liste des filières proposées est automatiquement filtrée selon le diplôme d'entrée du candidat (seules les filières/niveaux pour lesquels le candidat est éligible sont affichées)",
              en: "The list of proposed program tracks is automatically filtered based on the candidate's entry diploma (only tracks/levels the candidate is eligible for are shown)",
            },
            { fr: "Sélectionner la filière et le niveau souhaités", en: "Select the desired program track and level" },
            {
              fr: "Répéter l'opération pour candidater à plusieurs filières si souhaité",
              en: "Repeat the operation to apply to several program tracks if desired",
            },
          ],
        },
        {
          type: "paragraph",
          text: {
            fr: "Chaque candidature démarre automatiquement à l'étape initiale du parcours de recrutement de l'établissement.",
            en: "Each application automatically starts at the initial stage of the establishment's recruitment funnel.",
          },
        },
      ],
    },
    {
      heading: { fr: "7. Visualiser les candidatures : Kanban, Liste ou Tableau", en: "7. View applications: Kanban, List or Table" },
      icon: "clipboardList",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "L'onglet Candidatures propose trois modes d'affichage interchangeables via les boutons en haut de la carte (votre préférence est mémorisée par établissement) :",
            en: "The Applications tab offers three interchangeable display modes via the buttons at the top of the card (your preference is remembered per establishment):",
          },
        },
        {
          type: "list",
          items: [
            {
              fr: "Kanban — une colonne par étape du funnel ; faites glisser une candidature d'une colonne à l'autre pour la faire transiter directement (un motif sera demandé)",
              en: "Kanban — one column per funnel stage; drag an application from one column to another to transition it directly (a reason will be requested)",
            },
            { fr: "Liste — vue verticale en cartes, adaptée au mobile", en: "List — vertical card view, suited for mobile" },
            { fr: "Tableau — vue compacte avec filière, étape, statut et menu d'actions par ligne", en: "Table — compact view with program track, stage, status and an actions menu per row" },
          ],
        },
        {
          type: "paragraph",
          text: {
            fr: "Chaque candidature affiche un badge de statut (En cours / Acceptée / Rejetée) et un badge d'étape du funnel.",
            en: "Each application displays a status badge (In progress / Accepted / Rejected) and a funnel stage badge.",
          },
        },
      ],
    },
    {
      heading: { fr: "8. Faire avancer une candidature dans le funnel", en: "8. Move an application forward in the funnel" },
      icon: "workflow",
      blocks: [
        {
          type: "list",
          ordered: true,
          items: [
            {
              fr: "Ouvrir la candidature concernée (bouton Voir le détail, ou glisser-déposer en vue Kanban)",
              en: "Open the relevant application (View details button, or drag-and-drop in Kanban view)",
            },
            {
              fr: "Sélectionner l'étape suivante parmi les transitions autorisées depuis l'étape actuelle (le parcours est configuré par l'établissement et n'autorise que certains enchaînements)",
              en: "Select the next stage among the transitions allowed from the current stage (the funnel is configured by the establishment and only allows certain sequences)",
            },
            {
              fr: "Renseigner un motif — obligatoire pour valider tout changement d'étape (ex : \"Dossier complet reçu\", \"Entretien réalisé le 12/06\", \"Candidat injoignable\")",
              en: "Enter a reason — mandatory to validate any stage change (e.g. \"Complete file received\", \"Interview held on 06/12\", \"Candidate unreachable\")",
            },
            { fr: "Valider la transition", en: "Confirm the transition" },
          ],
        },
        {
          type: "callout",
          tone: "info",
          text: {
            fr: "Le motif saisi est automatiquement ajouté à l'historique de la candidature et reste consultable indéfiniment dans l'onglet Historique.",
            en: "The reason entered is automatically added to the application's history and remains viewable indefinitely in the History tab.",
          },
        },
      ],
    },
    {
      heading: { fr: "9. Règle importante : une seule admission par établissement", en: "9. Important rule: only one admission per establishment" },
      icon: "shieldCheck",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "Si une candidature atteint l'étape finale \"Admis\", le système fait automatiquement passer toutes les autres candidatures actives du même candidat (dans le même établissement) à l'étape \"Refusé\", avec une note explicative générée automatiquement.",
            en: "If an application reaches the final \"Admitted\" stage, the system automatically moves all other active applications of the same candidate (within the same establishment) to the \"Rejected\" stage, with an automatically generated explanatory note.",
          },
        },
        {
          type: "quote",
          text: {
            fr: "Exemple : un candidat a postulé à \"Génie Logiciel BTS1\" et \"Réseaux & Télécom BTS1\". Si sa candidature \"Génie Logiciel BTS1\" passe à \"Admis\", sa candidature \"Réseaux & Télécom BTS1\" passera automatiquement à \"Refusé\" avec la note \"Clôture automatique : candidat admis dans Génie Logiciel BTS1\".",
            en: "Example: a candidate applied to \"Software Engineering BTS1\" and \"Networks & Telecom BTS1\". If their \"Software Engineering BTS1\" application moves to \"Admitted\", their \"Networks & Telecom BTS1\" application will automatically move to \"Rejected\" with the note \"Automatic closure: candidate admitted in Software Engineering BTS1\".",
          },
        },
        { type: "paragraph", text: { fr: "Cette règle ne s'applique qu'au sein d'un même établissement.", en: "This rule only applies within the same establishment." } },
      ],
    },
    {
      heading: { fr: "10. Page de détail d'une candidature : Historique, Notes, Audit", en: "10. Application detail page: History, Notes, Audit" },
      icon: "stickyNote",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "Chaque candidature dispose de sa propre page de détail (accessible via le bouton Voir le détail), organisée en trois onglets :",
            en: "Each application has its own detail page (accessible via the View details button), organized into three tabs:",
          },
        },
        {
          type: "list",
          items: [
            {
              fr: "Historique — liste chronologique de toutes les transitions d'étape de cette candidature, avec date, étape de départ, étape d'arrivée et motif",
              en: "History — chronological list of all stage transitions for this application, with date, starting stage, ending stage and reason",
            },
            {
              fr: "Notes — notes de suivi libres et facultatives, avec pièces jointes (voir section suivante)",
              en: "Notes — free, optional tracking notes, with attachments (see next section)",
            },
            {
              fr: "Audit — journal détaillé des actions effectuées sur les notes et pièces jointes de la candidature (création, modification, suppression), avec l'auteur et l'horodatage de chaque action",
              en: "Audit — detailed log of actions performed on the application's notes and attachments (creation, edit, deletion), with the author and timestamp of each action",
            },
          ],
        },
      ],
    },
    {
      heading: { fr: "11. Notes de suivi et pièces jointes", en: "11. Tracking notes and attachments" },
      icon: "stickyNote",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "Sur l'onglet Notes d'une candidature, vous pouvez ajouter, modifier, supprimer des notes et y joindre des fichiers pour assurer une traçabilité complète du suivi.",
            en: "On an application's Notes tab, you can add, edit and delete notes and attach files to them to ensure complete traceability of follow-up.",
          },
        },
        {
          type: "list",
          items: [
            {
              fr: "Ajouter une note — champ de texte libre, facultatif, horodaté et attribué automatiquement à son auteur",
              en: "Add a note — free text field, optional, timestamped and automatically attributed to its author",
            },
            {
              fr: "Modifier une note — seul l'auteur de la note peut la modifier ; la note affiche alors la mention \"modifiée le ...\"",
              en: "Edit a note — only the note's author can edit it; the note then displays \"edited on ...\"",
            },
            {
              fr: "Supprimer une note — l'auteur de la note, ainsi que les profils ADMIN et SUPER_ADMIN, peuvent supprimer une note",
              en: "Delete a note — the note's author, as well as ADMIN and SUPER_ADMIN profiles, can delete a note",
            },
            {
              fr: "Joindre un fichier (bouton trombone) — photos, documents, fichiers audio ou vidéo peuvent être attachés à une note existante",
              en: "Attach a file (paperclip button) — photos, documents, audio or video files can be attached to an existing note",
            },
            {
              fr: "Consulter un fichier — pour les formats prévisualisables (image, vidéo, audio, PDF), un bouton Consulter ouvre le fichier dans un nouvel onglet sans le télécharger",
              en: "View a file — for previewable formats (image, video, audio, PDF), a View button opens the file in a new tab without downloading it",
            },
            { fr: "Télécharger un fichier — récupère le fichier original sur votre poste", en: "Download a file — retrieves the original file to your device" },
            {
              fr: "Supprimer un fichier — l'auteur de l'upload, ainsi que les profils ADMIN et SUPER_ADMIN, peuvent retirer une pièce jointe",
              en: "Delete a file — the uploader, as well as ADMIN and SUPER_ADMIN profiles, can remove an attachment",
            },
          ],
        },
        {
          type: "callout",
          tone: "tip",
          title: { fr: "Traçabilité", en: "Traceability" },
          text: {
            fr: "Chaque note et chaque pièce jointe enregistre qui l'a créée/modifiée/supprimée et à quel moment. Ces informations alimentent l'onglet Audit de la candidature.",
            en: "Every note and attachment records who created/edited/deleted it and when. This information feeds the application's Audit tab.",
          },
        },
      ],
    },
    {
      heading: { fr: "12. Échanges WhatsApp", en: "12. WhatsApp conversations" },
      icon: "messageCircle",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "L'onglet Échanges de la fiche candidat affiche le fil de discussion WhatsApp avec le candidat et ses parents/tuteurs.",
            en: "The Conversations tab on the candidate profile displays the WhatsApp conversation thread with the candidate and their parents/guardians.",
          },
        },
        {
          type: "callout",
          tone: "warning",
          title: { fr: "Prérequis", en: "Prerequisite" },
          text: {
            fr: "L'établissement doit avoir configuré son WhatsApp Business dans Paramètres > Établissement > WhatsApp (voir le guide dédié \"Guide de configuration du WhatsApp Business\").",
            en: "The establishment must have configured its WhatsApp Business in Settings > Establishment > WhatsApp (see the dedicated \"WhatsApp Business configuration guide\").",
          },
        },
        {
          type: "list",
          items: [
            {
              fr: "Créer une conversation — disponible pour chaque numéro renseigné sur la fiche candidat (candidat, parent 1, parent 2) qui n'a pas encore de fil ouvert",
              en: "Create a conversation — available for each number listed on the candidate profile (candidate, parent 1, parent 2) that doesn't have an open thread yet",
            },
            {
              fr: "Choisir le destinataire — si plusieurs numéros sont disponibles, sélectionnez celui auquel envoyer le message",
              en: "Choose the recipient — if several numbers are available, select the one to send the message to",
            },
            {
              fr: "Envoyer un message — saisissez le texte et envoyez ; le message apparaît immédiatement dans le fil avec son statut de livraison (envoyé, livré, lu, échec)",
              en: "Send a message — type the text and send; the message immediately appears in the thread with its delivery status (sent, delivered, read, failed)",
            },
          ],
        },
        {
          type: "paragraph",
          text: {
            fr: "Indicateur \"fenêtre de conversation\" : WhatsApp impose une règle — un message libre ne peut être envoyé que dans les 24 heures suivant le dernier message reçu du candidat/parent.",
            en: "\"Conversation window\" indicator: WhatsApp enforces a rule — a free-form message can only be sent within 24 hours of the last message received from the candidate/parent.",
          },
        },
        {
          type: "list",
          items: [
            {
              fr: "Conversation ouverte (badge vert) : vous pouvez envoyer un message libre",
              en: "Open conversation (green badge): you can send a free-form message",
            },
            {
              fr: "Conversation fermée (badge orange \"Conversation fermée\") : vous devez utiliser un modèle de message pré-approuvé (liste proposée automatiquement, ex : \"Relance candidature\")",
              en: "Closed conversation (orange \"Conversation closed\" badge): you must use a pre-approved message template (automatically suggested list, e.g. \"Application follow-up\")",
            },
          ],
        },
        { type: "paragraph", text: { fr: "Qui voit quoi ?", en: "Who sees what?" } },
        {
          type: "list",
          items: [
            { fr: "Un OPERATOR voit les échanges des candidats de son établissement", en: "An OPERATOR sees the conversations of candidates in their establishment" },
            {
              fr: "Un ADMIN voit tous les échanges de son établissement, y compris ceux gérés par ses opérateurs",
              en: "An ADMIN sees all conversations in their establishment, including those handled by their operators",
            },
            {
              fr: "Les échanges sont confidentiels et chiffrés : aucune donnée n'est partagée entre établissements",
              en: "Conversations are confidential and encrypted: no data is shared between establishments",
            },
          ],
        },
      ],
    },
    {
      heading: { fr: "13. Bonnes pratiques", en: "13. Best practices" },
      icon: "sparkles",
      blocks: [
        {
          type: "list",
          items: [
            {
              fr: "Renseignez toujours un motif clair lors des changements d'étape : c'est ce qui constitue l'historique consultable par votre équipe",
              en: "Always provide a clear reason when changing stages: this is what forms the history your team can review",
            },
            {
              fr: "Vérifiez le canal d'acquisition à la création : il alimente vos statistiques de performance",
              en: "Check the acquisition channel at creation time: it feeds your performance statistics",
            },
            {
              fr: "Pensez à mettre à jour le numéro WhatsApp prioritaire si le candidat indique un changement de contact préférentiel",
              en: "Remember to update the priority WhatsApp number if the candidate indicates a change in preferred contact",
            },
            {
              fr: "Privilégiez l'archivage (suppression logique) à la suppression définitive, qui reste irréversible",
              en: "Prefer archiving (soft delete) over permanent deletion, which remains irreversible",
            },
            {
              fr: "Utilisez les notes pour documenter tout échange important qui n'a pas eu lieu via WhatsApp (appel téléphonique, visite sur site, etc.)",
              en: "Use notes to document any important exchange that did not take place via WhatsApp (phone call, on-site visit, etc.)",
            },
            {
              fr: "Affectez sans tarder un opérateur aux candidats qu'il doit suivre : tant qu'aucune affectation n'est faite, seul son créateur (ou un ADMIN/SUPER_ADMIN) peut le voir",
              en: "Assign an operator to the candidates they should follow without delay: until an assignment is made, only the creator (or an ADMIN/SUPER_ADMIN) can see it",
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
            fr: "Un candidat peut-il avoir plusieurs candidatures actives en même temps ?",
            en: "Can a candidate have several active applications at the same time?",
          },
          answer: {
            fr: "Oui, un candidat peut postuler à plusieurs filières/niveaux simultanément. Toutes ses candidatures progressent indépendamment, sauf en cas d'admission (voir la règle d'admission unique).",
            en: "Yes, a candidate can apply to several program tracks/levels at the same time. All their applications progress independently, except in case of admission (see the single admission rule).",
          },
        },
        {
          type: "faq",
          question: { fr: "Puis-je revenir en arrière sur une transition d'étape ?", en: "Can I undo a stage transition?" },
          answer: {
            fr: "L'historique des transitions est immuable et ne peut pas être modifié ou supprimé. Il est en revanche possible de faire transiter à nouveau la candidature vers une étape antérieure si le parcours configuré l'autorise.",
            en: "The transition history is immutable and cannot be edited or deleted. However, it is possible to transition the application again to a previous stage if the configured funnel allows it.",
          },
        },
        {
          type: "faq",
          question: { fr: "Qui peut consulter l'onglet Audit d'une candidature ?", en: "Who can view an application's Audit tab?" },
          answer: {
            fr: "L'accès à l'onglet Audit est soumis à une permission dédiée, généralement réservée aux profils ADMIN et SUPER_ADMIN.",
            en: "Access to the Audit tab is subject to a dedicated permission, generally reserved for ADMIN and SUPER_ADMIN profiles.",
          },
        },
        {
          type: "faq",
          question: {
            fr: "Que se passe-t-il si je supprime un candidat ayant des candidatures en cours ?",
            en: "What happens if I delete a candidate with applications in progress?",
          },
          answer: {
            fr: "La suppression logique archive le candidat et ses candidatures sans perte de données ; elles restent consultables. La suppression définitive (réservée à un droit spécifique) retire les données de façon irréversible.",
            en: "Soft delete archives the candidate and their applications without data loss; they remain viewable. Permanent deletion (reserved for a specific permission) removes the data irreversibly.",
          },
        },
        {
          type: "faq",
          question: {
            fr: "Un OPERATOR peut-il affecter lui-même un candidat à un autre opérateur ?",
            en: "Can an OPERATOR assign a candidate to another operator themselves?",
          },
          answer: {
            fr: "Non. Seuls les profils ADMIN et SUPER_ADMIN peuvent affecter ou réaffecter un candidat à un opérateur. Un OPERATOR voit uniquement les candidats qu'il a créés ou qui lui ont été affectés.",
            en: "No. Only ADMIN and SUPER_ADMIN profiles can assign or reassign a candidate to an operator. An OPERATOR only sees the candidates they created or that were assigned to them.",
          },
        },
        {
          type: "faq",
          question: {
            fr: "L'opérateur affecté à un candidat doit-il être affecté à l'établissement ?",
            en: "Does the operator assigned to a candidate need to be assigned to the establishment?",
          },
          answer: {
            fr: "Oui. Seuls les opérateurs déjà affectés à l'établissement du candidat (voir le guide de configuration, section Établissements) apparaissent dans la liste de sélection.",
            en: "Yes. Only operators already assigned to the candidate's establishment (see the configuration guide, Establishments section) appear in the selection list.",
          },
        },
      ],
    },
  ],
};
