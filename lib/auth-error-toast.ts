import { ApiError } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

type ToastPayload = {
  title: string;
  description: string;
};

function readExistingSessionId(details: unknown): string | null {
  if (!details || typeof details !== "object") {
    return null;
  }

  if (!("existingSessionId" in details)) {
    return null;
  }

  const value = (details as { existingSessionId?: unknown }).existingSessionId;
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function getAuthErrorToast(error: unknown, locale: Locale): ToastPayload {
  const fallback =
    locale === "fr"
      ? {
          title: "Echec de connexion",
          description: "La connexion a echoue. Verifie tes identifiants ou reessaie dans quelques instants.",
        }
      : {
          title: "Login failed",
          description: "Login failed. Check your credentials or try again in a few moments.",
        };

  if (!(error instanceof ApiError)) {
    return fallback;
  }

  const isSessionConflict =
    error.errorCode === "SESSION_CONFLICT" || error.messageKey === "auth.error.session_conflict";

  if (isSessionConflict) {
    const existingSessionId = readExistingSessionId(error.details);

    if (locale === "fr") {
      return {
        title: "Session deja active sur un autre appareil",
        description: existingSessionId
          ? `Une session est deja ouverte ailleurs (ID: ${existingSessionId}). Ferme l'autre session puis reconnecte-toi.`
          : "Une session est deja ouverte ailleurs. Ferme l'autre session puis reconnecte-toi.",
      };
    }

    return {
      title: "Another device session is active",
      description: existingSessionId
        ? `An active session already exists on another device (ID: ${existingSessionId}). Close that session and try again.`
        : "An active session already exists on another device. Close that session and try again.",
    };
  }

  return {
    title: locale === "fr" ? "Echec de connexion" : "Login failed",
    description: error.message || fallback.description,
  };
}
