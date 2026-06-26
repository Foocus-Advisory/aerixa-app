"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Eye,
  Filter,
  GitBranch,
  Pencil,
  Plus,
  Power,
  RefreshCcw,
  Table2,
  Trash2,
  Workflow,
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
import type { CreateFunnelStageTransitionRequest, FunnelStageTransitionResponse } from "@/lib/types";

type TransitionFormState = {
  fromStageId: string;
  toStageId: string;
};

const EMPTY_FORM: TransitionFormState = { fromStageId: "", toStageId: "" };

export function FunnelStageTransitionsSection({
  accessToken,
  locale,
  establishmentId,
}: {
  accessToken: string;
  locale: "fr" | "en";
  establishmentId: string;
}) {
  const router = useRouter();

  const [viewMode, setViewMode] = useState<"WORKFLOW" | "TABLE">("WORKFLOW");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [fromStageFilter, setFromStageFilter] = useState<string>("ALL");
  const [toStageFilter, setToStageFilter] = useState<string>("ALL");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formState, setFormState] = useState<TransitionFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [focusedItem, setFocusedItem] = useState<FunnelStageTransitionResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FunnelStageTransitionResponse | null>(null);
  const [deleteMode, setDeleteMode] = useState<"soft" | "hard">("soft");

  const { toast } = useToast();

  const effectiveEstId = establishmentId;

  const currentUserQuery = useQuery({
    queryKey: ["funnel-stage-transitions", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });

  const stagesQuery = useQuery({
    queryKey: ["config", "funnel-stages", accessToken, effectiveEstId],
    queryFn: () => api.configuration.funnelStages.list(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId),
  });

  const stages = useMemo(() => stagesQuery.data ?? [], [stagesQuery.data]);

  const stageOptions = useMemo(
    () =>
      stages.map((stage) => ({
        value: stage.id,
        label: `${stage.code} — ${stage.name}`,
        keywords: [stage.code, stage.name],
      })),
    [stages],
  );

  const stageById = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    stages.forEach((stage) => map.set(stage.id, { code: stage.code, name: stage.name }));
    return map;
  }, [stages]);

  const stageLabel = (stageId: string) => {
    const stage = stageById.get(stageId);
    return stage ? `${stage.name}` : stageId;
  };

  const stageCode = (stageId: string) => stageById.get(stageId)?.code ?? "—";

  const query = useQuery({
    queryKey: ["config", "funnel-stage-transitions", accessToken, effectiveEstId],
    queryFn: () => api.configuration.funnelStageTransitions.list(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId),
  });

  const items = useMemo(() => query.data ?? [], [query.data]);

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);
  const canCreate = hasPermission(permissionSet, "funnel_stage_transitions:create");
  const canUpdate = hasPermission(permissionSet, "funnel_stage_transitions:update");
  const canDelete = hasPermission(permissionSet, "funnel_stage_transitions:delete");
  const canHardDelete = hasPermission(permissionSet, "funnel_stage_transitions:hard_delete");
  const canToggleStatus =
    hasPermission(permissionSet, "funnel_stage_transitions:activate") ||
    hasPermission(permissionSet, "funnel_stage_transitions:deactivate");

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus = statusFilter === "ALL" || (item.active ? "ACTIVE" : "INACTIVE") === statusFilter;
      const matchesFrom = fromStageFilter === "ALL" || item.fromStageId === fromStageFilter;
      const matchesTo = toStageFilter === "ALL" || item.toStageId === toStageFilter;
      return matchesStatus && matchesFrom && matchesTo;
    });
  }, [items, statusFilter, fromStageFilter, toStageFilter]);

  const workflowGroups = useMemo(() => {
    const groups = new Map<string, FunnelStageTransitionResponse[]>();
    filtered.forEach((item) => {
      const list = groups.get(item.fromStageId) ?? [];
      list.push(item);
      groups.set(item.fromStageId, list);
    });
    return [...stages]
      .sort((a, b) => a.positionOrder - b.positionOrder)
      .map((stage) => ({ stage, transitions: groups.get(stage.id) ?? [] }))
      .filter((group) => group.transitions.length > 0 || groups.size === 0);
  }, [filtered, stages]);

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
    mutationFn: (payload: CreateFunnelStageTransitionRequest) => api.configuration.funnelStageTransitions.create(accessToken, payload),
    onSuccess: async () => { await query.refetch(); setDialogOpen(false); setFormError(null); },
    onError: (err) => setFormError((err as Error).message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, toStageId }: { id: string; toStageId: string }) =>
      api.configuration.funnelStageTransitions.update(accessToken, id, effectiveEstId, { toStageId }),
    onSuccess: async () => { await query.refetch(); setDialogOpen(false); setFormError(null); },
    onError: (err) => setFormError((err as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.configuration.funnelStageTransitions.delete(accessToken, id, effectiveEstId),
    onSuccess: async () => { await query.refetch(); setDeleteTarget(null); setDeleteMode("soft"); },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => api.configuration.funnelStageTransitions.hardDelete(accessToken, id, effectiveEstId),
    onSuccess: async () => { await query.refetch(); setDeleteTarget(null); setDeleteMode("soft"); },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.configuration.funnelStageTransitions.activate(accessToken, id, effectiveEstId),
    onSuccess: () => query.refetch(),
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.configuration.funnelStageTransitions.deactivate(accessToken, id, effectiveEstId),
    onSuccess: () => query.refetch(),
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const openCreateDialog = () => {
    setFormState(EMPTY_FORM);
    setFormError(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const openEditDialog = (item: FunnelStageTransitionResponse) => {
    setFocusedItem(item);
    setFormState({ fromStageId: item.fromStageId, toStageId: item.toStageId });
    setFormError(null);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const submitDialog = () => {
    if (!formState.fromStageId || !formState.toStageId) {
      setFormError(locale === "fr" ? "Les étapes de départ et d'arrivée sont obligatoires." : "Source and target stages are required.");
      return;
    }
    if (formState.fromStageId === formState.toStageId) {
      setFormError(locale === "fr" ? "Une transition ne peut pas pointer vers la même étape." : "A transition cannot point to the same stage.");
      return;
    }
    if (dialogMode === "create") {
      createMutation.mutate({
        establishmentId: effectiveEstId,
        fromStageId: formState.fromStageId,
        toStageId: formState.toStageId,
      });
    } else {
      updateMutation.mutate({ id: focusedItem!.id, toStageId: formState.toStageId });
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

  const t = {
    title: locale === "fr" ? "Transitions du tunnel" : "Funnel stage transitions",
    subtitle: locale === "fr" ? "Gérez les transitions autorisées entre les étapes du tunnel par établissement." : "Manage allowed transitions between funnel stages per establishment.",
    add: locale === "fr" ? "Ajouter" : "Add",
    refresh: locale === "fr" ? "Actualiser" : "Refresh",
    filtersTooltip: locale === "fr" ? "Afficher/masquer les filtres" : "Show/hide filters",
    all: locale === "fr" ? "Tous" : "All",
    active: locale === "fr" ? "Actif" : "Active",
    inactive: locale === "fr" ? "Inactif" : "Inactive",
    colFrom: locale === "fr" ? "Étape de départ" : "From stage",
    colTo: locale === "fr" ? "Étape d'arrivée" : "To stage",
    colStatus: locale === "fr" ? "Statut" : "Status",
    colCreatedBy: locale === "fr" ? "Créé par" : "Created by",
    colUpdatedBy: locale === "fr" ? "Modifié par" : "Updated by",
    colActions: locale === "fr" ? "Actions" : "Actions",
    noData: locale === "fr" ? "Aucune transition de tunnel." : "No funnel stage transitions.",
    noStages: locale === "fr" ? "Créez d'abord des étapes de tunnel pour cet établissement." : "Create funnel stages for this establishment first.",
    loadError: locale === "fr" ? "Erreur lors du chargement." : "Error loading data.",
    createTitle: locale === "fr" ? "Nouvelle transition de tunnel" : "New funnel stage transition",
    editTitle: locale === "fr" ? "Modifier la transition de tunnel" : "Edit funnel stage transition",
    fieldFrom: locale === "fr" ? "Étape de départ" : "From stage",
    fieldTo: locale === "fr" ? "Étape d'arrivée" : "To stage",
    cancel: locale === "fr" ? "Annuler" : "Cancel",
    save: locale === "fr" ? "Enregistrer" : "Save",
    saving: locale === "fr" ? "Enregistrement..." : "Saving...",
    deleteTitle: locale === "fr" ? "Supprimer la transition ?" : "Delete transition?",
    deleteConfirm: locale === "fr" ? "Supprimer" : "Delete",
    deleting: locale === "fr" ? "Suppression..." : "Deleting...",
    tooltipView: locale === "fr" ? "Consulter" : "View",
    tooltipEdit: locale === "fr" ? "Modifier" : "Edit",
    tooltipDelete: locale === "fr" ? "Supprimer" : "Delete",
    tooltipActivate: locale === "fr" ? "Activer" : "Activate",
    tooltipDeactivate: locale === "fr" ? "Désactiver" : "Deactivate",
    count: (n: number) => locale === "fr" ? `${n} transition(s)` : `${n} transition(s)`,
    pageLabel: (current: number, total: number) => `Page ${current} / ${total}`,
    viewSwitch: locale === "fr" ? "Changer de vue" : "Switch view",
    viewWorkflow: locale === "fr" ? "Workflow" : "Workflow",
    viewTable: locale === "fr" ? "Tableau" : "Table",
    workflowEmpty: locale === "fr" ? "Aucune transition sortante depuis cette étape." : "No outgoing transitions from this stage.",
    workflowNoStages: locale === "fr" ? "Aucune étape de tunnel disponible pour cet établissement." : "No funnel stages available for this establishment.",
  };

  return (
    <>
      <Card className="border-border/60 bg-card/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
                <Workflow className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <CardTitle>{t.title}</CardTitle>
                <CardDescription>{t.subtitle}</CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 p-1.5">
              <DropdownMenu
                triggerTooltip={t.viewSwitch}
                triggerIcon={viewMode === "WORKFLOW" ? GitBranch : Table2}
                triggerClassName="h-9 w-9 rounded-xl text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
                items={[
                  { label: t.viewWorkflow, icon: GitBranch, onClick: () => setViewMode("WORKFLOW"), variant: viewMode === "WORKFLOW" ? "active" : "default" },
                  { label: t.viewTable, icon: Table2, onClick: () => setViewMode("TABLE"), variant: viewMode === "TABLE" ? "active" : "default" },
                ]}
              />
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
                <Button size="sm" className="h-9 rounded-xl px-3" onClick={openCreateDialog} disabled={!effectiveEstId || stages.length < 2}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  {t.add}
                </Button>
              )}
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
              <p className="mt-2 text-2xl font-semibold">{items.length}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{locale === "fr" ? "Actives" : "Active"}</p>
              <p className="mt-2 text-2xl font-semibold">{items.filter((x) => x.active).length}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{locale === "fr" ? "Inactives" : "Inactive"}</p>
              <p className="mt-2 text-2xl font-semibold">{items.filter((x) => !x.active).length}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{locale === "fr" ? "Étapes disponibles" : "Available stages"}</p>
              <p className="mt-2 text-2xl font-semibold">{stages.length}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4">
          {effectiveEstId && stages.length < 2 && !stagesQuery.isLoading && (
            <p className="text-xs text-muted-foreground">{t.noStages}</p>
          )}

          {showFilters && (
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t.colStatus}</label>
                <SearchableSelect
                  options={[
                    { value: "ALL", label: t.all, keywords: ["all", "tous"] },
                    { value: "ACTIVE", label: t.active, keywords: ["active", "actif"] },
                    { value: "INACTIVE", label: t.inactive, keywords: ["inactive", "inactif"] },
                  ]}
                  value={statusFilter}
                  onValueChange={(v) => { setStatusFilter(v as "ALL" | "ACTIVE" | "INACTIVE"); setPage(0); }}
                  placeholder={t.all}
                  searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t.colFrom}</label>
                <SearchableSelect
                  options={[
                    { value: "ALL", label: t.all, keywords: ["all", "tous"] },
                    ...stageOptions,
                  ]}
                  value={fromStageFilter}
                  onValueChange={(v) => { setFromStageFilter(v); setPage(0); }}
                  placeholder={t.all}
                  searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t.colTo}</label>
                <SearchableSelect
                  options={[
                    { value: "ALL", label: t.all, keywords: ["all", "tous"] },
                    ...stageOptions,
                  ]}
                  value={toStageFilter}
                  onValueChange={(v) => { setToStageFilter(v); setPage(0); }}
                  placeholder={t.all}
                  searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{locale === "fr" ? "Lignes par page" : "Rows per page"}</label>
                <SearchableSelect
                  options={[
                    { value: "5", label: "5", keywords: ["5"] },
                    { value: "10", label: "10", keywords: ["10"] },
                    { value: "20", label: "20", keywords: ["20"] },
                  ]}
                  value={String(pageSize)}
                  onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}
                  placeholder="10"
                  searchPlaceholder={locale === "fr" ? "Taille..." : "Size..."}
                />
              </div>
            </div>
          )}

          {viewMode === "WORKFLOW" && (
            <div className="grid gap-4">
              {stagesQuery.isLoading || query.isLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{locale === "fr" ? "Chargement…" : "Loading…"}</p>
              ) : query.isError ? (
                <p className="py-8 text-center text-sm text-destructive">{t.loadError}</p>
              ) : workflowGroups.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t.workflowNoStages}</p>
              ) : (
                workflowGroups.map(({ stage, transitions }) => (
                  <div key={stage.id} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2">
                        <Workflow className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-semibold leading-tight">{stage.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">{stage.code}</p>
                        </div>
                      </div>
                      {!stage.active && (
                        <Badge variant="outline">{t.inactive}</Badge>
                      )}
                    </div>

                    {transitions.length === 0 ? (
                      <p className="pl-2 text-sm text-muted-foreground">{t.workflowEmpty}</p>
                    ) : (
                      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        {transitions.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${item.active ? "border-border/70 bg-card/70" : "border-border/40 bg-muted/20 opacity-70"}`}
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/40">
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium leading-tight">{stageLabel(item.toStageId)}</p>
                              <p className="font-mono text-xs text-muted-foreground">{stageCode(item.toStageId)}</p>
                            </div>
                            <Badge variant={item.active ? "success" : "outline"} className="shrink-0">
                              {item.active ? t.active : t.inactive}
                            </Badge>
                            <DropdownMenu
                              triggerTooltip={locale === "fr" ? "Actions" : "Actions"}
                              items={[
                                {
                                  label: t.tooltipView,
                                  icon: Eye,
                                  onClick: () => router.push(`/dashboard/funnel-stage-transitions/${item.id}?establishmentId=${effectiveEstId}`),
                                },
                                ...(canUpdate ? [{
                                  label: t.tooltipEdit,
                                  icon: Pencil,
                                  onClick: () => openEditDialog(item),
                                }] : []),
                                ...(canToggleStatus ? [{
                                  label: item.active ? t.tooltipDeactivate : t.tooltipActivate,
                                  icon: Power,
                                  onClick: () => item.active ? deactivateMutation.mutate(item.id) : activateMutation.mutate(item.id),
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
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {viewMode === "TABLE" && someSelected && (
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 px-4 py-2.5">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{selectedIds.size}</span> {locale === "fr" ? "sélectionné(s)" : "selected"}
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
                    disabled={deleteMutation.isPending || hardDeleteMutation.isPending}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {locale === "fr" ? "Supprimer la sélection" : "Delete selected"}
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-8 rounded-lg px-3 text-xs" onClick={() => setSelectedIds(new Set())}>
                  {locale === "fr" ? "Désélectionner" : "Deselect all"}
                </Button>
              </div>
            </div>
          )}

          {viewMode === "TABLE" && (
          <>
          {/* Desktop table */}
          <div className="hidden overflow-auto rounded-xl border border-border/80 bg-background/70 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAllOnPage} className="h-4 w-4 rounded border-border accent-primary" aria-label="select all" />
                  </th>
                  <th className="px-3 py-3">{t.colFrom}</th>
                  <th className="px-3 py-3"></th>
                  <th className="px-3 py-3">{t.colTo}</th>
                  <th className="hidden px-3 py-3 lg:table-cell">{t.colCreatedBy}</th>
                  <th className="hidden px-3 py-3 xl:table-cell">{t.colUpdatedBy}</th>
                  <th className="px-3 py-3">{t.colStatus}</th>
                  <th className="px-3 py-3">{t.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {query.isLoading ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">{locale === "fr" ? "Chargement…" : "Loading…"}</td></tr>
                ) : query.isError ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-destructive">{t.loadError}</td></tr>
                ) : pageItems.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">{t.noData}</td></tr>
                ) : pageItems.map((item) => (
                  <tr key={item.id} className={`border-t border-border/50 transition-colors hover:bg-muted/30 ${selectedIds.has(item.id) ? "bg-primary/5" : ""}`}>
                    <td className="px-3 py-2.5">
                      <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelection(item.id)} className="h-4 w-4 rounded border-border accent-primary" />
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{stageLabel(item.fromStageId)}</p>
                      <p className="font-mono text-xs text-muted-foreground">{stageCode(item.fromStageId)}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{stageLabel(item.toStageId)}</p>
                      <p className="font-mono text-xs text-muted-foreground">{stageCode(item.toStageId)}</p>
                    </td>
                    <td className="hidden px-3 py-2.5 lg:table-cell">
                      <span className="text-xs text-muted-foreground">{item.createdByLabel ?? "—"}</span>
                    </td>
                    <td className="hidden px-3 py-2.5 xl:table-cell">
                      <span className="text-xs text-muted-foreground">{item.updatedByLabel ?? "—"}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={item.active ? "success" : "outline"}>
                        {item.active ? t.active : t.inactive}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <DropdownMenu
                        triggerTooltip={locale === "fr" ? "Actions" : "Actions"}
                        items={[
                          {
                            label: t.tooltipView,
                            icon: Eye,
                            onClick: () => router.push(`/dashboard/funnel-stage-transitions/${item.id}?establishmentId=${effectiveEstId}`),
                          },
                          ...(canUpdate ? [{
                            label: t.tooltipEdit,
                            icon: Pencil,
                            onClick: () => openEditDialog(item),
                          }] : []),
                          ...(canToggleStatus ? [{
                            label: item.active ? t.tooltipDeactivate : t.tooltipActivate,
                            icon: Power,
                            onClick: () => item.active ? deactivateMutation.mutate(item.id) : activateMutation.mutate(item.id),
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
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium leading-tight">{stageLabel(item.fromStageId)}</p>
                        <p className="font-mono text-xs text-muted-foreground">{stageCode(item.fromStageId)}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium leading-tight">{stageLabel(item.toStageId)}</p>
                        <p className="font-mono text-xs text-muted-foreground">{stageCode(item.toStageId)}</p>
                      </div>
                    </div>
                  </div>
                  <Badge variant={item.active ? "success" : "outline"} className="shrink-0">
                    {item.active ? t.active : t.inactive}
                  </Badge>
                </div>
                <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {item.createdByLabel && <span>{locale === "fr" ? "Créé par" : "By"}: {item.createdByLabel}</span>}
                  {item.updatedByLabel && <span>{locale === "fr" ? "Modifié par" : "Updated by"}: {item.updatedByLabel}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="h-8 rounded-lg px-2 text-xs" onClick={() => router.push(`/dashboard/funnel-stage-transitions/${item.id}?establishmentId=${effectiveEstId}`)}>
                    <Eye className="mr-1 h-3 w-3" />{t.tooltipView}
                  </Button>
                  {canUpdate && (
                    <Button size="sm" variant="outline" className="h-8 rounded-lg px-2 text-xs" onClick={() => openEditDialog(item)}>
                      <Pencil className="mr-1 h-3 w-3" />{t.tooltipEdit}
                    </Button>
                  )}
                  {canToggleStatus && (
                    <Button size="sm" variant="outline" className="h-8 rounded-lg px-2 text-xs" onClick={() => item.active ? deactivateMutation.mutate(item.id) : activateMutation.mutate(item.id)}>
                      <Power className="mr-1 h-3 w-3" />{item.active ? t.tooltipDeactivate : t.tooltipActivate}
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
          </>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? t.createTitle : t.editTitle}</DialogTitle>
            <DialogDescription>
              {locale === "fr" ? "Une transition relie une étape de départ à une étape d'arrivée distincte." : "A transition links a source stage to a distinct target stage."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.fieldFrom} *</label>
              <SearchableSelect
                options={stageOptions}
                value={formState.fromStageId}
                onValueChange={(v) => setFormState((s) => ({ ...s, fromStageId: v }))}
                placeholder={t.fieldFrom}
                searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                disabled={dialogMode === "edit"}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.fieldTo} *</label>
              <SearchableSelect
                options={stageOptions.filter((opt) => opt.value !== formState.fromStageId)}
                value={formState.toStageId}
                onValueChange={(v) => setFormState((s) => ({ ...s, toStageId: v }))}
                placeholder={t.fieldTo}
                searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isMutating}>{t.cancel}</Button>
            <Button onClick={submitDialog} disabled={isMutating}>{isMutating ? t.saving : t.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteMode("soft"); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.deleteTitle}</DialogTitle>
            <DialogDescription>
              {deleteTarget && (
                <span className="mt-1 flex items-center gap-2 font-medium text-foreground">
                  {stageLabel(deleteTarget.fromStageId)}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  {stageLabel(deleteTarget.toStageId)}
                </span>
              )}
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
              : (locale === "fr" ? "La transition sera archivée et masquée (suppression logique)." : "The transition will be archived and hidden (soft delete).")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteMode("soft"); }} disabled={deleteMutation.isPending || hardDeleteMutation.isPending}>{t.cancel}</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteMode === "hard") hardDeleteMutation.mutate(deleteTarget.id);
                else deleteMutation.mutate(deleteTarget.id);
              }}
              disabled={deleteMutation.isPending || hardDeleteMutation.isPending}
            >
              {(deleteMutation.isPending || hardDeleteMutation.isPending) ? t.deleting : t.deleteConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
