"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { useDashboardStore } from "@/store/dashboard-store";
import { isTokenExpired } from "@/lib/jwt-utils";
import { slugToTab } from "@/lib/dashboard-routes";

export default function DashboardSectionPage() {
  const router = useRouter();
  const params = useParams<{ slug: string[] }>();
  const { accessToken, loadTokensFromStorage, setActiveTab } = useDashboardStore();
  const [isHydrated, setIsHydrated] = useState(false);

  const slug = Array.isArray(params?.slug) ? params.slug : [];
  const tabKey = slugToTab(slug);

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
    if (!tabKey) {
      router.replace("/dashboard");
      return;
    }
    setActiveTab(tabKey);
  }, [isHydrated, accessToken, tabKey, router, setActiveTab]);

  if (!isHydrated || !accessToken || isTokenExpired(accessToken) || !tabKey) {
    return null;
  }

  return <AdminDashboard />;
}
