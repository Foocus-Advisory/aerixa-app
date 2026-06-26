import type { Guide } from "./types";

export const configurationGuide: Guide = {
  title: {
    fr: "Guide de configuration — Référentiels métier de l'établissement",
    en: "Configuration guide — Establishment business reference data",
  },
  icon: "settings",
  intro: [
    {
      fr: "Ce guide est destiné aux utilisateurs ADMIN et SUPER_ADMIN sur AERIXA. Il explique le rôle et l'utilisation de chacun des sous-menus du menu Configuration : Établissements, Diplômes d'entrée, Niveaux académiques, Filières, Filière × niveau, Canaux d'acquisition, Étapes du funnel et Transitions du funnel. Ces référentiels constituent le socle sur lequel reposent les candidats et leurs candidatures.",
      en: "This guide is intended for ADMIN and SUPER_ADMIN users on AERIXA. It explains the purpose and usage of each submenu under the Configuration menu: Establishments, Entry diplomas, Academic levels, Program tracks, Track × level, Acquisition channels, Funnel stages and Funnel transitions. These reference datasets are the foundation candidates and their applications rely on.",
    },
  ],
  sections: [
    {
      heading: { fr: "Vue d'ensemble : comment ces modules s'articulent", en: "Overview: how these modules fit together" },
      icon: "sparkles",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "Tous les référentiels de configuration sont rattachés à un établissement (établissement_id). Un ADMIN ne voit et ne configure que son propre établissement, alors qu'un SUPER_ADMIN peut consulter et administrer la configuration de tous les établissements.",
            en: "All configuration reference data is scoped to an establishment (establishment_id). An ADMIN only sees and configures their own establishment, while a SUPER_ADMIN can view and administer the configuration of every establishment.",
          },
        },
        {
          type: "paragraph",
          text: {
            fr: "Ces modules s'enchaînent logiquement : un diplôme d'entrée détermine les niveaux académiques accessibles à un candidat ; un niveau académique est ouvert ou fermé pour une filière donnée via l'association Filière × niveau ; un canal d'acquisition trace l'origine du candidat ; les étapes et transitions du funnel définissent le parcours de recrutement que suivront ses candidatures.",
            en: "These modules connect logically: an entry diploma determines which academic levels a candidate can access; an academic level is opened or closed for a given program track via the Track × level association; an acquisition channel tracks the candidate's origin; funnel stages and transitions define the recruitment journey their applications will follow.",
          },
        },
        {
          type: "callout",
          tone: "info",
          title: { fr: "Traçabilité et permissions", en: "Traceability and permissions" },
          text: {
            fr: "Chaque création, modification, activation/désactivation ou suppression sur ces référentiels est auditée (qui, quoi, quand) et soumise à une permission dédiée (convention <ressource>:<action>, ex. entry_diplomas:create). Aucune action de configuration n'est possible sans la permission correspondante.",
            en: "Every creation, edit, activation/deactivation or deletion on these reference datasets is audited (who, what, when) and requires a dedicated permission (convention <resource>:<action>, e.g. entry_diplomas:create). No configuration action is possible without the matching permission.",
          },
        },
      ],
    },
    {
      heading: { fr: "1. Établissements", en: "1. Establishments" },
      icon: "shieldCheck",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "L'établissement est l'unité racine de toute la configuration : chaque référentiel métier (diplômes, niveaux, filières, canaux, étapes du funnel) lui est rattaché et isolé des autres établissements.",
            en: "The establishment is the root unit of the whole configuration: every business reference dataset (diplomas, levels, tracks, channels, funnel stages) belongs to it and is isolated from other establishments.",
          },
        },
        {
          type: "list",
          items: [
            {
              fr: "Champs : Nom (obligatoire), Nom court, Statut (Actif/Inactif), Email, Pays, Ville, Adresse (lignes 1 et 2), WhatsApp (préfixe + numéro), Autre contact (préfixe + numéro), Logo (image, 5 Mo max, PNG/JPG/WEBP)",
              en: "Fields: Name (required), Short name, Status (Active/Inactive), Email, Country, City, Address (lines 1 and 2), WhatsApp (prefix + number), Other contact (prefix + number), Logo (image, 5 MB max, PNG/JPG/WEBP)",
            },
            {
              fr: "Un ADMIN ne peut créer qu'un seul établissement et ne consulte/modifie que celui-ci ; un SUPER_ADMIN peut créer et administrer plusieurs établissements",
              en: "An ADMIN can only create one establishment and only views/edits that one; a SUPER_ADMIN can create and administer several establishments",
            },
            {
              fr: "Depuis la fiche établissement, un bloc d'onglets centralise les 7 référentiels métier détaillés dans les sections suivantes",
              en: "From the establishment profile, a tabbed panel centralizes the 7 business reference datasets detailed in the following sections",
            },
          ],
        },
        {
          type: "paragraph",
          text: {
            fr: "Affecter un établissement à un opérateur : un OPERATOR n'a, par défaut, accès à aucun établissement. Pour qu'il puisse consulter et gérer les candidats/candidatures d'un établissement, un ADMIN (ou un SUPER_ADMIN) doit l'y affecter explicitement.",
            en: "Assigning an establishment to an operator: by default, an OPERATOR has no access to any establishment. For them to view and manage an establishment's candidates/applications, an ADMIN (or a SUPER_ADMIN) must explicitly assign them to it.",
          },
        },
        {
          type: "list",
          ordered: true,
          items: [
            {
              fr: "Dans le panel Utilisateurs, ouvrir le menu d'actions de l'OPERATOR concerné et sélectionner Gérer les établissements",
              en: "In the Users panel, open the actions menu for the relevant OPERATOR and select Manage establishments",
            },
            {
              fr: "Cocher les établissements (parmi ceux de l'ADMIN courant) auxquels l'opérateur doit avoir accès — un opérateur peut être affecté à plusieurs établissements",
              en: "Check the establishments (among the current ADMIN's own) the operator should have access to — an operator can be assigned to several establishments",
            },
            {
              fr: "Décocher un établissement retire immédiatement l'accès de l'opérateur à celui-ci",
              en: "Unchecking an establishment immediately removes the operator's access to it",
            },
          ],
        },
        {
          type: "callout",
          tone: "info",
          title: { fr: "Portée de l'affectation", en: "Assignment scope" },
          text: {
            fr: "Cette affectation conditionne uniquement l'accès à l'établissement (référentiels, candidats, candidatures). Elle ne donne pas automatiquement la gestion de tous les candidats : voir le guide d'utilisation des candidats, section \"Affecter un candidat à un opérateur\", pour la granularité au niveau candidat.",
            en: "This assignment only governs access to the establishment (reference data, candidates, applications). It does not automatically grant management of every candidate: see the candidates usage guide, \"Assign a candidate to an operator\" section, for candidate-level granularity.",
          },
        },
      ],
    },
    {
      heading: { fr: "2. Diplômes d'entrée", en: "2. Entry diplomas" },
      icon: "key",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "Un diplôme d'entrée représente le plus haut diplôme obtenu par un candidat (ex. Baccalauréat, BAC+2). Il sert de base au calcul d'éligibilité aux niveaux académiques.",
            en: "An entry diploma represents the highest diploma obtained by a candidate (e.g. High school diploma, BAC+2). It is the basis for calculating eligibility to academic levels.",
          },
        },
        {
          type: "list",
          items: [
            {
              fr: "Champs : Libellé (obligatoire), Rang (entier facultatif — plus le rang est élevé, plus le diplôme est avancé) ; le code est généré automatiquement à partir du libellé",
              en: "Fields: Label (required), Rank (optional integer — the higher the rank, the more advanced the diploma); the code is generated automatically from the label",
            },
            {
              fr: "Actions : créer, modifier, activer/désactiver, supprimer (archivage réversible ou suppression définitive selon permission), exporter/importer en Excel avec mapping de colonnes",
              en: "Actions: create, edit, activate/deactivate, delete (reversible archiving or permanent deletion depending on permission), export/import via Excel with column mapping",
            },
            {
              fr: "Filtres disponibles : recherche par code/libellé, statut (Tous/Actif/Inactif), lignes par page",
              en: "Available filters: search by code/label, status (All/Active/Inactive), rows per page",
            },
          ],
        },
        {
          type: "callout",
          tone: "tip",
          title: { fr: "Règle d'éligibilité", en: "Eligibility rule" },
          text: {
            fr: "Un candidat est éligible à un niveau académique si le rang du niveau est inférieur ou égal au rang de son diplôme d'entrée. Exemple : un Baccalauréat (rang 1) rend éligible au niveau BTS1 (rang 1) mais pas au niveau BTS2 (rang 2) ; un BAC+2 (rang 2) rend éligible à BTS1 et BTS2.",
            en: "A candidate is eligible for an academic level if the level's rank is lower than or equal to their entry diploma's rank. Example: a High school diploma (rank 1) makes a candidate eligible for level BTS1 (rank 1) but not BTS2 (rank 2); a BAC+2 (rank 2) makes them eligible for both BTS1 and BTS2.",
          },
        },
      ],
    },
    {
      heading: { fr: "3. Niveaux académiques", en: "3. Academic levels" },
      icon: "rocket",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "Un niveau académique segmente les filières par progression (ex. BTS1, BTS2, Licence 1). Chaque niveau peut être associé à un ou plusieurs diplômes d'entrée qui y donnent accès.",
            en: "An academic level segments program tracks by progression (e.g. BTS1, BTS2, Bachelor 1). Each level can be associated with one or more entry diplomas that grant access to it.",
          },
        },
        {
          type: "list",
          items: [
            {
              fr: "Champs : Libellé (obligatoire), Rang (entier facultatif), Actif",
              en: "Fields: Label (required), Rank (optional integer), Active",
            },
            {
              fr: "Actions : créer, modifier, activer/désactiver, supprimer (logique ou définitive), exporter/importer en Excel",
              en: "Actions: create, edit, activate/deactivate, delete (soft or permanent), export/import via Excel",
            },
            {
              fr: "Associer un diplôme d'entrée — depuis la fiche du niveau, un écran dédié liste les diplômes déjà associés et permet d'en attacher ou d'en détacher de nouveaux",
              en: "Attach an entry diploma — from the level's detail page, a dedicated screen lists already attached diplomas and lets you attach or detach new ones",
            },
            {
              fr: "La liste affiche le nombre de diplômes associés à chaque niveau (badges) et un indicateur global en KPI",
              en: "The list shows the number of diplomas attached to each level (badges) and a global KPI indicator",
            },
          ],
        },
      ],
    },
    {
      heading: { fr: "4. Filières", en: "4. Program tracks" },
      icon: "workflow",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "Une filière (ou programme de formation) répertorie une offre proposée par l'établissement (ex. Génie Logiciel, Réseaux & Télécom). Elle devient concrète une fois associée à un ou plusieurs niveaux académiques.",
            en: "A program track lists a training offer proposed by the establishment (e.g. Software Engineering, Networks & Telecom). It becomes concrete once associated with one or more academic levels.",
          },
        },
        {
          type: "list",
          items: [
            { fr: "Champs : Intitulé (obligatoire), Description (facultative), Actif", en: "Fields: Name (required), Description (optional), Active" },
            {
              fr: "Actions : créer, modifier, activer/désactiver, supprimer (logique ou définitive), exporter/importer en Excel",
              en: "Actions: create, edit, activate/deactivate, delete (soft or permanent), export/import via Excel",
            },
            {
              fr: "Lier à un niveau académique — ouvre l'écran d'association Filière × niveau (voir section suivante) directement depuis la fiche de la filière",
              en: "Link to an academic level — opens the Track × level association screen (see next section) directly from the program track's detail page",
            },
          ],
        },
      ],
    },
    {
      heading: { fr: "5. Filière × niveau", en: "5. Track × level" },
      icon: "link",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "Cette association distingue par exemple \"Génie Logiciel BTS1\" de \"Génie Logiciel BTS2\" : une filière peut exister à plusieurs niveaux, et chaque combinaison peut être ouverte ou fermée indépendamment aux candidatures.",
            en: "This association distinguishes, for example, \"Software Engineering BTS1\" from \"Software Engineering BTS2\": a program track can exist at several levels, and each combination can be opened or closed to applications independently.",
          },
        },
        {
          type: "list",
          items: [
            { fr: "Champs : Filière (obligatoire), Niveau académique (obligatoire) — l'association est unique par établissement", en: "Fields: Program track (required), Academic level (required) — the association is unique per establishment" },
            {
              fr: "Actions : créer, modifier, supprimer (logique), Ouvrir aux candidatures / Fermer aux candidatures",
              en: "Actions: create, edit, delete (soft), Open for applications / Close for applications",
            },
            {
              fr: "Filtres : par filière, par niveau académique, par statut (Ouvert/Fermé), lignes par page",
              en: "Filters: by program track, by academic level, by status (Open/Closed), rows per page",
            },
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: { fr: "Fermer une combinaison", en: "Closing a combination" },
          text: {
            fr: "Fermer une combinaison filière × niveau ne supprime pas les candidatures déjà déposées ; elle empêche seulement la création de nouvelles candidatures sur cette combinaison.",
            en: "Closing a track × level combination does not delete applications already submitted; it only prevents new applications from being created on that combination.",
          },
        },
      ],
    },
    {
      heading: { fr: "6. Canaux d'acquisition", en: "6. Acquisition channels" },
      icon: "megaphone",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "Le canal d'acquisition trace comment un candidat a connu l'établissement (site web, recommandation, promotion marketing, etc.) et alimente les statistiques de performance de recrutement.",
            en: "The acquisition channel tracks how a candidate heard about the establishment (website, referral, marketing promotion, etc.) and feeds recruitment performance statistics.",
          },
        },
        {
          type: "list",
          items: [
            {
              fr: "Champs : Intitulé (obligatoire), Type (obligatoire — DIRECT ou INDIRECT)",
              en: "Fields: Name (required), Type (required — DIRECT or INDIRECT)",
            },
            {
              fr: "Actions : créer, modifier, activer/désactiver, supprimer (logique ou définitive), exporter/importer en Excel",
              en: "Actions: create, edit, activate/deactivate, delete (soft or permanent), export/import via Excel",
            },
            {
              fr: "Filtres : recherche, statut, type de canal (Tous/Direct/Indirect), lignes par page",
              en: "Filters: search, status, channel type (All/Direct/Indirect), rows per page",
            },
          ],
        },
        {
          type: "callout",
          tone: "info",
          title: { fr: "DIRECT vs INDIRECT", en: "DIRECT vs INDIRECT" },
          text: {
            fr: "DIRECT désigne un canal où le candidat vient spontanément vers l'établissement (site web, bouche-à-oreille) ; INDIRECT désigne un canal nécessitant un intermédiaire ou une action marketing (salon, partenaire, campagne publicitaire).",
            en: "DIRECT designates a channel where the candidate comes to the establishment spontaneously (website, word of mouth); INDIRECT designates a channel requiring an intermediary or marketing action (fair, partner, advertising campaign).",
          },
        },
      ],
    },
    {
      heading: { fr: "7. Étapes du funnel", en: "7. Funnel stages" },
      icon: "flaskConical",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "Les étapes du funnel structurent le parcours de recrutement (ex. Premier contact, Dossier reçu, Entretien, Admis, Refusé) que chaque candidature traversera.",
            en: "Funnel stages structure the recruitment journey (e.g. First contact, File received, Interview, Admitted, Rejected) that every application will go through.",
          },
        },
        {
          type: "list",
          items: [
            {
              fr: "Champs : Intitulé (obligatoire), Description (facultative), Type d'étape (obligatoire), Position (entier obligatoire, définit l'ordre dans le parcours)",
              en: "Fields: Name (required), Description (optional), Stage type (required), Position (required integer, defines the order in the journey)",
            },
            {
              fr: "Quatre types d'étape : INITIAL (point de départ), INTERMEDIATE (étapes intermédiaires), FINAL_SUCCESS (admission), FINAL_FAILURE (refus)",
              en: "Four stage types: INITIAL (starting point), INTERMEDIATE (intermediate stages), FINAL_SUCCESS (admission), FINAL_FAILURE (rejection)",
            },
            {
              fr: "Deux modes d'affichage : Tableau (liste classique) ou Pipeline (vue visuelle du parcours)",
              en: "Two display modes: Table (classic list) or Pipeline (visual journey view)",
            },
            {
              fr: "Actions : créer, modifier, activer/désactiver, supprimer (logique ou définitive), exporter/importer en Excel",
              en: "Actions: create, edit, activate/deactivate, delete (soft or permanent), export/import via Excel",
            },
          ],
        },
        {
          type: "callout",
          tone: "warning",
          title: { fr: "Invariants obligatoires", en: "Mandatory invariants" },
          text: {
            fr: "Par établissement, il doit exister exactement une étape INITIAL active et exactement une étape FINAL_SUCCESS active, ainsi qu'au moins une étape INTERMEDIATE et une étape FINAL_FAILURE actives. La position de chaque étape active doit être unique.",
            en: "Per establishment, there must be exactly one active INITIAL stage and exactly one active FINAL_SUCCESS stage, as well as at least one active INTERMEDIATE stage and one active FINAL_FAILURE stage. The position of each active stage must be unique.",
          },
        },
      ],
    },
    {
      heading: { fr: "8. Transitions du funnel", en: "8. Funnel transitions" },
      icon: "link",
      blocks: [
        {
          type: "paragraph",
          text: {
            fr: "Les transitions définissent les enchaînements autorisés entre deux étapes du funnel, afin d'éviter des sauts incohérents dans le parcours d'une candidature.",
            en: "Transitions define the allowed sequences between two funnel stages, in order to prevent inconsistent jumps in an application's journey.",
          },
        },
        {
          type: "list",
          items: [
            {
              fr: "Champs : Étape de départ (obligatoire), Étape d'arrivée (obligatoire) — une transition ne peut pas pointer vers la même étape",
              en: "Fields: Starting stage (required), Target stage (required) — a transition cannot point to the same stage",
            },
            {
              fr: "Deux modes d'affichage : Workflow (regroupé par étape source) ou Tableau",
              en: "Two display modes: Workflow (grouped by source stage) or Table",
            },
            {
              fr: "Actions : créer, modifier, activer/désactiver, supprimer (logique ou définitive)",
              en: "Actions: create, edit, activate/deactivate, delete (soft or permanent)",
            },
          ],
        },
        {
          type: "callout",
          tone: "tip",
          text: {
            fr: "Lors d'un changement d'étape sur une candidature, seules les étapes cibles reliées par une transition active depuis l'étape courante sont proposées — cela garantit un parcours de recrutement cohérent et maîtrisé.",
            en: "When changing an application's stage, only target stages linked by an active transition from the current stage are offered — this ensures a consistent and controlled recruitment journey.",
          },
        },
      ],
    },
    {
      heading: { fr: "Bonnes pratiques", en: "Best practices" },
      icon: "sparkles",
      blocks: [
        {
          type: "list",
          items: [
            {
              fr: "Configurez les référentiels dans l'ordre : diplômes d'entrée et niveaux académiques, puis filières et leur association Filière × niveau, puis canaux d'acquisition, et enfin étapes et transitions du funnel",
              en: "Configure reference data in order: entry diplomas and academic levels first, then program tracks and their Track × level association, then acquisition channels, and finally funnel stages and transitions",
            },
            {
              fr: "Utilisez les rangs (rankOrder) de façon cohérente entre diplômes et niveaux pour que les règles d'éligibilité produisent le résultat attendu",
              en: "Use ranks (rankOrder) consistently between diplomas and levels so eligibility rules produce the expected result",
            },
            {
              fr: "Préférez la désactivation à la suppression définitive pour conserver l'historique et éviter de casser des candidatures déjà liées à une ressource",
              en: "Prefer deactivation over permanent deletion to preserve history and avoid breaking applications already linked to a resource",
            },
            {
              fr: "Téléchargez toujours le modèle Excel à jour avant un import en masse sur l'un de ces référentiels",
              en: "Always download the up-to-date Excel template before a bulk import on any of these reference datasets",
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
          question: { fr: "Un ADMIN peut-il consulter la configuration d'un autre établissement ?", en: "Can an ADMIN view another establishment's configuration?" },
          answer: {
            fr: "Non. Un ADMIN ne voit et ne configure que son propre établissement. Seul un SUPER_ADMIN peut consulter et administrer la configuration de tous les établissements.",
            en: "No. An ADMIN only sees and configures their own establishment. Only a SUPER_ADMIN can view and administer the configuration of all establishments.",
          },
        },
        {
          type: "faq",
          question: { fr: "Que se passe-t-il si je désactive un diplôme d'entrée déjà utilisé par des candidats ?", en: "What happens if I deactivate an entry diploma already used by candidates?" },
          answer: {
            fr: "Les candidats existants conservent leur diplôme d'entrée ; seule la sélection de ce diplôme pour de nouveaux candidats devient indisponible.",
            en: "Existing candidates keep their entry diploma; only the selection of that diploma for new candidates becomes unavailable.",
          },
        },
        {
          type: "faq",
          question: { fr: "Puis-je avoir plusieurs étapes du funnel de type FINAL_SUCCESS ?", en: "Can I have several funnel stages of type FINAL_SUCCESS?" },
          answer: {
            fr: "Non, un établissement ne peut avoir qu'une seule étape FINAL_SUCCESS active à la fois ; ce point d'arrivée unique garantit la cohérence de la règle d'admission unique.",
            en: "No, an establishment can only have one active FINAL_SUCCESS stage at a time; this single end point guarantees the consistency of the single-admission rule.",
          },
        },
        {
          type: "faq",
          question: { fr: "Une filière peut-elle être proposée sans être liée à aucun niveau académique ?", en: "Can a program track be offered without being linked to any academic level?" },
          answer: {
            fr: "Elle peut exister dans le référentiel, mais aucun candidat ne pourra y postuler tant qu'elle n'est pas associée à au moins un niveau académique via Filière × niveau.",
            en: "It can exist in the reference data, but no candidate will be able to apply to it until it is associated with at least one academic level via Track × level.",
          },
        },
        {
          type: "faq",
          question: {
            fr: "Pourquoi un OPERATOR ne voit-il aucun établissement après sa création ?",
            en: "Why doesn't an OPERATOR see any establishment after being created?",
          },
          answer: {
            fr: "Un OPERATOR n'a accès à aucun établissement par défaut. Un ADMIN doit lui affecter explicitement un ou plusieurs établissements depuis le panel Utilisateurs (menu d'actions > Gérer les établissements).",
            en: "An OPERATOR has no establishment access by default. An ADMIN must explicitly assign them one or more establishments from the Users panel (actions menu > Manage establishments).",
          },
        },
      ],
    },
  ],
};
