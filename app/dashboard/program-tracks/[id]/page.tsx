"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  GitBranch,
  GraduationCap,
  Link2,
  Pencil,
  Plus,
  Power,
  Trash2,
  X,
} from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isTokenExpired } from "@/lib/jwt-utils";
import type { AcademicLevelResponse, ProgramTrackResponse, UpdateProgramTrackRequest } from "@/lib/types";

function formatDate(value: string, locale: "fr" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

type EditFormState = { name: string; description: string };

export default function ProgramTrackDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { accessToken, locale, loadTokensFromStorage, setActiveTab } = useDashboardStore();
  const [isHydrated, setIsHydrated] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({ name: "", description: "" });
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"soft" | "hard">("soft");

  // Linked academic levels (Niveaux associés)
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [openForApplication, setOpenForApplication] = useState(true);

  const { toast } = useToast();

  const trackId = useMemo(() => {
    const rawId = params?.id;
    return Array.isArray(rawId) ? rawId[0] : rawId ?? "";
  }, [params]);

  const establishmentId = searchParams?.get("establishmentId") ?? "";

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
    queryKey: ["program-track-detail", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });

  const trackQuery = useQuery({
    queryKey: ["program-track", "detail", accessToken, establishmentId, trackId],
    queryFn: () => api.configuration.programTracks.get(accessToken, trackId, establishmentId),
    enabled: Boolean(accessToken && trackId && establishmentId),
  });

  const academicLevelsQuery = useQuery({
    queryKey: ["program-track", "academic-levels", accessToken, establishmentId],
    queryFn: () => api.configuration.academicLevels.list(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId),
  });

  const trackLevelsQuery = useQuery({
    queryKey: ["program-track", "track-levels", accessToken, establishmentId],
    queryFn: () => api.configuration.programTrackLevels.list(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId),
  });

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);
  const canUpdate = hasPermission(permissionSet, "program_tracks:update");
  const canDelete = hasPermission(permissionSet, "program_tracks:delete");
  const canHardDelete = hasPermission(permissionSet, "program_tracks:hard_delete");
  const canToggleStatus =
    hasPermission(permissionSet, "program_tracks:activate") ||
    hasPermission(permissionSet, "program_tracks:deactivate");
  const canLinkLevel = hasPermission(permissionSet, "program_track_levels:create");
  const canUnlinkLevel = hasPermission(permissionSet, "program_track_levels:delete");
  const canToggleLevel =
    hasPermission(permissionSet, "program_track_levels:activate") ||
    hasPermission(permissionSet, "program_track_levels:deactivate");

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateProgramTrackRequest) =>
      api.configuration.programTracks.update(accessToken, trackId, establishmentId, payload),
    onSuccess: async () => {
      await trackQuery.refetch();
      setEditDialogOpen(false);
      setEditError(null);
      toast({ variant: "success", title: locale === "fr" ? "Filière mise à jour" : "Program track updated" });
    },
    onError: (err) => setEditError((err as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.configuration.programTracks.delete(accessToken, trackId, establishmentId),
    onSuccess: () => {
      toast({ variant: "success", title: locale === "fr" ? "Filière supprimée" : "Program track deleted" });
      router.replace(`/dashboard/program-tracks?establishmentId=${establishmentId}`);
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: () => api.configuration.programTracks.hardDelete(accessToken, trackId, establishmentId),
    onSuccess: () => {
      toast({ variant: "success", title: locale === "fr" ? "Filière supprimée définitivement" : "Program track permanently deleted" });
      router.replace(`/dashboard/program-tracks?establishmentId=${establishmentId}`);
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const activateMutation = useMutation({
    mutationFn: () => api.configuration.programTracks.activate(accessToken, trackId, establishmentId),
    onSuccess: async () => {
      await trackQuery.refetch();
      toast({ variant: "success", title: locale === "fr" ? "Filière activée" : "Program track activated" });
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => api.configuration.programTracks.deactivate(accessToken, trackId, establishmentId),
    onSuccess: async () => {
      await trackQuery.refetch();
      toast({ variant: "success", title: locale === "fr" ? "Filière désactivée" : "Program track deactivated" });
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const linkCreateMutation = useMutation({
    mutationFn: () =>
      api.configuration.programTrackLevels.create(accessToken, {
        establishmentId,
        programTrackId: trackId,
        academicLevelId: selectedLevelId,
        openForApplication,
      }),
    onSuccess: async () => {
      await trackLevelsQuery.refetch();
      setSelectedLevelId("");
      setOpenForApplication(true);
      toast({ variant: "success", title: locale === "fr" ? "Niveau lié" : "Level linked" });
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const linkDeleteMutation = useMutation({
    mutationFn: (id: string) => api.configuration.programTrackLevels.delete(accessToken, id, establishmentId),
    onSuccess: async () => {
      await trackLevelsQuery.refetch();
      toast({ variant: "success", title: locale === "fr" ? "Niveau délié" : "Level unlinked" });
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const linkToggleMutation = useMutation({
    mutationFn: ({ id, open }: { id: string; open: boolean }) =>
      open
        ? api.configuration.programTrackLevels.deactivate(accessToken, id, establishmentId)
        : api.configuration.programTrackLevels.activate(accessToken, id, establishmentId),
    onSuccess: async () => {
      await trackLevelsQuery.refetch();
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const track = trackQuery.data as ProgramTrackResponse | undefined;

  const academicLevelsMap = useMemo(() => {
    const map = new Map<string, AcademicLevelResponse>();
    (academicLevelsQuery.data ?? []).forEach((level) => map.set(level.id, level));
    return map;
  }, [academicLevelsQuery.data]);

  const linkedLevels = useMemo(
    () => (trackLevelsQuery.data ?? []).filter((ptl) => ptl.programTrackId === trackId),
    [trackLevelsQuery.data, trackId],
  );

  const linkedLevelIds = useMemo(() => new Set(linkedLevels.map((ptl) => ptl.academicLevelId)), [linkedLevels]);

  const availableLevels = useMemo(
    () => (academicLevelsQuery.data ?? []).filter((level) => !linkedLevelIds.has(level.id)),
    [academicLevelsQuery.data, linkedLevelIds],
  );

  const openEditDialog = () => {
    if (!track) return;
    setEditForm({ name: track.name, description: track.description ?? "" });
    setEditError(null);
    setEditDialogOpen(true);
  };

  const submitEdit = () => {
    if (!editForm.name.trim()) {
      setEditError(locale === "fr" ? "L'intitulé est obligatoire." : "Name is required.");
      return;
    }
    updateMutation.mutate({ name: editForm.name.trim(), description: editForm.description.trim() || undefined });
  };

  if (!isHydrated || !accessToken || isTokenExpired(accessToken)) return null;

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
              { label: track?.name ?? (locale === "fr" ? "Détail" : "Detail") },
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
                  <GitBranch className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl md:text-3xl">
                    {trackQuery.isLoading
                      ? (locale === "fr" ? "Chargement..." : "Loading...")
                      : (track?.name ?? (locale === "fr" ? "Filière" : "Program track"))}
                  </CardTitle>
                  {track && (
                    <CardDescription>
                      <span className="font-mono">{track.code}</span>
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
                {track && canUpdate && (
                  <AppTooltip content={locale === "fr" ? "Modifier" : "Edit"}>
                    <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground" onClick={openEditDialog}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </AppTooltip>
                )}
                {track && canToggleStatus && (
                  <AppTooltip content={track.active ? (locale === "fr" ? "Désactiver" : "Deactivate") : (locale === "fr" ? "Activer" : "Activate")}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
                      onClick={() => track.active ? deactivateMutation.mutate() : activateMutation.mutate()}
                      disabled={activateMutation.isPending || deactivateMutation.isPending}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </AppTooltip>
                )}
                {track && canDelete && (
                  <AppTooltip content={locale === "fr" ? "Supprimer" : "Delete"}>
                    <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteDialogOpen(true)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AppTooltip>
                )}
                {track && (
                  <Badge variant={track.active ? "success" : "outline"}>
                    {track.active ? (locale === "fr" ? "Actif" : "Active") : (locale === "fr" ? "Inactif" : "Inactive")}
                  </Badge>
                )}
              </div>
            </CardHeader>
          </Card>

          {trackQuery.isLoading ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-muted-foreground">{locale === "fr" ? "Chargement..." : "Loading..."}</CardContent>
            </Card>
          ) : trackQuery.isError ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-destructive">{locale === "fr" ? "Impossible de charger la fiche." : "Could not load the record."}</CardContent>
            </Card>
          ) : !track ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-muted-foreground">{locale === "fr" ? "Filière introuvable." : "Program track not found."}</CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="general">
              <TabsList>
                <TabsTrigger value="general">{locale === "fr" ? "Informations générales" : "General information"}</TabsTrigger>
                <TabsTrigger value="audit">{locale === "fr" ? "Informations d'audit" : "Audit information"}</TabsTrigger>
                <TabsTrigger value="levels" badge={linkedLevels.length}>{locale === "fr" ? "Niveaux associés" : "Linked levels"}</TabsTrigger>
              </TabsList>

              {/* Informations générales */}
              <TabsContent value="general">
                <Card className="border-border/60 bg-card/70">
                  <CardHeader>
                    <CardTitle className="text-base">{locale === "fr" ? "Informations générales" : "General information"}</CardTitle>
                    <CardDescription>{locale === "fr" ? "Données principales de la filière" : "Core program track data"}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">Code</p>
                      <p className="mt-1 font-mono font-medium">{track.code}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">{locale === "fr" ? "Intitulé" : "Name"}</p>
                      <p className="mt-1 font-medium">{track.name}</p>
                    </div>
                    {track.description && (
                      <div className="rounded-lg border border-border/70 bg-background/70 p-3 sm:col-span-2">
                        <p className="text-xs text-muted-foreground">Description</p>
                        <p className="mt-1">{track.description}</p>
                      </div>
                    )}
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">{locale === "fr" ? "Statut" : "Status"}</p>
                      <div className="mt-1">
                        <Badge variant={track.active ? "success" : "outline"}>
                          {track.active ? (locale === "fr" ? "Actif" : "Active") : (locale === "fr" ? "Inactif" : "Inactive")}
                        </Badge>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">{locale === "fr" ? "Niveaux associés" : "Linked levels"}</p>
                      <p className="mt-1 font-semibold">{linkedLevels.length}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Informations d'audit */}
              <TabsContent value="audit">
                <Card className="border-border/60 bg-card/70">
                  <CardHeader>
                    <CardTitle className="text-base">{locale === "fr" ? "Informations d'audit" : "Audit information"}</CardTitle>
                    <CardDescription>{locale === "fr" ? "Traçabilité des modifications" : "Change tracking"}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">{locale === "fr" ? "Créé le" : "Created at"}</p>
                      <p className="mt-1 text-xs font-medium">{formatDate(track.createdAt, locale)}</p>
                      {track.createdByLabel && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{locale === "fr" ? "Par" : "By"}: {track.createdByLabel}</p>
                      )}
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">{locale === "fr" ? "Modifié le" : "Updated at"}</p>
                      <p className="mt-1 text-xs font-medium">{track.updatedAt ? formatDate(track.updatedAt, locale) : "—"}</p>
                      {track.updatedByLabel && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{locale === "fr" ? "Par" : "By"}: {track.updatedByLabel}</p>
                      )}
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">ID</p>
                      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{track.id}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">{locale === "fr" ? "Etablissement (ID)" : "Establishment (ID)"}</p>
                      <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{track.establishmentId}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Niveaux associés */}
              <TabsContent value="levels">
                <Card className="border-border/60 bg-card/70">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Link2 className="h-4 w-4" />
                        {locale === "fr" ? "Niveaux académiques associés" : "Linked academic levels"}
                      </CardTitle>
                      <CardDescription>
                        {locale === "fr" ? "Niveaux pour lesquels cette filière est proposée." : "Levels for which this program track is offered."}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Linked levels list */}
                    {trackLevelsQuery.isLoading || academicLevelsQuery.isLoading ? (
                      <p className="py-4 text-sm text-muted-foreground">{locale === "fr" ? "Chargement..." : "Loading..."}</p>
                    ) : trackLevelsQuery.isError || academicLevelsQuery.isError ? (
                      <p className="py-4 text-sm text-destructive">{locale === "fr" ? "Erreur lors du chargement." : "Error loading data."}</p>
                    ) : linkedLevels.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/70 py-10 text-center">
                        <GraduationCap className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">
                          {locale === "fr" ? "Aucun niveau académique associé." : "No academic level linked."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {linkedLevels.map((ptl) => {
                          const level = academicLevelsMap.get(ptl.academicLevelId);
                          return (
                            <div key={ptl.id} className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/70 p-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <p className="truncate text-sm font-medium">
                                    {level ? `${level.code} — ${level.label}` : ptl.academicLevelId}
                                  </p>
                                </div>
                                <Badge variant={ptl.openForApplication ? "success" : "outline"} className="mt-1.5 text-xs">
                                  {ptl.openForApplication ? (locale === "fr" ? "Ouvert aux candidatures" : "Open for application") : (locale === "fr" ? "Fermé" : "Closed")}
                                </Badge>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                {canToggleLevel && (
                                  <AppTooltip content={ptl.openForApplication ? (locale === "fr" ? "Fermer" : "Close") : (locale === "fr" ? "Ouvrir" : "Open")}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-foreground"
                                      onClick={() => linkToggleMutation.mutate({ id: ptl.id, open: ptl.openForApplication })}
                                      disabled={linkToggleMutation.isPending}
                                    >
                                      <Power className="h-3.5 w-3.5" />
                                    </Button>
                                  </AppTooltip>
                                )}
                                {canUnlinkLevel && (
                                  <AppTooltip content={locale === "fr" ? "Délier" : "Unlink"}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 rounded-lg p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => linkDeleteMutation.mutate(ptl.id)}
                                      disabled={linkDeleteMutation.isPending}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </AppTooltip>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Attach new level */}
                    {canLinkLevel && (
                      <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3">
                        <p className="text-sm font-medium">{locale === "fr" ? "Lier un nouveau niveau" : "Link a new level"}</p>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="flex-1">
                            <SearchableSelect
                              options={availableLevels.map((level) => ({
                                value: level.id,
                                label: `${level.code} — ${level.label}`,
                                keywords: [level.code, level.label],
                              }))}
                              value={selectedLevelId}
                              onValueChange={setSelectedLevelId}
                              placeholder={locale === "fr" ? "Sélectionner un niveau académique" : "Select an academic level"}
                              searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                            />
                          </div>
                          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2.5">
                            <input
                              type="checkbox"
                              id="ptl-open-chk"
                              checked={openForApplication}
                              onChange={(e) => setOpenForApplication(e.target.checked)}
                              className="h-4 w-4 rounded border-border accent-primary"
                            />
                            <label htmlFor="ptl-open-chk" className="cursor-pointer whitespace-nowrap text-sm font-medium">
                              {locale === "fr" ? "Ouvert aux candidatures" : "Open for application"}
                            </label>
                          </div>
                          <Button
                            size="sm"
                            className="shrink-0"
                            onClick={() => linkCreateMutation.mutate()}
                            disabled={!selectedLevelId || linkCreateMutation.isPending}
                          >
                            <Plus className="mr-1.5 h-4 w-4" />
                            {linkCreateMutation.isPending ? (locale === "fr" ? "Liaison..." : "Linking...") : (locale === "fr" ? "Lier" : "Link")}
                          </Button>
                        </div>
                        {availableLevels.length === 0 && !academicLevelsQuery.isLoading && (
                          <p className="text-xs text-muted-foreground">
                            {locale === "fr" ? "Tous les niveaux académiques sont déjà liés." : "All academic levels are already linked."}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{locale === "fr" ? "Modifier la filière" : "Edit program track"}</DialogTitle>
            <DialogDescription>
              {track && <span className="font-mono font-medium text-foreground">{track.code}</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Intitulé" : "Name"} *</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
                placeholder={locale === "fr" ? "Intitulé de la filière..." : "Program track name..."}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm((s) => ({ ...s, description: e.target.value }))}
                placeholder={locale === "fr" ? "Description optionnelle..." : "Optional description..."}
              />
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={updateMutation.isPending}>
              {locale === "fr" ? "Annuler" : "Cancel"}
            </Button>
            <Button onClick={submitEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (locale === "fr" ? "Enregistrement..." : "Saving...") : (locale === "fr" ? "Enregistrer" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteDialogOpen(false); setDeleteMode("soft"); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{locale === "fr" ? "Supprimer la filière ?" : "Delete program track?"}</DialogTitle>
            <DialogDescription>
              {track && <span className="mt-1 block font-mono font-medium text-foreground">{track.code} — {track.name}</span>}
            </DialogDescription>
          </DialogHeader>
          {canHardDelete && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeleteMode("soft")}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${deleteMode === "soft" ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-foreground/30"}`}
              >
                <p className="font-medium">{locale === "fr" ? "Archiver" : "Soft delete"}</p>
                <p className="mt-0.5 text-xs opacity-70">{locale === "fr" ? "Récupérable" : "Recoverable"}</p>
              </button>
              <button
                type="button"
                onClick={() => setDeleteMode("hard")}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${deleteMode === "hard" ? "border-destructive bg-destructive/10 text-destructive" : "border-border bg-background text-muted-foreground hover:border-foreground/30"}`}
              >
                <p className="font-medium">{locale === "fr" ? "Supprimer" : "Hard delete"}</p>
                <p className="mt-0.5 text-xs opacity-70">{locale === "fr" ? "Définitif" : "Permanent"}</p>
              </button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {deleteMode === "hard"
              ? (locale === "fr" ? "Suppression permanente et irréversible de la base de données." : "Permanently removes the record from the database.")
              : (locale === "fr" ? "La filière sera archivée et masquée (suppression logique)." : "The track will be archived and hidden (soft delete).")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteMode("soft"); }} disabled={deleteMutation.isPending || hardDeleteMutation.isPending}>
              {locale === "fr" ? "Annuler" : "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteMode === "hard") hardDeleteMutation.mutate();
                else deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending || hardDeleteMutation.isPending}
            >
              {(deleteMutation.isPending || hardDeleteMutation.isPending)
                ? (locale === "fr" ? "Suppression..." : "Deleting...")
                : (locale === "fr" ? "Supprimer" : "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
