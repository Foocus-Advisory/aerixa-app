"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Link2 } from "lucide-react";
import { api } from "@/lib/api";
import { useDashboardStore } from "@/store/dashboard-store";
import { AppSidebar } from "@/components/app-sidebar";
import { AdminTopBar } from "@/components/dashboard/admin-top-bar";
import { AppTooltip } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isTokenExpired } from "@/lib/jwt-utils";

function formatDate(value: string, locale: "fr" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function ProgramTrackLevelDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { accessToken, locale, loadTokensFromStorage, setActiveTab } = useDashboardStore();
  const [isHydrated, setIsHydrated] = useState(false);

  const trackLevelId = useMemo(() => {
    const rawId = params?.id;
    return Array.isArray(rawId) ? rawId[0] : rawId ?? "";
  }, [params]);

  const establishmentId = searchParams?.get("establishmentId") ?? "";

  useEffect(() => {
    loadTokensFromStorage();
    setActiveTab("config-program-track-levels");
    setIsHydrated(true);
  }, [loadTokensFromStorage, setActiveTab]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken || isTokenExpired(accessToken)) {
      router.replace("/login?reason=auth_required");
    }
  }, [accessToken, isHydrated, router]);

  const trackLevelQuery = useQuery({
    queryKey: ["program-track-level", "detail", accessToken, establishmentId, trackLevelId],
    queryFn: () => api.configuration.programTrackLevels.get(accessToken, trackLevelId, establishmentId),
    enabled: Boolean(accessToken && trackLevelId && establishmentId),
  });

  const programTracksQuery = useQuery({
    queryKey: ["config", "program-tracks", accessToken, establishmentId],
    queryFn: () => api.configuration.programTracks.list(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId),
  });

  const academicLevelsQuery = useQuery({
    queryKey: ["config", "academic-levels", accessToken, establishmentId],
    queryFn: () => api.configuration.academicLevels.list(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId),
  });

  const trackLevel = trackLevelQuery.data;
  const programTrack = useMemo(
    () => (programTracksQuery.data ?? []).find((track) => track.id === trackLevel?.programTrackId),
    [programTracksQuery.data, trackLevel?.programTrackId],
  );
  const academicLevel = useMemo(
    () => (academicLevelsQuery.data ?? []).find((level) => level.id === trackLevel?.academicLevelId),
    [academicLevelsQuery.data, trackLevel?.academicLevelId],
  );

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
              { label: locale === "fr" ? "Filière × niveau" : "Track × level" },
              { label: locale === "fr" ? "Détail" : "Detail" },
            ]}
            onNavigate={(_tab, stepsBack) => {
              for (let i = 0; i < stepsBack; i++) router.back();
            }}
          />

          <Card className="border-border/60 bg-card/70 shadow-sm">
            <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
                  <Link2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl md:text-3xl">
                    {trackLevelQuery.isLoading
                      ? (locale === "fr" ? "Chargement..." : "Loading...")
                      : (programTrack && academicLevel
                          ? `${programTrack.name} — ${academicLevel.label}`
                          : (locale === "fr" ? "Filière × niveau" : "Track × level"))}
                  </CardTitle>
                  <CardDescription>
                    {locale === "fr" ? "Association filière et niveau académique." : "Program track and academic level association."}
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 p-1.5">
                <AppTooltip content={locale === "fr" ? "Retour à la liste" : "Back to list"}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
                    onClick={() => router.back()}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </AppTooltip>
                {trackLevel && (
                  <Badge variant={trackLevel.openForApplication ? "success" : "outline"}>
                    {trackLevel.openForApplication ? (locale === "fr" ? "Ouvert" : "Open") : (locale === "fr" ? "Fermé" : "Closed")}
                  </Badge>
                )}
              </div>
            </CardHeader>
          </Card>

          {trackLevelQuery.isLoading ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-muted-foreground">{locale === "fr" ? "Chargement..." : "Loading..."}</CardContent>
            </Card>
          ) : trackLevelQuery.isError ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-destructive">{locale === "fr" ? "Impossible de charger la fiche." : "Could not load the record."}</CardContent>
            </Card>
          ) : !trackLevel ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-muted-foreground">{locale === "fr" ? "Association introuvable." : "Association not found."}</CardContent>
            </Card>
          ) : (
            <Card className="border-border/60 bg-card/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link2 className="h-4 w-4" />
                  {locale === "fr" ? "Détail de l'association" : "Association details"}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{locale === "fr" ? "Filière" : "Program track"}</p>
                  <p className="mt-1 text-sm">{programTrack ? `${programTrack.code} — ${programTrack.name}` : trackLevel.programTrackId}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{locale === "fr" ? "Niveau académique" : "Academic level"}</p>
                  <p className="mt-1 text-sm">{academicLevel ? `${academicLevel.code} — ${academicLevel.label}` : trackLevel.academicLevelId}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{locale === "fr" ? "Ouvert pour candidature" : "Open for application"}</p>
                  <div className="mt-1">
                    <Badge variant={trackLevel.openForApplication ? "success" : "outline"}>
                      {trackLevel.openForApplication ? (locale === "fr" ? "Ouvert" : "Open") : (locale === "fr" ? "Fermé" : "Closed")}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{locale === "fr" ? "Créé le" : "Created at"}</p>
                  <p className="mt-1 text-xs">{formatDate(trackLevel.createdAt, locale)}</p>
                  {trackLevel.createdByLabel && <p className="mt-0.5 text-xs text-muted-foreground">{trackLevel.createdByLabel}</p>}
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{locale === "fr" ? "Modifié le" : "Updated at"}</p>
                  <p className="mt-1 text-xs">{formatDate(trackLevel.updatedAt, locale)}</p>
                  {trackLevel.updatedByLabel && <p className="mt-0.5 text-xs text-muted-foreground">{trackLevel.updatedByLabel}</p>}
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
