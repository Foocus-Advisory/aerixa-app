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
  const { sessionLocked, accessToken } = useDashboardStore();
  const router = useRouter();
  const pathname = usePathname();

  // Charger les tokens au démarrage
  useEffect(() => {
    loadTokensFromStorage();
  }, [loadTokensFromStorage]);

  // Activer la détection d'inactivité
  useInactivityLock();

  // Rediriger vers session-locked si verrouillé
  useEffect(() => {
    const publicRoutes = ["/login", "/register", "/forgot-password", "/define-password", "/reset-password", "/", "/session-locked"];
    const isLocalizedResetPassword = /^\/(fr|en)\/reset-password$/.test(pathname);
    
    if (
      sessionLocked &&
      accessToken &&
      !publicRoutes.includes(pathname) &&
      !isLocalizedResetPassword
    ) {
      router.replace("/session-locked");
    }
  }, [sessionLocked, accessToken, pathname, router]);

  return <>{children}</>;
}
