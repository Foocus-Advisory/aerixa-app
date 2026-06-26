"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { GitBranch, LayoutDashboard } from "lucide-react";
import { api } from "@/lib/api";
import { useDashboardStore } from "@/store/dashboard-store";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { MobileSectionTabs } from "@/components/dashboard/mobile-section-tabs";
import { buildPermissionSet } from "@/lib/permissions";
import { AppSidebar } from "@/components/app-sidebar";
import { AdminTopBar } from "@/components/dashboard/admin-top-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { isTokenExpired } from "@/lib/jwt-utils";
import { ProgramTracksSection } from "@/components/dashboard/config-sections/program-tracks-section";

export default function ProgramTracksPage() {
  const router = useRouter();
  const { accessToken, locale, loadTokensFromStorage, setActiveTab } = useDashboardStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedEstId, setSelectedEstId] = useState("");

  useEffect(() => {
    loadTokensFromStorage();
    setActiveTab("config-program-tracks");
    setIsHydrated(true);
  }, [loadTokensFromStorage, setActiveTab]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken || isTokenExpired(accessToken)) {
      router.replace("/login?reason=auth_required");
    }
  }, [accessToken, isHydrated, router]);

  const currentUserQuery = useQuery({
    queryKey: ["program-tracks", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });

  const establishmentsQuery = useQuery({
    queryKey: ["config", "establishments", accessToken],
    queryFn: () => api.configuration.establishments.list(accessToken),
    enabled: Boolean(accessToken),
  });

  const effectiveEstId = selectedEstId || establishmentsQuery.data?.[0]?.id || "";

  const estOptions = useMemo(
    () =>
      (establishmentsQuery.data ?? []).map((est) => ({
        value: est.id,
        label: `${est.code} — ${est.name}`,
        keywords: [est.code, est.name, est.shortName ?? ""],
      })),
    [establishmentsQuery.data],
  );

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);

  if (!isHydrated || !accessToken || isTokenExpired(accessToken)) {
    return null;
  }

  return (
    <div className="admin-typography min-h-screen bg-background text-foreground">
      <AppSidebar />

      <div className="pb-20 md:pb-0 md:pl-22.5">
        <AdminTopBar />

        <main className="w-full space-y-5 px-3 py-4 pb-24 md:space-y-6 md:px-8 md:py-8 md:pb-8">
          <Breadcrumbs
            items={[
              { label: locale === "fr" ? "Configuration" : "Configuration" },
              { label: locale === "fr" ? "Filières" : "Program tracks" },
            ]}
          />

          <MobileSectionTabs permissionSet={permissionSet} />
          <div className="grid gap-6">
            <Card className="border-border/60 bg-card/70 shadow-sm">
              <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-2xl md:text-3xl">
                    {locale === "fr" ? "Dashboard Admin AERIXA" : "AERIXA Admin Dashboard"}
                  </CardTitle>
                  <CardDescription>
                    {locale === "fr" ? "Pilotage Auth, Utilisateurs, Sessions et RBAC" : "Auth, Users, Sessions and RBAC control center"}
                  </CardDescription>
                </div>
                <Badge className="w-fit" variant="outline">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  {locale === "fr" ? "Section : Filières" : "Section: Program tracks"}
                </Badge>
              </CardHeader>
            </Card>

            <Card className="border-border/60 bg-card/70">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
                  <GitBranch className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="grid gap-1 md:max-w-md">
                  <p className="text-xs font-medium text-muted-foreground">{locale === "fr" ? "Etablissement" : "Establishment"}</p>
                  <SearchableSelect
                    options={estOptions}
                    value={effectiveEstId}
                    onValueChange={setSelectedEstId}
                    placeholder={locale === "fr" ? "Sélectionner un établissement" : "Select an establishment"}
                    searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                  />
                  {establishmentsQuery.isError && (
                    <p className="text-xs text-destructive">{locale === "fr" ? "Impossible de charger les établissements." : "Could not load establishments."}</p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {effectiveEstId ? (
                  <ProgramTracksSection accessToken={accessToken} locale={locale} establishmentId={effectiveEstId} />
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {locale === "fr" ? "Sélectionnez un établissement pour afficher les données." : "Select an establishment to view data."}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
