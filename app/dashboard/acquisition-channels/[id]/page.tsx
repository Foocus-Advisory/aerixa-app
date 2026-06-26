"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Megaphone } from "lucide-react";
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

export default function AcquisitionChannelDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { accessToken, locale, loadTokensFromStorage, setActiveTab } = useDashboardStore();
  const [isHydrated, setIsHydrated] = useState(false);

  const channelId = useMemo(() => {
    const rawId = params?.id;
    return Array.isArray(rawId) ? rawId[0] : rawId ?? "";
  }, [params]);

  const establishmentId = searchParams?.get("establishmentId") ?? "";

  useEffect(() => {
    loadTokensFromStorage();
    setActiveTab("config-acquisition-channels");
    setIsHydrated(true);
  }, [loadTokensFromStorage, setActiveTab]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken || isTokenExpired(accessToken)) {
      router.replace("/login?reason=auth_required");
    }
  }, [accessToken, isHydrated, router]);

  const channelQuery = useQuery({
    queryKey: ["acquisition-channel", "detail", accessToken, establishmentId, channelId],
    queryFn: () => api.configuration.acquisitionChannels.get(accessToken, channelId, establishmentId),
    enabled: Boolean(accessToken && channelId && establishmentId),
  });

  const channel = channelQuery.data;

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
              { label: locale === "fr" ? "Canaux d'acquisition" : "Acquisition channels" },
              { label: channel?.name ?? (locale === "fr" ? "Détail" : "Detail") },
            ]}
            onNavigate={(_tab, stepsBack) => {
              for (let i = 0; i < stepsBack; i++) router.back();
            }}
          />

          <Card className="border-border/60 bg-card/70 shadow-sm">
            <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
                  <Megaphone className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl md:text-3xl">
                    {channelQuery.isLoading ? (locale === "fr" ? "Chargement..." : "Loading...") : (channel?.name ?? (locale === "fr" ? "Canal d'acquisition" : "Acquisition channel"))}
                  </CardTitle>
                  <CardDescription>
                    {channel ? <span className="font-mono">{channel.code}</span> : null}
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
                {channel && (
                  <Badge variant={channel.active ? "success" : "outline"}>
                    {channel.active ? (locale === "fr" ? "Actif" : "Active") : (locale === "fr" ? "Inactif" : "Inactive")}
                  </Badge>
                )}
              </div>
            </CardHeader>
          </Card>

          {channelQuery.isLoading ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-muted-foreground">{locale === "fr" ? "Chargement..." : "Loading..."}</CardContent>
            </Card>
          ) : channelQuery.isError ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-destructive">{locale === "fr" ? "Impossible de charger la fiche." : "Could not load the record."}</CardContent>
            </Card>
          ) : !channel ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-muted-foreground">{locale === "fr" ? "Canal introuvable." : "Channel not found."}</CardContent>
            </Card>
          ) : (
            <Card className="border-border/60 bg-card/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Megaphone className="h-4 w-4" />
                  {channel.code}
                </CardTitle>
                <CardDescription>{channel.name}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{locale === "fr" ? "Type" : "Type"}</p>
                  <p className="mt-1 font-mono">{channel.type}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{locale === "fr" ? "Statut" : "Status"}</p>
                  <div className="mt-1">
                    <Badge variant={channel.active ? "success" : "outline"}>
                      {channel.active ? (locale === "fr" ? "Actif" : "Active") : (locale === "fr" ? "Inactif" : "Inactive")}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{locale === "fr" ? "Créé le" : "Created at"}</p>
                  <p className="mt-1 text-xs">{formatDate(channel.createdAt, locale)}</p>
                  {channel.createdByLabel && <p className="mt-0.5 text-xs text-muted-foreground">{channel.createdByLabel}</p>}
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{locale === "fr" ? "Modifié le" : "Updated at"}</p>
                  <p className="mt-1 text-xs">{formatDate(channel.updatedAt, locale)}</p>
                  {channel.updatedByLabel && <p className="mt-0.5 text-xs text-muted-foreground">{channel.updatedByLabel}</p>}
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
