"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { useDashboardStore } from "@/store/dashboard-store";
import { isTokenExpired } from "@/lib/jwt-utils";

export default function DashboardPage() {
  const router = useRouter();
  const { accessToken, loadTokensFromStorage } = useDashboardStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Charger les tokens du sessionStorage en priorité (au cas où c'est un refresh de page)
    loadTokensFromStorage();
    setIsHydrated(true);
  }, [loadTokensFromStorage]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    // Vérifier que le token existe et n'est pas expiré
    if (!accessToken || isTokenExpired(accessToken)) {
      router.replace("/login?reason=auth_required");
    }
  }, [accessToken, isHydrated, router]);

  if (!isHydrated || !accessToken || isTokenExpired(accessToken)) {
    return null;
  }

  return <AdminDashboard />;
}
