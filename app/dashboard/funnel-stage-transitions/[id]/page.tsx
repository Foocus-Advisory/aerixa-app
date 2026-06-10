"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Pencil, Power, Trash2, Workflow } from "lucide-react";
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

function formatDate(value: string, locale: "fr" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function FunnelStageTransitionDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { accessToken, locale, loadTokensFromStorage, setActiveTab } = useDashboardStore();
  const [isHydrated, setIsHydrated] = useState(false);

  const transitionId = useMemo(() => {
    const rawId = params?.id;
    return Array.isArray(rawId) ? rawId[0] : rawId ?? "";
  }, [params]);

  const establishmentId = searchParams?.get("establishmentId") ?? "";

  const { toast } = useToast();

  useEffect(() => {
    loadTokensFromStorage();
    setActiveTab("config-funnel-stage-transitions");
    setIsHydrated(true);
  }, [loadTokensFromStorage, setActiveTab]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken || isTokenExpired(accessToken)) {
      router.replace("/login?reason=auth_required");
    }
  }, [accessToken, isHydrated, router]);

  const currentUserQuery = useQuery({
    queryKey: ["funnel-stage-transition-detail", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });

  const transitionQuery = useQuery({
    queryKey: ["funnel-stage-transition", "detail", accessToken, establishmentId, transitionId],
    queryFn: () => api.configuration.funnelStageTransitions.get(accessToken, transitionId, establishmentId),
    enabled: Boolean(accessToken && transitionId && establishmentId),
  });

  const transition = transitionQuery.data;

  const stagesQuery = useQuery({
    queryKey: ["config", "funnel-stages", accessToken, establishmentId],
    queryFn: () => api.configuration.funnelStages.list(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId),
  });

  const stages = useMemo(() => stagesQuery.data ?? [], [stagesQuery.data]);
  const stageById = useMemo(() => {
    const map = new Map<string, { code: string; name: string; description?: string }>();
    stages.forEach((stage) => map.set(stage.id, { code: stage.code, name: stage.name, description: stage.description }));
    return map;
  }, [stages]);

  const fromStage = transition ? stageById.get(transition.fromStageId) : undefined;
  const toStage = transition ? stageById.get(transition.toStageId) : undefined;

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);
  const canUpdate = hasPermission(permissionSet, "funnel_stage_transitions:update");
  const canToggleStatus =
    hasPermission(permissionSet, "funnel_stage_transitions:activate") || hasPermission(permissionSet, "funnel_stage_transitions:deactivate");
  const canDelete = hasPermission(permissionSet, "funnel_stage_transitions:delete");

  const activateMutation = useMutation({
    mutationFn: () => api.configuration.funnelStageTransitions.activate(accessToken, transitionId, establishmentId),
    onSuccess: () => transitionQuery.refetch(),
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => api.configuration.funnelStageTransitions.deactivate(accessToken, transitionId, establishmentId),
    onSuccess: () => transitionQuery.refetch(),
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.configuration.funnelStageTransitions.delete(accessToken, transitionId, establishmentId),
    onSuccess: () => {
      toast({ variant: "success", title: locale === "fr" ? "Transition archivée" : "Transition archived" });
      router.push(`/dashboard/funnel-stage-transitions?establishmentId=${establishmentId}`);
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

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
              { label: locale === "fr" ? "Transitions du tunnel" : "Funnel stage transitions" },
              { label: locale === "fr" ? "Détail" : "Detail" },
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
                    {transitionQuery.isLoading
                      ? (locale === "fr" ? "Chargement..." : "Loading...")
                      : (locale === "fr" ? "Transition de tunnel" : "Funnel stage transition")}
                  </CardTitle>
                  {transition && (
                    <CardDescription>
                      <span className="inline-flex items-center gap-2">
                        <span className="font-medium text-foreground">{fromStage?.name ?? transition.fromStageId}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span className="font-medium text-foreground">{toStage?.name ?? transition.toStageId}</span>
                      </span>
                    </CardDescription>
                  )}
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
                {canToggleStatus && transition && (
                  <AppTooltip content={transition.active ? (locale === "fr" ? "Désactiver" : "Deactivate") : (locale === "fr" ? "Activer" : "Activate")}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
                      onClick={() => transition.active ? deactivateMutation.mutate() : activateMutation.mutate()}
                      disabled={activateMutation.isPending || deactivateMutation.isPending}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </AppTooltip>
                )}
                {canUpdate && transition && (
                  <AppTooltip content={locale === "fr" ? "Modifier" : "Edit"}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
                      onClick={() => router.push(`/dashboard/funnel-stage-transitions?establishmentId=${establishmentId}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </AppTooltip>
                )}
                {canDelete && transition && (
                  <AppTooltip content={locale === "fr" ? "Supprimer" : "Delete"}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (window.confirm(locale === "fr" ? "Confirmer l'archivage de cette transition ?" : "Confirm archiving this transition?")) {
                          deleteMutation.mutate();
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AppTooltip>
                )}
                {transition && (
                  <Badge variant={transition.active ? "success" : "outline"}>
                    {transition.active ? (locale === "fr" ? "Actif" : "Active") : (locale === "fr" ? "Inactif" : "Inactive")}
                  </Badge>
                )}
              </div>
            </CardHeader>
          </Card>

          {transitionQuery.isLoading ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-muted-foreground">{locale === "fr" ? "Chargement..." : "Loading..."}</CardContent>
            </Card>
          ) : transitionQuery.isError ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-destructive">{locale === "fr" ? "Impossible de charger la fiche." : "Could not load the record."}</CardContent>
            </Card>
          ) : !transition ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-muted-foreground">{locale === "fr" ? "Transition introuvable." : "Transition not found."}</CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              {/* Flow panel */}
              <Card className="border-border/60 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Workflow className="h-4 w-4" />
                    {locale === "fr" ? "Flux de la transition" : "Transition flow"}
                  </CardTitle>
                  <CardDescription>
                    {locale === "fr" ? "Étapes liées par cette transition." : "Stages linked by this transition."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-center">
                    <div className="flex-1 rounded-xl border border-border/70 bg-background/70 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{locale === "fr" ? "Étape de départ" : "From stage"}</p>
                      <p className="mt-1 text-lg font-semibold">{fromStage?.name ?? transition.fromStageId}</p>
                      <p className="font-mono text-xs text-muted-foreground">{fromStage?.code ?? "—"}</p>
                      {fromStage?.description && (
                        <p className="mt-2 text-sm text-muted-foreground">{fromStage.description}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-muted/40">
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex-1 rounded-xl border border-border/70 bg-background/70 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{locale === "fr" ? "Étape d'arrivée" : "To stage"}</p>
                      <p className="mt-1 text-lg font-semibold">{toStage?.name ?? transition.toStageId}</p>
                      <p className="font-mono text-xs text-muted-foreground">{toStage?.code ?? "—"}</p>
                      {toStage?.description && (
                        <p className="mt-2 text-sm text-muted-foreground">{toStage.description}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Info panel */}
              <Card className="border-border/60 bg-card/70">
                <CardHeader>
                  <CardTitle className="text-base">{locale === "fr" ? "Informations" : "Information"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Statut" : "Status"}</p>
                    <div className="mt-1.5">
                      <Badge variant={transition.active ? "success" : "outline"}>
                        {transition.active ? (locale === "fr" ? "Actif" : "Active") : (locale === "fr" ? "Inactif" : "Inactive")}
                      </Badge>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Créé le" : "Created at"}</p>
                    <p className="mt-1 text-xs">{formatDate(transition.createdAt, locale)}</p>
                    {transition.createdByLabel && <p className="mt-0.5 text-xs text-muted-foreground">{transition.createdByLabel}</p>}
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Modifié le" : "Updated at"}</p>
                    <p className="mt-1 text-xs">{formatDate(transition.updatedAt, locale)}</p>
                    {transition.updatedByLabel && <p className="mt-0.5 text-xs text-muted-foreground">{transition.updatedByLabel}</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
