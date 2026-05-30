"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboardStore } from "@/store/dashboard-store";
import { isTokenExpired } from "@/lib/jwt-utils";

interface ProtectedPageProps {
  children: React.ReactNode;
}

/**
 * Composant HOC pour protéger les pages du dashboard
 * Redirige automatiquement vers /login si:
 * - Pas de token
 * - Token expiré
 */
export function withAuthProtection<P extends ProtectedPageProps>(
  Component: React.ComponentType<P>,
) {
  return function ProtectedComponent(props: P) {
    const router = useRouter();
    const accessToken = useDashboardStore((state) => state.accessToken);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
      // Vérifier si le token existe et n'est pas expiré
      if (!accessToken || isTokenExpired(accessToken)) {
        // Token absent ou expiré, rediriger vers login
        router.push("/login");
        return;
      }

      // Token valide
      setIsAuthorized(true);
      setIsLoading(false);
    }, [accessToken, router]);

    if (isLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="animate-spin rounded-full border-4 border-muted border-t-primary h-12 w-12" />
        </div>
      );
    }

    if (!isAuthorized) {
      return null;
    }

    return <Component {...props} />;
  };
}
