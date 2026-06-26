"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ClipboardList, Eye, Filter, History, LayoutGrid, List, PlusCircle, RefreshCcw, Table as TableIcon, Workflow } from "lucide-react";
import { api } from "@/lib/api";
import { useDashboardStore } from "@/store/dashboard-store";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { MobileSectionTabs } from "@/components/dashboard/mobile-section-tabs";
import { buildPermissionSet, hasPermission, canAccessTab } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { AdminTopBar } from "@/components/dashboard/admin-top-bar";
import { AppTooltip } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { isTokenExpired } from "@/lib/jwt-utils";
import type {
  CandidateApplicationResponse,
  CandidateApplicationStatus,
  FunnelStageType,
  PipelineViewType,
} from "@/lib/types";

const PAGE_SIZE = 10;

export default function CandidateApplicationsPage() {
  const router = useRouter();
  const { accessToken, locale, loadTokensFromStorage, setActiveTab } = useDashboardStore();
  const [isHydrated, setIsHydrated] = useState(false);

  const [selectedEstId, setSelectedEstId] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | CandidateApplicationStatus>("ALL");
  const [stageFilter, setStageFilter] = useState("ALL");

  const [viewType, setViewType] = useState<PipelineViewType>("TABLE");
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [showNewApplication, setShowNewApplication] = useState(false);
  const [newCandidateId, setNewCandidateId] = useState("");
  const [newProgramTrackLevelId, setNewProgramTrackLevelId] = useState("");
  const [newApplicationError, setNewApplicationError] = useState<string | null>(null);

  const [historyTarget, setHistoryTarget] = useState<CandidateApplicationResponse | null>(null);
  const [transitionTarget, setTransitionTarget] = useState<CandidateApplicationResponse | null>(null);
  const [transitionToStageId, setTransitionToStageId] = useState("");
  const [transitionNote, setTransitionNote] = useState("");
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    loadTokensFromStorage();
    setActiveTab("candidate-applications");
    setIsHydrated(true);
  }, [loadTokensFromStorage, setActiveTab]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken || isTokenExpired(accessToken)) {
      router.replace("/login?reason=auth_required");
    }
  }, [accessToken, isHydrated, router]);

  const currentUserQuery = useQuery({
    queryKey: ["candidate-applications", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);
  const canAccess = canAccessTab(permissionSet, "candidate-applications");
  const canTransition = hasPermission(permissionSet, "candidate_applications:transition");
  const canViewHistory = hasPermission(permissionSet, "candidate_applications:history");
  const canCreate = hasPermission(permissionSet, "candidate_applications:create");
  const canReadProgramTrackLevels = hasPermission(permissionSet, "program_track_levels:list");
  const canReadProgramTracks = hasPermission(permissionSet, "program_tracks:list");
  const canReadAcademicLevels = hasPermission(permissionSet, "academic_levels:list");
  const canReadFunnelStages = hasPermission(permissionSet, "funnel_stages:list");
  const canReadFunnelStageTransitions = hasPermission(permissionSet, "funnel_stage_transitions:list");
  const canReadPipelineViewPreference = hasPermission(permissionSet, "pipeline_view_preference:read");

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

  const query = useQuery({
    queryKey: ["candidate-applications", "list", accessToken, effectiveEstId],
    queryFn: () => api.candidateApplications.list(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId && canAccess),
  });

  const items = useMemo(() => query.data ?? [], [query.data]);

  const candidatesQuery = useQuery({
    queryKey: ["candidates", accessToken, effectiveEstId],
    queryFn: () => api.candidates.list(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId),
  });

  const programTrackLevelsQuery = useQuery({
    queryKey: ["config", "program-track-levels", accessToken, effectiveEstId],
    queryFn: () => api.configuration.programTrackLevels.list(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId && canReadProgramTrackLevels),
  });

  const programTracksQuery = useQuery({
    queryKey: ["config", "program-tracks", accessToken, effectiveEstId],
    queryFn: () => api.configuration.programTracks.list(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId && canReadProgramTracks),
  });

  const academicLevelsQuery = useQuery({
    queryKey: ["config", "academic-levels", accessToken, effectiveEstId],
    queryFn: () => api.configuration.academicLevels.list(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId && canReadAcademicLevels),
  });

  const funnelStagesQuery = useQuery({
    queryKey: ["config", "funnel-stages", accessToken, effectiveEstId],
    queryFn: () => api.configuration.funnelStages.list(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId && canReadFunnelStages),
  });

  const funnelStageTransitionsQuery = useQuery({
    queryKey: ["config", "funnel-stage-transitions", accessToken, effectiveEstId],
    queryFn: () => api.configuration.funnelStageTransitions.list(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId && canReadFunnelStageTransitions),
  });

  const pipelineViewPreferenceQuery = useQuery({
    queryKey: ["config", "pipeline-view-preference", accessToken, effectiveEstId],
    queryFn: () => api.configuration.pipelineViewPreference.get(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId && canReadPipelineViewPreference),
  });

  useEffect(() => {
    if (pipelineViewPreferenceQuery.data?.preferredView) {
      setViewType(pipelineViewPreferenceQuery.data.preferredView);
    }
  }, [pipelineViewPreferenceQuery.data]);

  const updateViewPreferenceMutation = useMutation({
    mutationFn: (preferredView: PipelineViewType) =>
      api.configuration.pipelineViewPreference.update(accessToken, { establishmentId: effectiveEstId, preferredView }),
    onSuccess: (data) => setViewType(data.preferredView),
  });

  const handleViewChange = (next: PipelineViewType) => {
    setViewType(next);
    updateViewPreferenceMutation.mutate(next);
  };

  // Eligible program track levels for the candidate selected in the "new application" dialog
  const newApplicationEligibleLevelsQuery = useQuery({
    queryKey: ["candidate", "eligible-levels", accessToken, effectiveEstId, newCandidateId],
    queryFn: () => api.candidates.listEligibleProgramTrackLevels(accessToken, newCandidateId, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId && newCandidateId),
  });

  const newApplicationCandidateApplicationsQuery = useQuery({
    queryKey: ["candidate", "applications", accessToken, effectiveEstId, newCandidateId],
    queryFn: () => api.candidateApplications.listByCandidate(accessToken, newCandidateId, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId && newCandidateId),
  });

  const candidateMap = useMemo(() => {
    const map = new Map<string, string>();
    (candidatesQuery.data ?? []).forEach((c) => map.set(c.id, `${c.firstName} ${c.lastName}`));
    return map;
  }, [candidatesQuery.data]);

  const programTrackMap = useMemo(() => {
    const map = new Map<string, string>();
    (programTracksQuery.data ?? []).forEach((p) => map.set(p.id, p.name));
    return map;
  }, [programTracksQuery.data]);

  const academicLevelMap = useMemo(() => {
    const map = new Map<string, string>();
    (academicLevelsQuery.data ?? []).forEach((a) => map.set(a.id, a.label));
    return map;
  }, [academicLevelsQuery.data]);

  const programTrackLevelLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    (programTrackLevelsQuery.data ?? []).forEach((ptl) => {
      const trackName = programTrackMap.get(ptl.programTrackId) ?? "—";
      const levelLabel = academicLevelMap.get(ptl.academicLevelId) ?? "—";
      map.set(ptl.id, `${trackName} — ${levelLabel}`);
    });
    return map;
  }, [programTrackLevelsQuery.data, programTrackMap, academicLevelMap]);

  const funnelStageMap = useMemo(() => {
    const map = new Map<string, { name: string; stageType: FunnelStageType; positionOrder: number }>();
    (funnelStagesQuery.data ?? []).forEach((s) => map.set(s.id, { name: s.name, stageType: s.stageType, positionOrder: s.positionOrder }));
    return map;
  }, [funnelStagesQuery.data]);

  const orderedStages = useMemo(
    () => (funnelStagesQuery.data ?? []).slice().sort((a, b) => a.positionOrder - b.positionOrder),
    [funnelStagesQuery.data],
  );

  const stageOptions = useMemo(
    () => orderedStages.map((s) => ({ value: s.id, label: s.name, keywords: [s.code, s.name] })),
    [orderedStages],
  );

  const candidateOptions = useMemo(
    () =>
      (candidatesQuery.data ?? []).map((c) => ({
        value: c.id,
        label: `${c.firstName} ${c.lastName}`,
        keywords: [c.firstName, c.lastName],
      })),
    [candidatesQuery.data],
  );

  const allowedTargetStages = useMemo(() => {
    if (!transitionTarget) return [];
    const fromStageId = transitionTarget.currentStageId;
    const allowedIds = new Set(
      (funnelStageTransitionsQuery.data ?? [])
        .filter((t) => t.active && t.fromStageId === fromStageId)
        .map((t) => t.toStageId),
    );
    return stageOptions.filter((opt) => allowedIds.has(opt.value));
  }, [transitionTarget, funnelStageTransitionsQuery.data, stageOptions]);

  const allowedTargetStageIdsByFromStage = useMemo(() => {
    const map = new Map<string, Set<string>>();
    (funnelStageTransitionsQuery.data ?? [])
      .filter((t) => t.active)
      .forEach((t) => {
        if (!map.has(t.fromStageId)) map.set(t.fromStageId, new Set());
        map.get(t.fromStageId)!.add(t.toStageId);
      });
    return map;
  }, [funnelStageTransitionsQuery.data]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      const matchesStage = stageFilter === "ALL" || item.currentStageId === stageFilter;
      return matchesStatus && matchesStage;
    });
  }, [items, statusFilter, stageFilter]);

  const draggedItem = useMemo(
    () => items.find((a) => a.id === draggedItemId) ?? null,
    [items, draggedItemId],
  );

  const isDropAllowed = (item: CandidateApplicationResponse | null, targetStageId: string) => {
    if (!item || !canTransition || item.status !== "IN_PROGRESS") return false;
    if (item.currentStageId === targetStageId) return false;
    return allowedTargetStageIdsByFromStage.get(item.currentStageId)?.has(targetStageId) ?? false;
  };

  const handleDropOnStage = (targetStageId: string) => {
    if (draggedItem && isDropAllowed(draggedItem, targetStageId)) {
      setTransitionTarget(draggedItem);
      setTransitionToStageId(targetStageId);
      setTransitionNote("");
      setTransitionError(null);
    }
    setDraggedItemId(null);
    setDragOverStageId(null);
  };

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const paginated = useMemo(
    () => filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE),
    [filtered, currentPage],
  );

  useEffect(() => {
    setPage(0);
  }, [statusFilter, stageFilter, effectiveEstId]);

  const allOnPageSelected = paginated.length > 0 && paginated.every((item) => selectedIds.has(item.id));

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        paginated.forEach((item) => next.delete(item.id));
      } else {
        paginated.forEach((item) => next.add(item.id));
      }
      return next;
    });
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Eligible program track levels for the selected candidate that don't already have a non-rejected application
  const newApplicationOptions = useMemo(() => {
    const usedProgramTrackLevelIds = new Set(
      (newApplicationCandidateApplicationsQuery.data ?? [])
        .filter((a) => a.status !== "REJECTED")
        .map((a) => a.programTrackLevelId),
    );
    return (newApplicationEligibleLevelsQuery.data ?? [])
      .filter((lvl) => !usedProgramTrackLevelIds.has(lvl.programTrackLevelId))
      .map((lvl) => ({
        value: lvl.programTrackLevelId,
        label: `${lvl.programTrackName} — ${lvl.academicLevelLabel}`,
        keywords: [lvl.programTrackName, lvl.academicLevelLabel],
      }));
  }, [newApplicationEligibleLevelsQuery.data, newApplicationCandidateApplicationsQuery.data]);

  const createMutation = useMutation({
    mutationFn: () =>
      api.candidateApplications.create(accessToken, newCandidateId, {
        establishmentId: effectiveEstId,
        programTrackLevelId: newProgramTrackLevelId,
      }),
    onSuccess: async () => {
      await query.refetch();
      setShowNewApplication(false);
      setNewCandidateId("");
      setNewProgramTrackLevelId("");
      setNewApplicationError(null);
      toast({ variant: "success", title: locale === "fr" ? "Candidature créée" : "Application created" });
    },
    onError: (err) => setNewApplicationError((err as Error).message),
  });

  const historyQuery = useQuery({
    queryKey: ["candidate-applications", "history", accessToken, effectiveEstId, historyTarget?.id],
    queryFn: () => api.candidateApplications.history(accessToken, historyTarget!.id, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId && historyTarget),
  });

  const transitionMutation = useMutation({
    mutationFn: () =>
      api.candidateApplications.transition(accessToken, transitionTarget!.id, {
        establishmentId: effectiveEstId,
        toStageId: transitionToStageId,
        note: transitionNote.trim(),
      }),
    onSuccess: async () => {
      await query.refetch();
      setTransitionTarget(null);
      setTransitionToStageId("");
      setTransitionNote("");
      setTransitionError(null);
      toast({ variant: "success", title: locale === "fr" ? "Transition effectuée" : "Transition completed" });
    },
    onError: (err) => setTransitionError((err as Error).message),
  });

  const t = {
    title: locale === "fr" ? "Candidatures" : "Applications",
    subtitle: locale === "fr" ? "Pipeline et transitions des candidatures par établissement." : "Pipeline and stage transitions for candidate applications.",
    refresh: locale === "fr" ? "Actualiser" : "Refresh",
    filtersTooltip: locale === "fr" ? "Afficher/masquer les filtres" : "Show/hide filters",
    all: locale === "fr" ? "Tous" : "All",
    colCandidate: locale === "fr" ? "Candidat" : "Candidate",
    colProgram: locale === "fr" ? "Filière / Niveau" : "Program / Level",
    colStage: locale === "fr" ? "Étape" : "Stage",
    colStatus: locale === "fr" ? "Statut" : "Status",
    colCreatedBy: locale === "fr" ? "Créé par" : "Created by",
    colUpdatedBy: locale === "fr" ? "Modifié par" : "Updated by",
    colActions: locale === "fr" ? "Actions" : "Actions",
    noData: locale === "fr" ? "Aucune candidature." : "No applications.",
    loadError: locale === "fr" ? "Erreur lors du chargement." : "Error loading data.",
    inProgress: locale === "fr" ? "En cours" : "In progress",
    accepted: locale === "fr" ? "Acceptée" : "Accepted",
    rejected: locale === "fr" ? "Rejetée" : "Rejected",
    tooltipHistory: locale === "fr" ? "Historique" : "History",
    tooltipTransition: locale === "fr" ? "Faire transiter" : "Transition",
    count: (n: number) => (locale === "fr" ? `${n} candidature(s)` : `${n} application(s)`),
    newApplication: locale === "fr" ? "Nouvelle candidature" : "New application",
    selectCandidate: locale === "fr" ? "Candidat" : "Candidate",
    noEligible: locale === "fr" ? "Aucune filière éligible disponible pour ce candidat." : "No eligible program track available for this candidate.",
    pagePrev: locale === "fr" ? "Précédent" : "Previous",
    pageNext: locale === "fr" ? "Suivant" : "Next",
    pageOf: (cur: number, total: number) => (locale === "fr" ? `Page ${cur} sur ${total}` : `Page ${cur} of ${total}`),
    selectedCount: (n: number) => (locale === "fr" ? `${n} sélectionnée(s)` : `${n} selected`),
  };

  const statusLabel = (status: CandidateApplicationStatus) => {
    switch (status) {
      case "IN_PROGRESS": return t.inProgress;
      case "ACCEPTED": return t.accepted;
      case "REJECTED": return t.rejected;
      default: return status;
    }
  };

  const statusBadgeVariant = (status: CandidateApplicationStatus): "secondary" | "success" | "danger" => {
    switch (status) {
      case "ACCEPTED": return "success";
      case "REJECTED": return "danger";
      default: return "secondary";
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

  if (!isHydrated || !accessToken || isTokenExpired(accessToken)) return null;

  return (
    <div className="admin-typography min-h-screen bg-background text-foreground">
      <AppSidebar />

      <div className="pb-20 md:pb-0 md:pl-22.5">
        <AdminTopBar />

        <main className="w-full space-y-5 px-3 py-4 pb-24 md:space-y-6 md:px-8 md:py-8 md:pb-8">
          <Breadcrumbs
            items={[
              { label: locale === "fr" ? "Candidats" : "Candidates" },
              { label: locale === "fr" ? "Candidatures" : "Applications" },
            ]}
          />

          <MobileSectionTabs permissionSet={permissionSet} />

          <div className="grid gap-6">
            <Card className="border-border/60 bg-card/70 shadow-sm">
              <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-2xl md:text-3xl">{t.title}</CardTitle>
                  <CardDescription>{t.subtitle}</CardDescription>
                </div>
                <Badge className="w-fit" variant="outline">
                  <ClipboardList className="h-3.5 w-3.5" />
                  {locale === "fr" ? "Section : Candidatures" : "Section: Applications"}
                </Badge>
              </CardHeader>
            </Card>

            {!canAccess ? (
              <Card className="border-border/60 bg-card/70">
                <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <ClipboardList className="h-10 w-10 text-muted-foreground" />
                  <p className="max-w-md text-sm text-muted-foreground">
                    {locale === "fr"
                      ? "Vous n'avez pas la permission d'accéder à ce module."
                      : "You do not have permission to access this module."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/60 bg-card/70">
                <CardHeader className="space-y-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
                        <ClipboardList className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <CardTitle>{t.title}</CardTitle>
                        <CardDescription>{t.subtitle}</CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 rounded-2xl border border-border/60 bg-muted/20 p-1.5">
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
                      </div>
                      <div className="flex items-center gap-1 rounded-2xl border border-border/60 bg-muted/20 p-1.5">
                        <AppTooltip content="KANBAN">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-10 w-10 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground ${viewType === "KANBAN" ? "bg-background/80 text-foreground" : ""}`}
                            onClick={() => handleViewChange("KANBAN")}
                          >
                            <LayoutGrid className="h-5 w-5" />
                          </Button>
                        </AppTooltip>
                        <AppTooltip content={locale === "fr" ? "Liste" : "List"}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-10 w-10 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground ${viewType === "LIST" ? "bg-background/80 text-foreground" : ""}`}
                            onClick={() => handleViewChange("LIST")}
                          >
                            <List className="h-5 w-5" />
                          </Button>
                        </AppTooltip>
                        <AppTooltip content={locale === "fr" ? "Tableau" : "Table"}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-10 w-10 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground ${viewType === "TABLE" ? "bg-background/80 text-foreground" : ""}`}
                            onClick={() => handleViewChange("TABLE")}
                          >
                            <TableIcon className="h-5 w-5" />
                          </Button>
                        </AppTooltip>
                      </div>
                      {canCreate && (
                        <Button
                          size="sm"
                          className="h-9 rounded-xl"
                          onClick={() => {
                            setNewCandidateId("");
                            setNewProgramTrackLevelId("");
                            setNewApplicationError(null);
                            setShowNewApplication(true);
                          }}
                        >
                          <PlusCircle className="mr-1.5 h-4 w-4" />
                          {t.newApplication}
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
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.inProgress}</p>
                      <p className="mt-2 text-2xl font-semibold">{items.filter((x) => x.status === "IN_PROGRESS").length}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.accepted}</p>
                      <p className="mt-2 text-2xl font-semibold">{items.filter((x) => x.status === "ACCEPTED").length}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.rejected}</p>
                      <p className="mt-2 text-2xl font-semibold">{items.filter((x) => x.status === "REJECTED").length}</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="grid gap-4">
                  {/* Establishment selector */}
                  <div className="grid gap-1 md:max-w-md">
                    <p className="text-xs font-medium text-muted-foreground">{locale === "fr" ? "Etablissement" : "Establishment"}</p>
                    <SearchableSelect
                      options={estOptions}
                      value={effectiveEstId}
                      onValueChange={(v) => setSelectedEstId(v)}
                      placeholder={locale === "fr" ? "Sélectionner un établissement" : "Select an establishment"}
                      searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                    />
                    {establishmentsQuery.isError && (
                      <p className="text-xs text-destructive">{locale === "fr" ? "Impossible de charger les établissements." : "Could not load establishments."}</p>
                    )}
                  </div>

                  {showFilters && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{t.colStatus}</label>
                        <SearchableSelect
                          options={[
                            { value: "ALL", label: t.all, keywords: ["all", "tous"] },
                            { value: "IN_PROGRESS", label: t.inProgress, keywords: ["in_progress", "encours"] },
                            { value: "ACCEPTED", label: t.accepted, keywords: ["accepted", "acceptee"] },
                            { value: "REJECTED", label: t.rejected, keywords: ["rejected", "rejetee"] },
                          ]}
                          value={statusFilter}
                          onValueChange={(v) => setStatusFilter(v as "ALL" | CandidateApplicationStatus)}
                          placeholder={t.all}
                          searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">{t.colStage}</label>
                        <SearchableSelect
                          options={[{ value: "ALL", label: t.all, keywords: ["all", "tous"] }, ...stageOptions]}
                          value={stageFilter}
                          onValueChange={(v) => setStageFilter(v)}
                          placeholder={t.all}
                          searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                        />
                      </div>
                    </div>
                  )}

                  {/* Loading / error / empty states */}
                  {query.isLoading ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">{locale === "fr" ? "Chargement…" : "Loading…"}</p>
                  ) : query.isError ? (
                    <p className="py-8 text-center text-sm text-destructive">{t.loadError}</p>
                  ) : filtered.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">{t.noData}</p>
                  ) : viewType === "KANBAN" ? (
                    <div className="grid gap-3 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${Math.max(orderedStages.length, 1)}, minmax(280px, 1fr))` }}>
                      {orderedStages.map((stage) => {
                        const stageItems = filtered.filter((a) => a.currentStageId === stage.id);
                        const isDragOver = dragOverStageId === stage.id;
                        const dropAllowed = isDropAllowed(draggedItem, stage.id);
                        return (
                          <div
                            key={stage.id}
                            className={`rounded-xl border p-4 transition-colors ${
                              isDragOver
                                ? dropAllowed
                                  ? "border-primary bg-primary/10"
                                  : "border-destructive/50 bg-destructive/5"
                                : "border-border/70 bg-background/60"
                            }`}
                            onDragOver={(e) => {
                              if (!draggedItem) return;
                              e.preventDefault();
                              if (dragOverStageId !== stage.id) setDragOverStageId(stage.id);
                            }}
                            onDragLeave={() => {
                              if (dragOverStageId === stage.id) setDragOverStageId(null);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              handleDropOnStage(stage.id);
                            }}
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <Badge variant={stageTypeBadgeVariant(stage.stageType)}>{stage.name}</Badge>
                              <span className="text-xs text-muted-foreground">{stageItems.length}</span>
                            </div>
                            <div className="grid gap-3">
                              {stageItems.map((item) => {
                                const draggable = canTransition && item.status === "IN_PROGRESS";
                                return (
                                  <div
                                    key={item.id}
                                    className={`rounded-xl border border-border/60 bg-card/70 p-4 text-sm ${draggable ? "cursor-grab active:cursor-grabbing" : ""} ${draggedItemId === item.id ? "opacity-50" : ""}`}
                                    draggable={draggable}
                                    onDragStart={(e) => {
                                      if (!draggable) return;
                                      setDraggedItemId(item.id);
                                      e.dataTransfer.effectAllowed = "move";
                                    }}
                                    onDragEnd={() => {
                                      setDraggedItemId(null);
                                      setDragOverStageId(null);
                                    }}
                                  >
                                    <p className="font-medium">{candidateMap.get(item.candidateId) ?? "—"}</p>
                                    <p className="text-xs text-muted-foreground">{programTrackLevelLabelMap.get(item.programTrackLevelId) ?? "—"}</p>
                                    <div className="mt-3 flex items-center justify-between gap-2">
                                      <Badge variant={statusBadgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                                      <div className="flex items-center gap-1">
                                        {canViewHistory && (
                                          <AppTooltip content={t.tooltipHistory}>
                                            <Button variant="ghost" size="sm" className="h-9 w-9 rounded-lg" onClick={() => setHistoryTarget(item)}>
                                              <History className="h-4.5 w-4.5" />
                                            </Button>
                                          </AppTooltip>
                                        )}
                                        <AppTooltip content={locale === "fr" ? "Voir le candidat" : "View candidate"}>
                                          <Button variant="ghost" size="sm" className="h-9 w-9 rounded-lg" onClick={() => router.push(`/dashboard/candidates/${item.candidateId}?establishmentId=${effectiveEstId}`)}>
                                            <Eye className="h-4.5 w-4.5" />
                                          </Button>
                                        </AppTooltip>
                                        {canTransition && item.status === "IN_PROGRESS" && (
                                          <AppTooltip content={t.tooltipTransition}>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-9 w-9 rounded-lg"
                                              onClick={() => {
                                                setTransitionTarget(item);
                                                setTransitionToStageId("");
                                                setTransitionNote("");
                                                setTransitionError(null);
                                              }}
                                            >
                                              <Workflow className="h-4.5 w-4.5" />
                                            </Button>
                                          </AppTooltip>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              {stageItems.length === 0 && (
                                <p className="py-2 text-center text-xs text-muted-foreground">—</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : viewType === "LIST" ? (
                    <div className="grid gap-3">
                      {filtered.map((item) => {
                        const stage = funnelStageMap.get(item.currentStageId);
                        return (
                          <div key={item.id} className="rounded-xl border border-border/70 bg-background/70 p-4">
                            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="font-medium">{candidateMap.get(item.candidateId) ?? "—"}</p>
                                <p className="text-xs text-muted-foreground">{programTrackLevelLabelMap.get(item.programTrackLevelId) ?? "—"}</p>
                              </div>
                              <Badge variant={statusBadgeVariant(item.status)} className="shrink-0">{statusLabel(item.status)}</Badge>
                            </div>
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <Badge variant={stage ? stageTypeBadgeVariant(stage.stageType) : "outline"}>{stage?.name ?? "—"}</Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {canViewHistory && (
                                <Button size="sm" variant="outline" className="h-8 rounded-lg px-2 text-xs" onClick={() => setHistoryTarget(item)}>
                                  <History className="mr-1 h-3 w-3" />{t.tooltipHistory}
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="h-8 rounded-lg px-2 text-xs" onClick={() => router.push(`/dashboard/candidates/${item.candidateId}?establishmentId=${effectiveEstId}`)}>
                                <Eye className="mr-1 h-3 w-3" />{locale === "fr" ? "Candidat" : "Candidate"}
                              </Button>
                              {canTransition && item.status === "IN_PROGRESS" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 rounded-lg px-2 text-xs"
                                  onClick={() => {
                                    setTransitionTarget(item);
                                    setTransitionToStageId("");
                                    setTransitionNote("");
                                    setTransitionError(null);
                                  }}
                                >
                                  <Workflow className="mr-1 h-3 w-3" />{t.tooltipTransition}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      {/* Desktop table */}
                      <div className="hidden overflow-auto rounded-xl border border-border/80 bg-background/70 md:block">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                              <th className="w-10 px-3 py-3">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-border/80 accent-primary"
                                  checked={allOnPageSelected}
                                  onChange={toggleSelectAllOnPage}
                                  aria-label={locale === "fr" ? "Tout sélectionner" : "Select all"}
                                />
                              </th>
                              <th className="px-3 py-3">{t.colCandidate}</th>
                              <th className="px-3 py-3">{t.colProgram}</th>
                              <th className="px-3 py-3">{t.colStage}</th>
                              <th className="px-3 py-3">{t.colStatus}</th>
                              <th className="hidden px-3 py-3 lg:table-cell">{t.colCreatedBy}</th>
                              <th className="hidden px-3 py-3 xl:table-cell">{t.colUpdatedBy}</th>
                              <th className="px-3 py-3">{t.colActions}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginated.map((item) => {
                              const stage = funnelStageMap.get(item.currentStageId);
                              return (
                                <tr key={item.id} className="border-t border-border/50 transition-colors hover:bg-muted/30">
                                  <td className="px-3 py-2.5">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-border/80 accent-primary"
                                      checked={selectedIds.has(item.id)}
                                      onChange={() => toggleSelectOne(item.id)}
                                      aria-label={locale === "fr" ? "Sélectionner la ligne" : "Select row"}
                                    />
                                  </td>
                                  <td className="px-3 py-2.5 font-medium">{candidateMap.get(item.candidateId) ?? "—"}</td>
                                  <td className="px-3 py-2.5">
                                    <span className="text-xs text-muted-foreground">{programTrackLevelLabelMap.get(item.programTrackLevelId) ?? "—"}</span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <Badge variant={stage ? stageTypeBadgeVariant(stage.stageType) : "outline"}>{stage?.name ?? "—"}</Badge>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <Badge variant={statusBadgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                                  </td>
                                  <td className="hidden px-3 py-2.5 lg:table-cell">
                                    <span className="text-xs text-muted-foreground">{item.createdByLabel ?? "—"}</span>
                                  </td>
                                  <td className="hidden px-3 py-2.5 xl:table-cell">
                                    <span className="text-xs text-muted-foreground">{item.updatedByLabel ?? "—"}</span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <DropdownMenu
                                      triggerTooltip={locale === "fr" ? "Actions" : "Actions"}
                                      items={[
                                        ...(canViewHistory ? [{
                                          label: t.tooltipHistory,
                                          icon: History,
                                          onClick: () => setHistoryTarget(item),
                                        }] : []),
                                        {
                                          label: locale === "fr" ? "Voir le candidat" : "View candidate",
                                          icon: Eye,
                                          onClick: () => router.push(`/dashboard/candidates/${item.candidateId}?establishmentId=${effectiveEstId}`),
                                        },
                                        ...(canTransition && item.status === "IN_PROGRESS" ? [{
                                          label: t.tooltipTransition,
                                          icon: Workflow,
                                          onClick: () => {
                                            setTransitionTarget(item);
                                            setTransitionToStageId("");
                                            setTransitionNote("");
                                            setTransitionError(null);
                                          },
                                        }] : []),
                                      ]}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile cards */}
                      <div className="grid gap-3 md:hidden">
                        {paginated.map((item) => {
                          const stage = funnelStageMap.get(item.currentStageId);
                          return (
                            <div key={item.id} className="rounded-xl border border-border/70 bg-background/70 p-4">
                              <div className="mb-2 flex items-start justify-between gap-2">
                                <label className="flex items-start gap-2">
                                  <input
                                    type="checkbox"
                                    className="mt-1 h-4 w-4 rounded border-border/80 accent-primary"
                                    checked={selectedIds.has(item.id)}
                                    onChange={() => toggleSelectOne(item.id)}
                                    aria-label={locale === "fr" ? "Sélectionner la ligne" : "Select row"}
                                  />
                                  <div>
                                    <p className="font-medium">{candidateMap.get(item.candidateId) ?? "—"}</p>
                                    <p className="text-xs text-muted-foreground">{programTrackLevelLabelMap.get(item.programTrackLevelId) ?? "—"}</p>
                                  </div>
                                </label>
                                <Badge variant={statusBadgeVariant(item.status)} className="shrink-0">{statusLabel(item.status)}</Badge>
                              </div>
                              <div className="mb-3 flex flex-wrap items-center gap-2">
                                <Badge variant={stage ? stageTypeBadgeVariant(stage.stageType) : "outline"}>{stage?.name ?? "—"}</Badge>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {canViewHistory && (
                                  <Button size="sm" variant="outline" className="h-8 rounded-lg px-2 text-xs" onClick={() => setHistoryTarget(item)}>
                                    <History className="mr-1 h-3 w-3" />{t.tooltipHistory}
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" className="h-8 rounded-lg px-2 text-xs" onClick={() => router.push(`/dashboard/candidates/${item.candidateId}?establishmentId=${effectiveEstId}`)}>
                                  <Eye className="mr-1 h-3 w-3" />{locale === "fr" ? "Candidat" : "Candidate"}
                                </Button>
                                {canTransition && item.status === "IN_PROGRESS" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-lg px-2 text-xs"
                                    onClick={() => {
                                      setTransitionTarget(item);
                                      setTransitionToStageId("");
                                      setTransitionNote("");
                                      setTransitionError(null);
                                    }}
                                  >
                                    <Workflow className="mr-1 h-3 w-3" />{t.tooltipTransition}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination */}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-muted-foreground">
                          {selectedIds.size > 0 ? t.selectedCount(selectedIds.size) : t.count(filtered.length)}
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg px-2 text-xs"
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={currentPage === 0}
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            {t.pagePrev}
                          </Button>
                          <span className="text-xs text-muted-foreground">{t.pageOf(currentPage + 1, pageCount)}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg px-2 text-xs"
                            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                            disabled={currentPage >= pageCount - 1}
                          >
                            {t.pageNext}
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {viewType !== "TABLE" && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{t.count(filtered.length)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>

      {/* New application dialog */}
      <Dialog open={showNewApplication} onOpenChange={(open) => { if (!open) { setShowNewApplication(false); setNewApplicationError(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.newApplication}</DialogTitle>
            <DialogDescription>
              {locale === "fr" ? "Sélectionnez un candidat puis une filière / niveau éligible." : "Select a candidate then an eligible program track / level."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.selectCandidate} *</label>
              <SearchableSelect
                options={candidateOptions}
                value={newCandidateId}
                onValueChange={(v) => {
                  setNewCandidateId(v);
                  setNewProgramTrackLevelId("");
                }}
                placeholder={locale === "fr" ? "Sélectionner..." : "Select..."}
                searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.colProgram} *</label>
              <SearchableSelect
                options={newApplicationOptions}
                value={newProgramTrackLevelId}
                onValueChange={setNewProgramTrackLevelId}
                placeholder={locale === "fr" ? "Sélectionner..." : "Select..."}
                searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                className="w-full"
                disabled={!newCandidateId || newApplicationOptions.length === 0}
              />
              {newCandidateId && newApplicationOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">{t.noEligible}</p>
              )}
            </div>
            {newApplicationError && <p className="text-sm text-destructive">{newApplicationError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewApplication(false); setNewApplicationError(null); }} disabled={createMutation.isPending}>
              {locale === "fr" ? "Annuler" : "Cancel"}
            </Button>
            <Button
              onClick={() => {
                if (!newCandidateId) {
                  setNewApplicationError(locale === "fr" ? "Le candidat est obligatoire." : "Candidate is required.");
                  return;
                }
                if (!newProgramTrackLevelId) {
                  setNewApplicationError(locale === "fr" ? "La filière / niveau est obligatoire." : "Program track / level is required.");
                  return;
                }
                createMutation.mutate();
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (locale === "fr" ? "Enregistrement..." : "Saving...") : (locale === "fr" ? "Valider" : "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={historyTarget !== null} onOpenChange={(open) => { if (!open) setHistoryTarget(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{locale === "fr" ? "Historique de la candidature" : "Application history"}</DialogTitle>
            <DialogDescription>
              {historyTarget && (
                <span className="mt-1 block font-medium text-foreground">
                  {candidateMap.get(historyTarget.candidateId) ?? "—"} — {programTrackLevelLabelMap.get(historyTarget.programTrackLevelId) ?? "—"}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {!canViewHistory ? (
              <p className="text-sm text-muted-foreground">
                {locale === "fr" ? "Vous n'avez pas la permission de consulter l'historique." : "You do not have permission to view the history."}
              </p>
            ) : historyQuery.isLoading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{locale === "fr" ? "Chargement…" : "Loading…"}</p>
            ) : historyQuery.isError ? (
              <p className="py-4 text-center text-sm text-destructive">{t.loadError}</p>
            ) : (historyQuery.data ?? []).length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{locale === "fr" ? "Aucun historique." : "No history."}</p>
            ) : (
              (historyQuery.data ?? []).map((h) => {
                const fromStage = h.fromStageId ? funnelStageMap.get(h.fromStageId) : undefined;
                const toStage = funnelStageMap.get(h.toStageId);
                return (
                  <div key={h.id} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>
                        {fromStage ? fromStage.name : (locale === "fr" ? "Création" : "Created")}
                        {" → "}
                        <span className="font-medium">{toStage?.name ?? "—"}</span>
                      </span>
                      <Badge variant="outline">{h.transitionType}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(h.occurredAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}</p>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryTarget(null)}>{locale === "fr" ? "Fermer" : "Close"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transition dialog */}
      <Dialog open={transitionTarget !== null} onOpenChange={(open) => { if (!open) { setTransitionTarget(null); setTransitionError(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{locale === "fr" ? "Faire transiter la candidature" : "Transition application"}</DialogTitle>
            <DialogDescription>
              {transitionTarget && (
                <span className="mt-1 block font-medium text-foreground">
                  {candidateMap.get(transitionTarget.candidateId) ?? "—"} — {programTrackLevelLabelMap.get(transitionTarget.programTrackLevelId) ?? "—"}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Étape actuelle" : "Current stage"}</label>
              <p className="text-sm text-muted-foreground">{transitionTarget ? (funnelStageMap.get(transitionTarget.currentStageId)?.name ?? "—") : "—"}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Étape cible" : "Target stage"} *</label>
              <SearchableSelect
                options={allowedTargetStages}
                value={transitionToStageId}
                onValueChange={setTransitionToStageId}
                placeholder={locale === "fr" ? "Sélectionner..." : "Select..."}
                searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                className="w-full"
                disabled={allowedTargetStages.length === 0}
              />
              {allowedTargetStages.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {locale === "fr" ? "Aucune transition autorisée depuis cette étape." : "No allowed transition from this stage."}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Motif" : "Note"} *</label>
              <textarea
                value={transitionNote}
                onChange={(e) => setTransitionNote(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-(--input-bg) px-3 py-2 text-sm text-foreground [font-family:var(--font-grift)] shadow-sm transition-colors placeholder:text-muted-foreground placeholder:font-medium placeholder:[font-family:var(--font-grift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {transitionError && <p className="text-sm text-destructive">{transitionError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTransitionTarget(null); setTransitionError(null); }} disabled={transitionMutation.isPending}>
              {locale === "fr" ? "Annuler" : "Cancel"}
            </Button>
            <Button
              onClick={() => {
                if (!transitionToStageId) {
                  setTransitionError(locale === "fr" ? "L'étape cible est obligatoire." : "Target stage is required.");
                  return;
                }
                if (!transitionNote.trim()) {
                  setTransitionError(locale === "fr" ? "Le motif est obligatoire." : "Note is required.");
                  return;
                }
                transitionMutation.mutate();
              }}
              disabled={transitionMutation.isPending}
            >
              {transitionMutation.isPending ? (locale === "fr" ? "Enregistrement..." : "Saving...") : (locale === "fr" ? "Valider" : "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
