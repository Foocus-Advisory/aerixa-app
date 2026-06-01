/**
 * Utilitaires pour décoder et valider les JWT tokens
 */

export interface JwtPayload {
  sub?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

/**
 * Décode un JWT sans vérifier la signature (pour lecture locale uniquement)
 * ATTENTION: Ne valide pas la signature. À utiliser uniquement pour lire les claims.
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const decoded = atob(parts[1]);
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Vérifie si un token est expiré
 * Retourne true si expiré (ou pas de timestamp d'expiration)
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload?.exp) {
    return true;
  }

  // exp est en secondes, Date.now() est en millisecondes
  // On ajoute 60 secondes de buffer pour éviter les race conditions
  const expirationMs = payload.exp * 1000;
  return Date.now() >= expirationMs - 60000;
}

/**
 * Retourne le temps en secondes avant l'expiration du token
 * Retourne 0 ou négatif si expiré
 */
export function getTokenExpiresIn(token: string): number {
  const payload = decodeJwt(token);
  if (!payload?.exp) {
    return 0;
  }

  const expirationMs = payload.exp * 1000;
  return Math.max(0, Math.ceil((expirationMs - Date.now()) / 1000));
}
