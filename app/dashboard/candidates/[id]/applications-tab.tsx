"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, History, LayoutGrid, List, PlusCircle, Table as TableIcon, Workflow } from "lucide-react";
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
  CandidateApplicationResponse,
  CandidateApplicationStatus,
  FunnelStageType,
  PipelineViewType,
} from "@/lib/types";

export function ApplicationsTab({
  accessToken,
  locale,
  candidateId,
  establishmentId,
  canCreate,
  canTransition,
  canViewHistory,
}: {
  accessToken: string;
  locale: "fr" | "en";
  candidateId: string;
  establishmentId: string;
  canCreate: boolean;
  canTransition: boolean;
  canViewHistory: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [viewType, setViewType] = useState<PipelineViewType>("TABLE");
  const [showNewApplication, setShowNewApplication] = useState(false);
  const [newProgramTrackLevelId, setNewProgramTrackLevelId] = useState("");
  const [newApplicationError, setNewApplicationError] = useState<string | null>(null);

  const [historyTarget, setHistoryTarget] = useState<CandidateApplicationResponse | null>(null);
  const [transitionTarget, setTransitionTarget] = useState<CandidateApplicationResponse | null>(null);
  const [transitionToStageId, setTransitionToStageId] = useState("");
  const [transitionNote, setTransitionNote] = useState("");
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ["candidate-applications-tab", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);
  const canReadProgramTrackLevels = hasPermission(permissionSet, "program_track_levels:list");
  const canReadProgramTracks = hasPermission(permissionSet, "program_tracks:list");
  const canReadAcademicLevels = hasPermission(permissionSet, "academic_levels:list");
  const canReadFunnelStages = hasPermission(permissionSet, "funnel_stages:list");
  const canReadFunnelStageTransitions = hasPermission(permissionSet, "funnel_stage_transitions:list");
  const canReadPipelineViewPreference = hasPermission(permissionSet, "pipeline_view_preference:read");

  const applicationsQuery = useQuery({
    queryKey: ["candidate", "applications", accessToken, establishmentId, candidateId],
    queryFn: () => api.candidateApplications.listByCandidate(accessToken, candidateId, establishmentId),
    enabled: Boolean(accessToken && candidateId && establishmentId),
  });

  const eligibleLevelsQuery = useQuery({
    queryKey: ["candidate", "eligible-levels", accessToken, establishmentId, candidateId],
    queryFn: () => api.candidates.listEligibleProgramTrackLevels(accessToken, candidateId, establishmentId),
    enabled: Boolean(accessToken && candidateId && establishmentId),
  });

  const programTrackLevelsQuery = useQuery({
    queryKey: ["config", "program-track-levels", accessToken, establishmentId],
    queryFn: () => api.configuration.programTrackLevels.list(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId && canReadProgramTrackLevels),
  });

  const programTracksQuery = useQuery({
    queryKey: ["config", "program-tracks", accessToken, establishmentId],
    queryFn: () => api.configuration.programTracks.list(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId && canReadProgramTracks),
  });

  const academicLevelsQuery = useQuery({
    queryKey: ["config", "academic-levels", accessToken, establishmentId],
    queryFn: () => api.configuration.academicLevels.list(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId && canReadAcademicLevels),
  });

  const funnelStagesQuery = useQuery({
    queryKey: ["config", "funnel-stages", accessToken, establishmentId],
    queryFn: () => api.configuration.funnelStages.list(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId && canReadFunnelStages),
  });

  const funnelStageTransitionsQuery = useQuery({
    queryKey: ["config", "funnel-stage-transitions", accessToken, establishmentId],
    queryFn: () => api.configuration.funnelStageTransitions.list(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId && canReadFunnelStageTransitions),
  });

  const pipelineViewPreferenceQuery = useQuery({
    queryKey: ["config", "pipeline-view-preference", accessToken, establishmentId],
    queryFn: () => api.configuration.pipelineViewPreference.get(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId && canReadPipelineViewPreference),
  });

  const items = useMemo(() => applicationsQuery.data ?? [], [applicationsQuery.data]);

  useEffect(() => {
    if (pipelineViewPreferenceQuery.data?.preferredView) {
      setViewType(pipelineViewPreferenceQuery.data.preferredView);
    }
  }, [pipelineViewPreferenceQuery.data]);

  const updateViewPreferenceMutation = useMutation({
    mutationFn: (preferredView: PipelineViewType) =>
      api.configuration.pipelineViewPreference.update(accessToken, { establishmentId, preferredView }),
    onSuccess: (data) => setViewType(data.preferredView),
  });

  const handleViewChange = (next: PipelineViewType) => {
    setViewType(next);
    updateViewPreferenceMutation.mutate(next);
  };

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

  // Eligible program track levels with no existing application yet (and candidate not ACCEPTED for that track)
  const eligibleForNewApplication = useMemo(() => {
    const usedProgramTrackLevelIds = new Set(
      items.filter((a) => a.status !== "REJECTED").map((a) => a.programTrackLevelId),
    );
    return (eligibleLevelsQuery.data ?? []).filter((lvl) => !usedProgramTrackLevelIds.has(lvl.programTrackLevelId));
  }, [eligibleLevelsQuery.data, items]);

  const newApplicationOptions = useMemo(
    () =>
      eligibleForNewApplication.map((lvl) => ({
        value: lvl.programTrackLevelId,
        label: `${lvl.programTrackName} — ${lvl.academicLevelLabel}`,
        keywords: [lvl.programTrackName, lvl.academicLevelLabel],
      })),
    [eligibleForNewApplication],
  );

  const canStartNewApplication = canCreate && eligibleForNewApplication.length > 0;

  const historyQuery = useQuery({
    queryKey: ["candidate-applications", "history", accessToken, establishmentId, historyTarget?.id],
    queryFn: () => api.candidateApplications.history(accessToken, historyTarget!.id, establishmentId),
    enabled: Boolean(accessToken && establishmentId && historyTarget),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.candidateApplications.create(accessToken, candidateId, {
        establishmentId,
        programTrackLevelId: newProgramTrackLevelId,
      }),
    onSuccess: async () => {
      await applicationsQuery.refetch();
      setShowNewApplication(false);
      setNewProgramTrackLevelId("");
      setNewApplicationError(null);
      toast({ variant: "success", title: locale === "fr" ? "Candidature créée" : "Application created" });
    },
    onError: (err) => setNewApplicationError((err as Error).message),
  });

  const transitionMutation = useMutation({
    mutationFn: () =>
      api.candidateApplications.transition(accessToken, transitionTarget!.id, {
        establishmentId,
        toStageId: transitionToStageId,
        note: transitionNote.trim(),
      }),
    onSuccess: async () => {
      await applicationsQuery.refetch();
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
    subtitle: locale === "fr" ? "Suivi des candidatures du candidat dans le funnel." : "Track the candidate's applications in the funnel.",
    newApplication: locale === "fr" ? "Nouvelle candidature" : "New application",
    noEligible: locale === "fr" ? "Aucune filière éligible disponible pour une nouvelle candidature." : "No eligible program track available for a new application.",
    noData: locale === "fr" ? "Aucune candidature." : "No applications.",
    loadError: locale === "fr" ? "Erreur lors du chargement." : "Error loading data.",
    inProgress: locale === "fr" ? "En cours" : "In progress",
    accepted: locale === "fr" ? "Acceptée" : "Accepted",
    rejected: locale === "fr" ? "Rejetée" : "Rejected",
    tooltipHistory: locale === "fr" ? "Historique" : "History",
    tooltipViewDetail: locale === "fr" ? "Voir le détail" : "View details",
    tooltipTransition: locale === "fr" ? "Faire transiter" : "Transition",
    colProgram: locale === "fr" ? "Filière / Niveau" : "Program / Level",
    colStage: locale === "fr" ? "Étape" : "Stage",
    colStatus: locale === "fr" ? "Statut" : "Status",
    colActions: locale === "fr" ? "Actions" : "Actions",
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

  return (
    <>
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-border/60 bg-card/70 md:h-full">
        <CardHeader className="shrink-0 flex flex-col gap-3 border-b border-border/60 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{t.title}</CardTitle>
            <CardDescription>{t.subtitle}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-1 rounded-2xl border border-border/60 bg-muted/20 p-1 md:flex">
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
              <AppTooltip content={canStartNewApplication ? t.newApplication : t.noEligible}>
                <Button
                  size="sm"
                  className="h-9 rounded-xl"
                  disabled={!canStartNewApplication}
                  onClick={() => {
                    setNewProgramTrackLevelId("");
                    setNewApplicationError(null);
                    setShowNewApplication(true);
                  }}
                >
                  <PlusCircle className="mr-1.5 h-4 w-4" />
                  {t.newApplication}
                </Button>
              </AppTooltip>
            )}
          </div>
        </CardHeader>
        <CardContent className={`min-h-0 flex-1 ${viewType === "KANBAN" ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}>
          {applicationsQuery.isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{locale === "fr" ? "Chargement…" : "Loading…"}</p>
          ) : applicationsQuery.isError ? (
            <p className="py-8 text-center text-sm text-destructive">{t.loadError}</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t.noData}</p>
          ) : (
            <>
              {/* Mobile: toujours la vue carte, quel que soit le viewType choisi sur desktop */}
              <div className="grid gap-3 md:hidden">
                {items.map((item) => {
                  const stage = funnelStageMap.get(item.currentStageId);
                  return (
                    <div key={item.id} className="rounded-xl border border-border/70 bg-background/70 p-4">
                      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">{programTrackLevelLabelMap.get(item.programTrackLevelId) ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{new Date(item.updatedAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}</p>
                        </div>
                        <Badge variant={statusBadgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                      </div>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Badge variant={stage ? stageTypeBadgeVariant(stage.stageType) : "outline"}>{stage?.name ?? "—"}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg px-2 text-xs"
                          onClick={() => router.push(`/dashboard/candidates/${candidateId}/applications/${item.id}?establishmentId=${establishmentId}`)}
                        >
                          <ArrowRight className="mr-1 h-3 w-3" />{t.tooltipViewDetail}
                        </Button>
                        {canViewHistory && (
                          <Button size="sm" variant="outline" className="h-8 rounded-lg px-2 text-xs" onClick={() => setHistoryTarget(item)}>
                            <History className="mr-1 h-3 w-3" />{t.tooltipHistory}
                          </Button>
                        )}
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

              {/* Desktop: vue selon le sélecteur Kanban / Liste / Tableau */}
              <div className={`hidden md:block ${viewType === "KANBAN" ? "md:flex md:min-h-0 md:flex-1 md:flex-col" : ""}`}>
              {viewType === "KANBAN" ? (
            <div className="grid min-h-0 flex-1 gap-3 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${Math.max(orderedStages.length, 1)}, minmax(280px, 1fr))` }}>
              {orderedStages.map((stage) => {
                const stageItems = items.filter((a) => a.currentStageId === stage.id);
                const isDragOver = dragOverStageId === stage.id;
                const dropAllowed = isDropAllowed(draggedItem, stage.id);
                return (
                  <div
                    key={stage.id}
                    className={`flex h-full flex-col rounded-xl border p-4 transition-colors ${
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
                    <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
                      <Badge variant={stageTypeBadgeVariant(stage.stageType)}>{stage.name}</Badge>
                      <span className="text-xs text-muted-foreground">{stageItems.length}</span>
                    </div>
                    <div className="grid flex-1 auto-rows-min gap-3 overflow-y-auto">
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
                            <p className="font-medium">{programTrackLevelLabelMap.get(item.programTrackLevelId) ?? "—"}</p>
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <Badge variant={statusBadgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
              <div className="flex items-center gap-1">
                                <AppTooltip content={t.tooltipViewDetail}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 w-9 rounded-lg"
                                    onClick={() => router.push(`/dashboard/candidates/${candidateId}/applications/${item.id}?establishmentId=${establishmentId}`)}
                                  >
                                    <ArrowRight className="h-4.5 w-4.5" />
                                  </Button>
                                </AppTooltip>
                                {canViewHistory && (
                                  <AppTooltip content={t.tooltipHistory}>
                                    <Button variant="ghost" size="sm" className="h-9 w-9 rounded-lg" onClick={() => setHistoryTarget(item)}>
                                      <History className="h-4.5 w-4.5" />
                                    </Button>
                                  </AppTooltip>
                                )}
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
              {items.map((item) => {
                const stage = funnelStageMap.get(item.currentStageId);
                return (
                  <div key={item.id} className="rounded-xl border border-border/70 bg-background/70 p-4">
                    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{programTrackLevelLabelMap.get(item.programTrackLevelId) ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{new Date(item.updatedAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}</p>
                      </div>
                      <Badge variant={statusBadgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                    </div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge variant={stage ? stageTypeBadgeVariant(stage.stageType) : "outline"}>{stage?.name ?? "—"}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg px-2 text-xs"
                        onClick={() => router.push(`/dashboard/candidates/${candidateId}/applications/${item.id}?establishmentId=${establishmentId}`)}
                      >
                        <ArrowRight className="mr-1 h-3 w-3" />{t.tooltipViewDetail}
                      </Button>
                      {canViewHistory && (
                        <Button size="sm" variant="outline" className="h-8 rounded-lg px-2 text-xs" onClick={() => setHistoryTarget(item)}>
                          <History className="mr-1 h-3 w-3" />{t.tooltipHistory}
                        </Button>
                      )}
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
            <div className="overflow-auto rounded-xl border border-border/80 bg-background/70">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3">{t.colProgram}</th>
                    <th className="px-3 py-3">{t.colStage}</th>
                    <th className="px-3 py-3">{t.colStatus}</th>
                    <th className="px-3 py-3">{t.colActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const stage = funnelStageMap.get(item.currentStageId);
                    return (
                      <tr key={item.id} className="border-t border-border/50 transition-colors hover:bg-muted/30">
                        <td className="px-3 py-2.5 font-medium">{programTrackLevelLabelMap.get(item.programTrackLevelId) ?? "—"}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant={stage ? stageTypeBadgeVariant(stage.stageType) : "outline"}>{stage?.name ?? "—"}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={statusBadgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <DropdownMenu
                            triggerTooltip={locale === "fr" ? "Actions" : "Actions"}
                            items={[
                              {
                                label: t.tooltipViewDetail,
                                icon: ArrowRight,
                                onClick: () => router.push(`/dashboard/candidates/${candidateId}/applications/${item.id}?establishmentId=${establishmentId}`),
                              },
                              ...(canViewHistory ? [{
                                label: t.tooltipHistory,
                                icon: History,
                                onClick: () => setHistoryTarget(item),
                              }] : []),
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
          )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* New application dialog */}
      <Dialog open={showNewApplication} onOpenChange={(open) => { if (!open) { setShowNewApplication(false); setNewApplicationError(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.newApplication}</DialogTitle>
            <DialogDescription>
              {locale === "fr" ? "Sélectionnez une filière / niveau éligible." : "Select an eligible program track / level."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.colProgram} *</label>
              <SearchableSelect
                options={newApplicationOptions}
                value={newProgramTrackLevelId}
                onValueChange={setNewProgramTrackLevelId}
                placeholder={locale === "fr" ? "Sélectionner..." : "Select..."}
                searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                className="w-full"
                disabled={newApplicationOptions.length === 0}
              />
            </div>
            {newApplicationError && <p className="text-sm text-destructive">{newApplicationError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewApplication(false); setNewApplicationError(null); }} disabled={createMutation.isPending}>
              {locale === "fr" ? "Annuler" : "Cancel"}
            </Button>
            <Button
              onClick={() => {
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
                  {programTrackLevelLabelMap.get(historyTarget.programTrackLevelId) ?? "—"}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {historyQuery.isLoading ? (
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
                  {programTrackLevelLabelMap.get(transitionTarget.programTrackLevelId) ?? "—"}
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
    </>
  );
}
