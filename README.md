# AERIXA Web Admin

Frontend admin Next.js (TypeScript) pour piloter les endpoints Auth/RBAC/Sessions de l'API AERIXA.

## Stack
- Next.js 16 + React 19 + TypeScript
- Tailwind CSS v4
- React Query (TanStack)
- Zustand
- next-themes (dark/light)
- UI style ShadCn (`components/ui/*`)
- `fetch` natif (pas d'axios)

## Variables d'environnement

Fichiers disponibles:
- `.env.local`
- `.env.development`
- `.env.production`
- `.env.example`

Variable principale:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

## Démarrage

```bash
npm install
npm run dev
```

Ouvrir: `http://localhost:3000`

## Dashboard inclus

Le dashboard admin intègre visuellement les endpoints backend:

### Auth
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/password-reset/request`
- `POST /api/v1/auth/password-reset/confirm`

### Sessions
- `GET /api/v1/auth/sessions`
- `DELETE /api/v1/auth/sessions/{sessionId}`
- `POST /api/v1/auth/sessions/revoke-others`

### Users (RBAC)
- `GET /api/v1/users`
- `GET /api/v1/users/{id}`
- `POST /api/v1/users`
- `PATCH /api/v1/users/{id}/status`
- `POST /api/v1/users/{id}/revoke-sessions`

## UI / Design system

- Thème light/dark configurable depuis l'UI
- FR/EN intégré (switch instantané)
- Variables design tokens alignées sur ta palette fournie
- Typographie Grift via `font-family` avec fallback local

Note sur la police:
- Le projet référence `Grift` en local (`@font-face` avec `local("Grift")`).
- Si la police n'est pas installée sur la machine, fallback automatique sur Lexend.

## Vérification qualité

```bash
npm run lint
npm run build
```

Les deux commandes passent actuellement.

## Self Data Policy

Règles obligatoires pour les données utilisateur:

- Les données du compte connecté doivent passer par des endpoints self (`/me`) et non par un listing global filtré côté client.
- Le endpoint `/api/v1/users` est réservé aux vues de gestion utilisateurs où la liste est réellement nécessaire.
- Pour les filtres/listes de sélection (sessions, dropdowns), privilégier des endpoints minimaux (ex: `/api/v1/users/options`).
- Le client principal pour les opérations utilisateurs est `lib/api.ts`. Ne pas réintroduire de surface users dans les clients spécialisés.

Contrôle de revue:

- Rejeter toute PR qui ajoute un pattern `list users + find/filter` pour reconstruire l'utilisateur courant.
- Rejeter toute PR qui utilise `/api/v1/users` dans une vue non-admin pour afficher des données self.
