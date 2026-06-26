"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Filter,
  Pencil,
  Plus,
  Power,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { buildPermissionSet, hasPermission } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast-provider";
import { AppTooltip } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type {
  CreateProgramTrackLevelRequest,
  ProgramTrackLevelResponse,
  UpdateProgramTrackLevelRequest,
} from "@/lib/types";

type FormState = {
  programTrackId: string;
  academicLevelId: string;
};

const EMPTY_FORM: FormState = { programTrackId: "", academicLevelId: "" };

export function ProgramTrackLevelsSection({
  accessToken,
  locale,
  establishmentId,
}: {
  accessToken: string;
  locale: "fr" | "en";
  establishmentId: string;
}) {
  const router = useRouter();

  const [showFilters, setShowFilters] = useState(false);
  const [programTrackFilter, setProgramTrackFilter] = useState("ALL");
  const [academicLevelFilter, setAcademicLevelFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [trackSearch, setTrackSearch] = useState("");
  const [levelSearch, setLevelSearch] = useState("");
  const [focusedItem, setFocusedItem] = useState<ProgramTrackLevelResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProgramTrackLevelResponse | null>(null);

  const { toast } = useToast();

  const currentUserQuery = useQuery({
    queryKey: ["program-track-levels", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });

  const effectiveEstId = establishmentId;

  const programTracksQuery = useQuery({
    queryKey: ["config", "program-tracks", accessToken, effectiveEstId],
    queryFn: () => api.configuration.programTracks.list(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId),
  });

  const academicLevelsQuery = useQuery({
    queryKey: ["config", "academic-levels", accessToken, effectiveEstId],
    queryFn: () => api.configuration.academicLevels.list(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId),
  });

  const query = useQuery({
    queryKey: ["config", "program-track-levels", accessToken, effectiveEstId],
    queryFn: () => api.configuration.programTrackLevels.list(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId),
  });

  const items = useMemo(() => query.data ?? [], [query.data]);
  const programTracks = useMemo(() => programTracksQuery.data ?? [], [programTracksQuery.data]);
  const academicLevels = useMemo(() => academicLevelsQuery.data ?? [], [academicLevelsQuery.data]);

  const programTracksMap = useMemo(
    () => new Map(programTracks.map((p) => [p.id, p])),
    [programTracks],
  );
  const academicLevelsMap = useMemo(
    () => new Map(academicLevels.map((a) => [a.id, a])),
    [academicLevels],
  );

  const programTrackOptions = useMemo(
    () =>
      programTracks.map((p) => ({
        value: p.id,
        label: p.name,
        description: p.code,
        keywords: [p.code, p.name],
      })),
    [programTracks],
  );

  const academicLevelOptions = useMemo(
    () =>
      academicLevels.map((a) => ({
        value: a.id,
        label: a.label,
        description: a.code,
        keywords: [a.code, a.label],
      })),
    [academicLevels],
  );

  const filteredProgramTracks = useMemo(() => {
    const q = trackSearch.trim().toLowerCase();
    if (!q) return programTracks;
    return programTracks.filter((p) => p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
  }, [programTracks, trackSearch]);

  const filteredAcademicLevels = useMemo(() => {
    const q = levelSearch.trim().toLowerCase();
    if (!q) return academicLevels;
    return academicLevels.filter((a) => a.code.toLowerCase().includes(q) || a.label.toLowerCase().includes(q));
  }, [academicLevels, levelSearch]);

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);
  const canCreate = hasPermission(permissionSet, "program_track_levels:create");
  const canUpdate = hasPermission(permissionSet, "program_track_levels:update");
  const canDelete = hasPermission(permissionSet, "program_track_levels:delete");
  const canActivate = hasPermission(permissionSet, "program_track_levels:activate");
  const canDeactivate = hasPermission(permissionSet, "program_track_levels:deactivate");
  const canToggleStatus = canActivate || canDeactivate;

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesTrack = programTrackFilter === "ALL" || item.programTrackId === programTrackFilter;
      const matchesLevel = academicLevelFilter === "ALL" || item.academicLevelId === academicLevelFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "OPEN" ? item.openForApplication : !item.openForApplication);
      return matchesTrack && matchesLevel && matchesStatus;
    });
  }, [items, programTrackFilter, academicLevelFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(() => filtered.slice(page * pageSize, (page + 1) * pageSize), [filtered, page, pageSize]);

  useEffect(() => {
    const maxPage = Math.max(totalPages - 1, 0);
    if (page > maxPage) setPage(maxPage);
  }, [page, totalPages]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [effectiveEstId, page]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateProgramTrackLevelRequest) => api.configuration.programTrackLevels.create(accessToken, payload),
    onSuccess: async () => { await query.refetch(); setDialogOpen(false); setFormError(null); },
    onError: (err) => setFormError((err as Error).message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProgramTrackLevelRequest }) =>
      api.configuration.programTrackLevels.update(accessToken, id, effectiveEstId, payload),
    onSuccess: async () => { await query.refetch(); setDialogOpen(false); setFormError(null); },
    onError: (err) => setFormError((err as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.configuration.programTrackLevels.delete(accessToken, id, effectiveEstId),
    onSuccess: async () => { await query.refetch(); setDeleteTarget(null); },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.configuration.programTrackLevels.activate(accessToken, id, effectiveEstId),
    onSuccess: () => query.refetch(),
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.configuration.programTrackLevels.deactivate(accessToken, id, effectiveEstId),
    onSuccess: () => query.refetch(),
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const openCreateDialog = () => {
    setFormState(EMPTY_FORM);
    setFormError(null);
    setTrackSearch("");
    setLevelSearch("");
    setDialogMode("create");
    setDialogOpen(true);
  };

  const openEditDialog = (item: ProgramTrackLevelResponse) => {
    setFocusedItem(item);
    setFormState({ programTrackId: item.programTrackId, academicLevelId: item.academicLevelId });
    setFormError(null);
    setLevelSearch("");
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const submitDialog = () => {
    if (!formState.programTrackId || !formState.academicLevelId) {
      setFormError(locale === "fr" ? "La filière et le niveau académique sont obligatoires." : "Program track and academic level are required.");
      return;
    }
    if (dialogMode === "create") {
      createMutation.mutate({
        establishmentId: effectiveEstId,
        programTrackId: formState.programTrackId,
        academicLevelId: formState.academicLevelId,
      } as CreateProgramTrackLevelRequest);
    } else if (focusedItem) {
      updateMutation.mutate({ id: focusedItem.id, payload: { academicLevelId: formState.academicLevelId } });
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;
  const allOnPageSelected = pageItems.length > 0 && pageItems.every((item) => selectedIds.has(item.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageItems.forEach((item) => next.delete(item.id));
      else pageItems.forEach((item) => next.add(item.id));
      return next;
    });
  };

  const trackLabel = (id: string) => {
    const track = programTracksMap.get(id);
    return track ? `${track.code} — ${track.name}` : "—";
  };

  const levelLabel = (id: string) => {
    const level = academicLevelsMap.get(id);
    return level ? `${level.code} — ${level.label}` : "—";
  };

  const t = {
    title: locale === "fr" ? "Niveaux par filière" : "Program track levels",
    subtitle: locale === "fr" ? "Associez les filières aux niveaux académiques ouverts aux candidatures." : "Link program tracks to academic levels open for applications.",
    add: locale === "fr" ? "Ajouter" : "Add",
    refresh: locale === "fr" ? "Actualiser" : "Refresh",
    filtersTooltip: locale === "fr" ? "Afficher/masquer les filtres" : "Show/hide filters",
    all: locale === "fr" ? "Tous" : "All",
    open: locale === "fr" ? "Ouvert" : "Open",
    closed: locale === "fr" ? "Fermé" : "Closed",
    colProgramTrack: locale === "fr" ? "Filière" : "Program track",
    colAcademicLevel: locale === "fr" ? "Niveau académique" : "Academic level",
    colStatus: locale === "fr" ? "Statut" : "Status",
    colCreatedBy: locale === "fr" ? "Créé par" : "Created by",
    colUpdatedBy: locale === "fr" ? "Modifié par" : "Updated by",
    colActions: locale === "fr" ? "Actions" : "Actions",
    noData: locale === "fr" ? "Aucune association filière-niveau." : "No program track levels.",
    loadError: locale === "fr" ? "Erreur lors du chargement." : "Error loading data.",
    createTitle: locale === "fr" ? "Nouvelle association" : "New association",
    editTitle: locale === "fr" ? "Modifier l'association" : "Edit association",
    fieldProgramTrack: locale === "fr" ? "Filière" : "Program track",
    fieldAcademicLevel: locale === "fr" ? "Niveau académique" : "Academic level",
    cancel: locale === "fr" ? "Annuler" : "Cancel",
    save: locale === "fr" ? "Enregistrer" : "Save",
    saving: locale === "fr" ? "Enregistrement..." : "Saving...",
    deleteTitle: locale === "fr" ? "Supprimer cette association ?" : "Delete this association?",
    deleteDesc: locale === "fr" ? "L'association sera archivée et masquée (suppression logique)." : "The association will be archived and hidden (soft delete).",
    deleteConfirm: locale === "fr" ? "Supprimer" : "Delete",
    deleting: locale === "fr" ? "Suppression..." : "Deleting...",
    tooltipView: locale === "fr" ? "Voir le détail" : "View detail",
    tooltipEdit: locale === "fr" ? "Modifier" : "Edit",
    tooltipDelete: locale === "fr" ? "Supprimer" : "Delete",
    tooltipActivate: locale === "fr" ? "Ouvrir aux candidatures" : "Open for applications",
    tooltipDeactivate: locale === "fr" ? "Fermer aux candidatures" : "Close for applications",
    searchPlaceholder: locale === "fr" ? "Rechercher..." : "Search...",
    rowsPerPage: locale === "fr" ? "Lignes par page" : "Rows per page",
    deselect: locale === "fr" ? "Désélectionner" : "Deselect all",
    deleteSelected: locale === "fr" ? "Supprimer la sélection" : "Delete selected",
    selected: locale === "fr" ? "sélectionné(s)" : "selected",
    count: (n: number) => locale === "fr" ? `${n} association(s)` : `${n} association(s)`,
    pageLabel: (current: number, total: number) => `Page ${current} / ${total}`,
  };

  return (
    <div className="grid gap-6">
      <Card className="border-border/60 bg-card/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle>{t.title}</CardTitle>
              <CardDescription>{t.subtitle}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 p-1.5">
              <AppTooltip content={t.filtersTooltip}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 w-9 rounded-xl text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground ${showFilters ? "bg-background/80 text-foreground" : ""}`}
                  onClick={() => setShowFilters((c) => !c)}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </AppTooltip>
              <AppTooltip content={t.refresh}>
                <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground" onClick={() => void query.refetch()} disabled={query.isFetching}>
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </AppTooltip>
              {canCreate && (
                <Button size="sm" className="h-9 rounded-xl px-3" onClick={openCreateDialog} disabled={!effectiveEstId || programTrackOptions.length === 0 || academicLevelOptions.length === 0}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  {t.add}
                </Button>
              )}
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
              <p className="mt-2 text-2xl font-semibold">{items.length}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.open}</p>
              <p className="mt-2 text-2xl font-semibold">{items.filter((x) => x.openForApplication).length}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.closed}</p>
              <p className="mt-2 text-2xl font-semibold">{items.filter((x) => !x.openForApplication).length}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4">
          {showFilters && (
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t.colProgramTrack}</label>
                <SearchableSelect
                  options={[{ value: "ALL", label: t.all, keywords: ["all", "tous"] }, ...programTrackOptions]}
                  value={programTrackFilter}
                  onValueChange={(v) => { setProgramTrackFilter(v); setPage(0); }}
                  placeholder={t.all}
                  searchPlaceholder={t.searchPlaceholder}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t.colAcademicLevel}</label>
                <SearchableSelect
                  options={[{ value: "ALL", label: t.all, keywords: ["all", "tous"] }, ...academicLevelOptions]}
                  value={academicLevelFilter}
                  onValueChange={(v) => { setAcademicLevelFilter(v); setPage(0); }}
                  placeholder={t.all}
                  searchPlaceholder={t.searchPlaceholder}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t.colStatus}</label>
                <SearchableSelect
                  options={[
                    { value: "ALL", label: t.all, keywords: ["all", "tous"] },
                    { value: "OPEN", label: t.open, keywords: ["open", "ouvert"] },
                    { value: "CLOSED", label: t.closed, keywords: ["closed", "ferme"] },
                  ]}
                  value={statusFilter}
                  onValueChange={(v) => { setStatusFilter(v as "ALL" | "OPEN" | "CLOSED"); setPage(0); }}
                  placeholder={t.all}
                  searchPlaceholder={t.searchPlaceholder}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t.rowsPerPage}</label>
                <SearchableSelect
                  options={[
                    { value: "5", label: "5", keywords: ["5"] },
                    { value: "10", label: "10", keywords: ["10"] },
                    { value: "20", label: "20", keywords: ["20"] },
                  ]}
                  value={String(pageSize)}
                  onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}
                  placeholder="10"
                  searchPlaceholder={t.searchPlaceholder}
                />
              </div>
            </div>
          )}

          {someSelected && (
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 px-4 py-2.5">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{selectedIds.size}</span> {t.selected}
              </p>
              <div className="flex items-center gap-2">
                {canDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 rounded-lg px-3 text-xs"
                    onClick={() => {
                      const first = pageItems.find((item) => selectedIds.has(item.id));
                      if (first) setDeleteTarget(first);
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {t.deleteSelected}
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-8 rounded-lg px-3 text-xs" onClick={() => setSelectedIds(new Set())}>
                  {t.deselect}
                </Button>
              </div>
            </div>
          )}

          {/* Desktop table */}
          <div className="hidden overflow-auto rounded-xl border border-border/80 bg-background/70 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAllOnPage} className="h-4 w-4 rounded border-border accent-primary" aria-label="select all" />
                  </th>
                  <th className="px-3 py-3">{t.colProgramTrack}</th>
                  <th className="px-3 py-3">{t.colAcademicLevel}</th>
                  <th className="hidden px-3 py-3 lg:table-cell">{t.colCreatedBy}</th>
                  <th className="hidden px-3 py-3 xl:table-cell">{t.colUpdatedBy}</th>
                  <th className="px-3 py-3">{t.colStatus}</th>
                  <th className="px-3 py-3">{t.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {query.isLoading ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">{locale === "fr" ? "Chargement…" : "Loading…"}</td></tr>
                ) : query.isError ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-destructive">{t.loadError}</td></tr>
                ) : pageItems.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">{t.noData}</td></tr>
                ) : pageItems.map((item) => (
                  <tr key={item.id} className={`border-t border-border/50 transition-colors hover:bg-muted/30 ${selectedIds.has(item.id) ? "bg-primary/5" : ""}`}>
                    <td className="px-3 py-2.5">
                      <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelection(item.id)} className="h-4 w-4 rounded border-border accent-primary" />
                    </td>
                    <td className="px-3 py-2.5 font-medium">{trackLabel(item.programTrackId)}</td>
                    <td className="px-3 py-2.5">{levelLabel(item.academicLevelId)}</td>
                    <td className="hidden px-3 py-2.5 lg:table-cell">
                      <span className="text-xs text-muted-foreground">{item.createdByLabel ?? "—"}</span>
                    </td>
                    <td className="hidden px-3 py-2.5 xl:table-cell">
                      <span className="text-xs text-muted-foreground">{item.updatedByLabel ?? "—"}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={item.openForApplication ? "success" : "outline"}>
                        {item.openForApplication ? t.open : t.closed}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <DropdownMenu
                        triggerTooltip={locale === "fr" ? "Actions" : "Actions"}
                        items={[
                          {
                            label: t.tooltipView,
                            icon: ArrowRight,
                            onClick: () => router.push(`/dashboard/program-track-levels/${item.id}?establishmentId=${establishmentId}`),
                          },
                          ...(canUpdate ? [{
                            label: t.tooltipEdit,
                            icon: Pencil,
                            onClick: () => openEditDialog(item),
                          }] : []),
                          ...(canToggleStatus ? [{
                            label: item.openForApplication ? t.tooltipDeactivate : t.tooltipActivate,
                            icon: Power,
                            onClick: () => item.openForApplication ? deactivateMutation.mutate(item.id) : activateMutation.mutate(item.id),
                            disabled: activateMutation.isPending || deactivateMutation.isPending,
                          }] : []),
                          ...(canDelete ? [{
                            label: t.tooltipDelete,
                            icon: Trash2,
                            onClick: () => setDeleteTarget(item),
                            variant: "destructive" as const,
                          }] : []),
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {query.isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{locale === "fr" ? "Chargement…" : "Loading…"}</p>
            ) : query.isError ? (
              <p className="py-8 text-center text-sm text-destructive">{t.loadError}</p>
            ) : pageItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t.noData}</p>
            ) : pageItems.map((item) => (
              <div key={item.id} className={`rounded-xl border border-border/70 bg-background/70 p-4 ${selectedIds.has(item.id) ? "border-primary/40 bg-primary/5" : ""}`}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelection(item.id)} className="mt-0.5 h-4 w-4 rounded border-border accent-primary" />
                    <div>
                      <p className="font-medium">{trackLabel(item.programTrackId)}</p>
                      <p className="text-xs text-muted-foreground">{levelLabel(item.academicLevelId)}</p>
                    </div>
                  </div>
                  <Badge variant={item.openForApplication ? "success" : "outline"} className="shrink-0">
                    {item.openForApplication ? t.open : t.closed}
                  </Badge>
                </div>
                <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {item.createdByLabel && <span>{locale === "fr" ? "Créé par" : "By"}: {item.createdByLabel}</span>}
                  {item.updatedByLabel && <span>{locale === "fr" ? "Modifié par" : "Updated by"}: {item.updatedByLabel}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="h-8 rounded-lg px-2 text-xs" onClick={() => router.push(`/dashboard/program-track-levels/${item.id}?establishmentId=${establishmentId}`)}>
                    <ArrowRight className="mr-1 h-3 w-3" />{t.tooltipView}
                  </Button>
                  {canUpdate && (
                    <Button size="sm" variant="outline" className="h-8 rounded-lg px-2 text-xs" onClick={() => openEditDialog(item)}>
                      <Pencil className="mr-1 h-3 w-3" />{t.tooltipEdit}
                    </Button>
                  )}
                  {canToggleStatus && (
                    <Button size="sm" variant="outline" className="h-8 rounded-lg px-2 text-xs" onClick={() => item.openForApplication ? deactivateMutation.mutate(item.id) : activateMutation.mutate(item.id)}>
                      <Power className="mr-1 h-3 w-3" />{item.openForApplication ? t.tooltipDeactivate : t.tooltipActivate}
                    </Button>
                  )}
                  {canDelete && (
                    <Button size="sm" variant="destructive" className="h-8 rounded-lg px-2 text-xs" onClick={() => setDeleteTarget(item)}>
                      <Trash2 className="mr-1 h-3 w-3" />{t.tooltipDelete}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{t.count(filtered.length)}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{t.pageLabel(page + 1, totalPages)}</p>
              <Button variant="outline" size="sm" onClick={() => setPage(0)} disabled={page === 0}>«</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>‹</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>›</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>»</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={dialogMode === "create" ? "sm:max-w-2xl" : "max-w-md"}>
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? t.createTitle : t.editTitle}</DialogTitle>
            {dialogMode === "edit" && (
              <DialogDescription>
                {locale === "fr" ? "Modifiez le niveau académique associé à cette filière." : "Update the academic level linked to this program track."}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className={dialogMode === "create" ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
            {dialogMode === "edit" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.fieldProgramTrack} *</label>
                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                  {trackLabel(formState.programTrackId)}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold">{t.fieldProgramTrack} *</p>
                <input
                  type="text"
                  value={trackSearch}
                  onChange={(e) => setTrackSearch(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full rounded-lg border border-border/60 bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
                <div className="min-h-40 max-h-64 overflow-y-auto rounded-xl border border-border/60 bg-muted/20">
                  {filteredProgramTracks.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                      {locale === "fr" ? "Aucun résultat." : "No results."}
                    </p>
                  ) : (
                    <ul className="divide-y divide-border/50">
                      {filteredProgramTracks.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => setFormState((s) => ({ ...s, programTrackId: p.id }))}
                            className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 ${formState.programTrackId === p.id ? "bg-primary/10" : ""}`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{p.name}</p>
                              <p className="font-mono text-xs text-muted-foreground">{p.code}</p>
                            </div>
                            {formState.programTrackId === p.id && (
                              <Badge variant="outline" className="shrink-0 text-[10px]">
                                {locale === "fr" ? "Sélectionné" : "Selected"}
                              </Badge>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm font-semibold">{t.fieldAcademicLevel} *</p>
              <input
                type="text"
                value={levelSearch}
                onChange={(e) => setLevelSearch(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="min-h-40 max-h-64 overflow-y-auto rounded-xl border border-border/60 bg-muted/20">
                {filteredAcademicLevels.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                    {locale === "fr" ? "Aucun résultat." : "No results."}
                  </p>
                ) : (
                  <ul className="divide-y divide-border/50">
                    {filteredAcademicLevels.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => setFormState((s) => ({ ...s, academicLevelId: a.id }))}
                          className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 ${formState.academicLevelId === a.id ? "bg-primary/10" : ""}`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{a.label}</p>
                            <p className="font-mono text-xs text-muted-foreground">{a.code}</p>
                          </div>
                          {formState.academicLevelId === a.id && (
                            <Badge variant="outline" className="shrink-0 text-[10px]">
                              {locale === "fr" ? "Sélectionné" : "Selected"}
                            </Badge>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {formError && <p className="text-sm text-destructive sm:col-span-2">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isMutating}>{t.cancel}</Button>
            <Button onClick={submitDialog} disabled={isMutating}>{isMutating ? t.saving : t.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.deleteTitle}</DialogTitle>
            <DialogDescription>
              {deleteTarget && (
                <span className="mt-1 block font-medium text-foreground">
                  {trackLabel(deleteTarget.programTrackId)} — {levelLabel(deleteTarget.academicLevelId)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t.deleteDesc}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>{t.cancel}</Button>
            <Button
              variant="destructive"
              onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t.deleting : t.deleteConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
