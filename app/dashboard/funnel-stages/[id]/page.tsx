"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, Pencil, Power, Trash2, Workflow } from "lucide-react";
import { api } from "@/lib/api";
import { useDashboardStore } from "@/store/dashboard-store";
import { buildPermissionSet, hasPermission } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { AdminTopBar } from "@/components/dashboard/admin-top-bar";
import { AppTooltip } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isTokenExpired } from "@/lib/jwt-utils";
import type { FunnelStageType } from "@/lib/types";

function formatDate(value: string, locale: "fr" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function FunnelStageDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { accessToken, locale, loadTokensFromStorage, setActiveTab } = useDashboardStore();
  const [isHydrated, setIsHydrated] = useState(false);

  const stageId = useMemo(() => {
    const rawId = params?.id;
    return Array.isArray(rawId) ? rawId[0] : rawId ?? "";
  }, [params]);

  const establishmentId = searchParams?.get("establishmentId") ?? "";

  const { toast } = useToast();

  useEffect(() => {
    loadTokensFromStorage();
    setActiveTab("config-funnel-stages");
    setIsHydrated(true);
  }, [loadTokensFromStorage, setActiveTab]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken || isTokenExpired(accessToken)) {
      router.replace("/login?reason=auth_required");
    }
  }, [accessToken, isHydrated, router]);

  const currentUserQuery = useQuery({
    queryKey: ["funnel-stage-detail", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });

  const stageQuery = useQuery({
    queryKey: ["funnel-stage", "detail", accessToken, establishmentId, stageId],
    queryFn: () => api.configuration.funnelStages.get(accessToken, stageId, establishmentId),
    enabled: Boolean(accessToken && stageId && establishmentId),
  });

  const stage = stageQuery.data;

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);
  const canUpdate = hasPermission(permissionSet, "funnel_stages:update");
  const canToggleStatus =
    hasPermission(permissionSet, "funnel_stages:activate") || hasPermission(permissionSet, "funnel_stages:deactivate");
  const canDelete = hasPermission(permissionSet, "funnel_stages:delete");

  const activateMutation = useMutation({
    mutationFn: () => api.configuration.funnelStages.activate(accessToken, stageId, establishmentId),
    onSuccess: () => stageQuery.refetch(),
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => api.configuration.funnelStages.deactivate(accessToken, stageId, establishmentId),
    onSuccess: () => stageQuery.refetch(),
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.configuration.funnelStages.delete(accessToken, stageId, establishmentId),
    onSuccess: () => {
      toast({ variant: "success", title: locale === "fr" ? "Étape archivée" : "Stage archived" });
      router.push(`/dashboard/funnel-stages?establishmentId=${establishmentId}`);
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const stageTypeLabel = (type: FunnelStageType) => {
    switch (type) {
      case "INITIAL": return locale === "fr" ? "Initiale" : "Initial";
      case "INTERMEDIATE": return locale === "fr" ? "Intermédiaire" : "Intermediate";
      case "FINAL_SUCCESS": return locale === "fr" ? "Succès final" : "Final success";
      case "FINAL_FAILURE": return locale === "fr" ? "Échec final" : "Final failure";
      default: return type;
    }
  };

  const stageTypeBadgeVariant = (type: FunnelStageType): "secondary" | "outline" | "success" | "danger" => {
    switch (type) {
      case "INITIAL": return "secondary";
      case "INTERMEDIATE": return "outline";
      case "FINAL_SUCCESS": return "success";
      case "FINAL_FAILURE": return "danger";
      default: return "outline";
    }
  };

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
              { label: locale === "fr" ? "Étapes du tunnel" : "Funnel stages" },
              { label: stage?.name ?? (locale === "fr" ? "Détail" : "Detail") },
            ]}
            onNavigate={(_tab, stepsBack) => {
              for (let i = 0; i < stepsBack; i++) router.back();
            }}
          />

          {/* Header card */}
          <Card className="border-border/60 bg-card/70 shadow-sm">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
                  <Workflow className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl md:text-3xl">
                    {stageQuery.isLoading ? (locale === "fr" ? "Chargement..." : "Loading...") : (stage?.name ?? (locale === "fr" ? "Étape de tunnel" : "Funnel stage"))}
                  </CardTitle>
                  <CardDescription>
                    {stage ? <span className="font-mono">{stage.code}</span> : null}
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
                {canToggleStatus && stage && (
                  <AppTooltip content={stage.active ? (locale === "fr" ? "Désactiver" : "Deactivate") : (locale === "fr" ? "Activer" : "Activate")}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
                      onClick={() => stage.active ? deactivateMutation.mutate() : activateMutation.mutate()}
                      disabled={activateMutation.isPending || deactivateMutation.isPending}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </AppTooltip>
                )}
                {canUpdate && stage && (
                  <AppTooltip content={locale === "fr" ? "Modifier" : "Edit"}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
                      onClick={() => router.push(`/dashboard/funnel-stages?establishmentId=${establishmentId}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </AppTooltip>
                )}
                {canDelete && stage && (
                  <AppTooltip content={locale === "fr" ? "Supprimer" : "Delete"}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (window.confirm(locale === "fr" ? "Confirmer l'archivage de cette étape ?" : "Confirm archiving this stage?")) {
                          deleteMutation.mutate();
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AppTooltip>
                )}
                {stage && (
                  <Badge variant={stage.active ? "success" : "outline"}>
                    {stage.active ? (locale === "fr" ? "Actif" : "Active") : (locale === "fr" ? "Inactif" : "Inactive")}
                  </Badge>
                )}
              </div>
            </CardHeader>
          </Card>

          {stageQuery.isLoading ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-muted-foreground">{locale === "fr" ? "Chargement..." : "Loading..."}</CardContent>
            </Card>
          ) : stageQuery.isError ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-destructive">{locale === "fr" ? "Impossible de charger la fiche." : "Could not load the record."}</CardContent>
            </Card>
          ) : !stage ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-muted-foreground">{locale === "fr" ? "Étape introuvable." : "Stage not found."}</CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              {/* Info panel */}
              <Card className="border-border/60 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Workflow className="h-4 w-4" />
                    {stage.code}
                  </CardTitle>
                  <CardDescription>{stage.name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Type d'étape" : "Stage type"}</p>
                    <div className="mt-1.5">
                      <Badge variant={stageTypeBadgeVariant(stage.stageType)}>{stageTypeLabel(stage.stageType)}</Badge>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Position" : "Position"}</p>
                    <p className="mt-1 font-mono">{stage.positionOrder}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Créé le" : "Created at"}</p>
                    <p className="mt-1 text-xs">{formatDate(stage.createdAt, locale)}</p>
                    {stage.createdByLabel && <p className="mt-0.5 text-xs text-muted-foreground">{stage.createdByLabel}</p>}
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Modifié le" : "Updated at"}</p>
                    <p className="mt-1 text-xs">{formatDate(stage.updatedAt, locale)}</p>
                    {stage.updatedByLabel && <p className="mt-0.5 text-xs text-muted-foreground">{stage.updatedByLabel}</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Description panel */}
              <Card className="border-border/60 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Description
                  </CardTitle>
                  <CardDescription>
                    {locale === "fr" ? "Détails complémentaires sur cette étape du tunnel." : "Additional details about this funnel stage."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stage.description ? (
                    <p className="whitespace-pre-wrap rounded-lg border border-border/70 bg-background/70 p-4 text-sm leading-relaxed">
                      {stage.description}
                    </p>
                  ) : (
                    <p className="rounded-lg border border-dashed border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
                      {locale === "fr" ? "Aucune description renseignée." : "No description provided."}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
