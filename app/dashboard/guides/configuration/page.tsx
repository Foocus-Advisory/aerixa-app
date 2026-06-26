"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Download, Settings } from "lucide-react";
import { api } from "@/lib/api";
import { buildPermissionSet } from "@/lib/permissions";
import { useDashboardStore } from "@/store/dashboard-store";
import { AppSidebar } from "@/components/app-sidebar";
import { AdminTopBar } from "@/components/dashboard/admin-top-bar";
import { MobileSectionTabs } from "@/components/dashboard/mobile-section-tabs";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GuideContent } from "@/components/dashboard/guide-content";
import { downloadGuidePdf } from "@/lib/guides/generate-guide-pdf";
import { configurationGuide } from "@/lib/guides/configuration-guide";
import { isTokenExpired } from "@/lib/jwt-utils";

export default function ConfigurationGuidePage() {
  const router = useRouter();
  const { accessToken, locale, loadTokensFromStorage, setActiveTab } = useDashboardStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    loadTokensFromStorage();
    setActiveTab("guides-configuration");
    setIsHydrated(true);
  }, [loadTokensFromStorage, setActiveTab]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken || isTokenExpired(accessToken)) {
      router.replace("/login?reason=auth_required");
    }
  }, [accessToken, isHydrated, router]);

  const currentUserQuery = useQuery({
    queryKey: ["guides-configuration", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);

  if (!isHydrated || !accessToken || isTokenExpired(accessToken)) {
    return null;
  }

  return (
    <div className="admin-typography min-h-screen bg-background text-foreground">
      <AppSidebar />

      <div className="pb-20 md:pb-0 md:pl-22.5">
        <AdminTopBar />

        <main className="w-full space-y-6 px-3 py-4 pb-24 md:px-8 md:py-8 md:pb-8">
          <Breadcrumbs
            items={[
              { label: locale === "fr" ? "Guides" : "Guides" },
              { label: locale === "fr" ? "Configuration" : "Configuration" },
            ]}
          />

          <MobileSectionTabs permissionSet={permissionSet} />

          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-linear-to-br from-secondary/15 via-primary/10 to-transparent p-6 md:p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-secondary/20 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-primary/20 blur-3xl"
            />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-lg shadow-secondary/30">
                  <Settings className="h-7 w-7" />
                </span>
                <div className="space-y-2">
                  <Badge className="bg-secondary/15 text-secondary" variant="outline">
                    {locale === "fr" ? "Guide ADMIN & SUPER_ADMIN" : "ADMIN & SUPER_ADMIN guide"}
                  </Badge>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                    {locale === "fr" ? "Configuration des référentiels métier" : "Business reference data configuration"}
                  </h1>
                  <p className="max-w-xl text-sm text-muted-foreground md:text-base">
                    {locale === "fr"
                      ? "Établissements, diplômes, niveaux, filières, canaux d'acquisition et funnel de recrutement."
                      : "Establishments, diplomas, levels, program tracks, acquisition channels and recruitment funnel."}
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                className="h-12 shrink-0 rounded-2xl bg-secondary px-6 text-secondary-foreground shadow-lg shadow-secondary/30 hover:bg-secondary/90"
                onClick={() =>
                  void downloadGuidePdf(
                    configurationGuide,
                    locale,
                    locale === "fr" ? "guide-configuration-referentiels.pdf" : "configuration-guide.pdf",
                  )
                }
              >
                <Download className="mr-2 h-4 w-4" />
                {locale === "fr" ? "Télécharger en PDF" : "Download as PDF"}
              </Button>
            </div>
          </div>

          <GuideContent guide={configurationGuide} locale={locale} />
        </main>
      </div>
    </div>
  );
}
