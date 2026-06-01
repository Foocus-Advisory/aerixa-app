"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MailTemplatesAdminPanel } from "@/components/admin/mail-templates/mail-templates-admin-panel";
import { useDashboardStore } from "@/store/dashboard-store";

export default function MailTemplatesAdminPage() {
  const router = useRouter();
  const { accessToken, locale, loadTokensFromStorage } = useDashboardStore();
  const [isHydrated, setIsHydrated] = useState(false);

  const labels = locale === "fr"
    ? {
        title: "Gestion des Templates de Mail",
        subtitle: "Administrez les types et templates de mail pour toute la plateforme",
      }
    : {
        title: "Mail Templates Management",
        subtitle: "Manage mail types and templates across the platform",
      };

  useEffect(() => {
    loadTokensFromStorage();
    setIsHydrated(true);
  }, [loadTokensFromStorage]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!accessToken) {
      router.replace("/login?reason=auth_required");
      return;
    }
  }, [accessToken, isHydrated, router]);

  if (!isHydrated || !accessToken) {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {labels.title}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {labels.subtitle}
        </p>
      </div>

      <MailTemplatesAdminPanel accessToken={accessToken} locale={locale} />
    </div>
  );
}
