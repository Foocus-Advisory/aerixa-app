"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useDashboardStore } from "@/store/dashboard-store";
import { useInactivityLock } from "@/hooks/use-inactivity-lock";

/**
 * Composant qui gère la session:
 * - Charge les tokens au démarrage
 * - Détecte l'inactivité et verrouille la session
 * - Redirige vers session-locked si verrouillé
 */
export function TokenManager({ children }: { children: React.ReactNode }) {
  const loadTokensFromStorage = useDashboardStore((state) => state.loadTokensFromStorage);
  const { sessionLocked, accessToken, isUnlockingInProgress, setPreLockPath } = useDashboardStore();
  const router = useRouter();
  const pathname = usePathname();

  // Charger les tokens au démarrage
  useEffect(() => {
    loadTokensFromStorage();
  }, [loadTokensFromStorage]);

  // Activer la détection d'inactivité
  useInactivityLock();

  // Rediriger vers session-locked si verrouillé (sauf si en cours de déverrouillage)
  useEffect(() => {
    const publicRoutes = ["/login", "/register", "/forgot-password", "/define-password", "/reset-password", "/", "/session-locked"];
    const isLocalizedResetPassword = /^\/(fr|en)\/reset-password$/.test(pathname);
    
    if (
      sessionLocked &&
      accessToken &&
      !isUnlockingInProgress &&
      !publicRoutes.includes(pathname) &&
      !isLocalizedResetPassword
    ) {
      setPreLockPath(pathname);
      router.push("/session-locked");
    }
  }, [sessionLocked, accessToken, isUnlockingInProgress, pathname, router]);

  return <>{children}</>;
}
