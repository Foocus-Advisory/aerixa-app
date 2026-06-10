"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { useDashboardStore } from "@/store/dashboard-store";
import { isTokenExpired } from "@/lib/jwt-utils";

export default function DashboardPage() {
  const router = useRouter();
  const { accessToken, loadTokensFromStorage, setActiveTab } = useDashboardStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    loadTokensFromStorage();
    setIsHydrated(true);
  }, [loadTokensFromStorage]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken || isTokenExpired(accessToken)) {
      router.replace("/login?reason=auth_required");
      return;
    }
    setActiveTab("dashboard");
  }, [isHydrated, accessToken, router, setActiveTab]);

  if (!isHydrated || !accessToken || isTokenExpired(accessToken)) {
    return null;
  }

  return <AdminDashboard />;
}
