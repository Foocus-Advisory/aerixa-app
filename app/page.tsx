"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboardStore } from "@/store/dashboard-store";

export default function Home() {
  const router = useRouter();
  const { accessToken, loadTokensFromStorage } = useDashboardStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    loadTokensFromStorage();
    setIsHydrated(true);
  }, [loadTokensFromStorage]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (accessToken) {
      router.replace("/dashboard");
      return;
    }
    router.replace("/login?reason=auth_required");
  }, [accessToken, isHydrated, router]);

  return null;
}
