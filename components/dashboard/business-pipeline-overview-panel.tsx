"use client";

import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { Building2, GitBranch, GraduationCap, Megaphone, Trophy, UserRound, Users2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { chartPalette, chartTooltipStyle } from "@/lib/echarts-theme";
import type {
  AcquisitionChannelResponse,
  CandidateApplicationResponse,
  CandidateResponse,
  EstablishmentResponse,
  FunnelStageResponse,
  OperatorPerformanceResponse,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BusinessPipelineOverviewPanelProps {
  accessToken: string;
  locale: Locale;
  theme: "light" | "dark";
  canReadEstablishments: boolean;
  canReadCandidates: boolean;
  canReadCandidateApplications: boolean;
  canReadFunnelStages: boolean;
  canReadAcquisitionChannels: boolean;
  canReadAcademicLevels: boolean;
  canReadEntryDiplomas: boolean;
  canReadProgramTracks: boolean;
  canReadProgramTrackLevels: boolean;
  canReadOperatorPerformance: boolean;
}

const APPLICATION_STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: "#3b82f6",
  ACCEPTED: "#22c55e",
  REJECTED: "#ef4444",
};

const CHANNEL_TYPE_COLORS: Record<string, string> = {
  DIRECT: "#3b82f6",
  INDIRECT: "#f59e0b",
};

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users2;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="border-border/60 bg-card/70">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold leading-tight">{value}</p>
          {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function BusinessPipelineOverviewPanel({
  accessToken,
  locale,
  theme,
  canReadEstablishments,
  canReadCandidates,
  canReadCandidateApplications,
  canReadFunnelStages,
  canReadAcquisitionChannels,
  canReadAcademicLevels,
  canReadEntryDiplomas,
  canReadProgramTracks,
  canReadProgramTrackLevels,
  canReadOperatorPerformance,
}: BusinessPipelineOverviewPanelProps) {
  const isFr = locale === "fr";
  const palette = useMemo(() => chartPalette(theme), [theme]);
  const tooltipStyle = useMemo(() => chartTooltipStyle(theme), [theme]);
  const canReadAnyConfiguration =
    canReadAcademicLevels || canReadEntryDiplomas || canReadProgramTracks || canReadProgramTrackLevels;

  const establishmentsQuery = useQuery({
    queryKey: ["pipeline-overview-establishments", accessToken],
    queryFn: () => api.configuration.establishments.list(accessToken),
    enabled: Boolean(accessToken && canReadEstablishments),
  });

  const establishments = establishmentsQuery.data ?? [];
  const establishmentIds = useMemo(() => establishments.map((item) => item.id), [establishments]);

  const candidatesQueries = useQueries({
    queries: establishmentIds.map((establishmentId) => ({
      queryKey: ["pipeline-overview-candidates", accessToken, establishmentId],
      queryFn: () => api.candidates.listPaged(accessToken, establishmentId, { size: 500 }),
      enabled: Boolean(accessToken && canReadCandidates && establishmentId),
    })),
  });

  const applicationsQueries = useQueries({
    queries: establishmentIds.map((establishmentId) => ({
      queryKey: ["pipeline-overview-applications", accessToken, establishmentId],
      queryFn: () => api.candidateApplications.listPaged(accessToken, establishmentId, { size: 500 }),
      enabled: Boolean(accessToken && canReadCandidateApplications && establishmentId),
    })),
  });

  const funnelStagesQueries = useQueries({
    queries: establishmentIds.map((establishmentId) => ({
      queryKey: ["pipeline-overview-funnel-stages", accessToken, establishmentId],
      queryFn: () => api.configuration.funnelStages.list(accessToken, establishmentId),
      enabled: Boolean(accessToken && canReadFunnelStages && establishmentId),
    })),
  });

  const acquisitionChannelsQueries = useQueries({
    queries: establishmentIds.map((establishmentId) => ({
      queryKey: ["pipeline-overview-acquisition-channels", accessToken, establishmentId],
      queryFn: () => api.configuration.acquisitionChannels.list(accessToken, establishmentId),
      enabled: Boolean(accessToken && canReadAcquisitionChannels && establishmentId),
    })),
  });

  const academicLevelsQueries = useQueries({
    queries: establishmentIds.map((establishmentId) => ({
      queryKey: ["pipeline-overview-academic-levels", accessToken, establishmentId],
      queryFn: () => api.configuration.academicLevels.list(accessToken, establishmentId),
      enabled: Boolean(accessToken && canReadAcademicLevels && establishmentId),
    })),
  });

  const entryDiplomasQueries = useQueries({
    queries: establishmentIds.map((establishmentId) => ({
      queryKey: ["pipeline-overview-entry-diplomas", accessToken, establishmentId],
      queryFn: () => api.configuration.entryDiplomas.list(accessToken, establishmentId),
      enabled: Boolean(accessToken && canReadEntryDiplomas && establishmentId),
    })),
  });

  const programTracksQueries = useQueries({
    queries: establishmentIds.map((establishmentId) => ({
      queryKey: ["pipeline-overview-program-tracks", accessToken, establishmentId],
      queryFn: () => api.configuration.programTracks.list(accessToken, establishmentId),
      enabled: Boolean(accessToken && canReadProgramTracks && establishmentId),
    })),
  });

  const programTrackLevelsQueries = useQueries({
    queries: establishmentIds.map((establishmentId) => ({
      queryKey: ["pipeline-overview-program-track-levels", accessToken, establishmentId],
      queryFn: () => api.configuration.programTrackLevels.list(accessToken, establishmentId),
      enabled: Boolean(accessToken && canReadProgramTrackLevels && establishmentId),
    })),
  });

  const operatorPerformanceQueries = useQueries({
    queries: establishmentIds.map((establishmentId) => ({
      queryKey: ["pipeline-overview-operator-performance", accessToken, establishmentId],
      queryFn: () => api.configuration.establishments.listOperatorPerformance(accessToken, establishmentId),
      enabled: Boolean(accessToken && canReadOperatorPerformance && establishmentId),
    })),
  });

  const candidates = useMemo<CandidateResponse[]>(
    () => candidatesQueries.flatMap((query) => query.data?.content ?? []),
    [candidatesQueries],
  );
  const applications = useMemo<CandidateApplicationResponse[]>(
    () => applicationsQueries.flatMap((query) => query.data?.content ?? []),
    [applicationsQueries],
  );
  const funnelStages = useMemo<FunnelStageResponse[]>(
    () => funnelStagesQueries.flatMap((query) => query.data ?? []),
    [funnelStagesQueries],
  );
  const acquisitionChannels = useMemo<AcquisitionChannelResponse[]>(
    () => acquisitionChannelsQueries.flatMap((query) => query.data ?? []),
    [acquisitionChannelsQueries],
  );
  const academicLevels = useMemo(() => academicLevelsQueries.flatMap((query) => query.data ?? []), [academicLevelsQueries]);
  const entryDiplomas = useMemo(() => entryDiplomasQueries.flatMap((query) => query.data ?? []), [entryDiplomasQueries]);
  const programTracks = useMemo(() => programTracksQueries.flatMap((query) => query.data ?? []), [programTracksQueries]);
  const programTrackLevels = useMemo(
    () => programTrackLevelsQueries.flatMap((query) => query.data ?? []),
    [programTrackLevelsQueries],
  );

  const operatorPerformance = useMemo<OperatorPerformanceResponse[]>(() => {
    const byOperator = new Map<string, OperatorPerformanceResponse>();
    for (const query of operatorPerformanceQueries) {
      for (const entry of query.data ?? []) {
        const existing = byOperator.get(entry.operatorUserId);
        if (!existing) {
          byOperator.set(entry.operatorUserId, { ...entry });
          continue;
        }
        existing.candidatesCount += entry.candidatesCount;
        existing.activeCandidatesCount += entry.activeCandidatesCount;
        existing.applicationsCount += entry.applicationsCount;
        existing.applicationsInProgressCount += entry.applicationsInProgressCount;
        existing.applicationsAcceptedCount += entry.applicationsAcceptedCount;
        existing.applicationsRejectedCount += entry.applicationsRejectedCount;
        const closed = existing.applicationsAcceptedCount + existing.applicationsRejectedCount;
        existing.conversionRate = closed === 0 ? undefined : existing.applicationsAcceptedCount / closed;
      }
    }
    return Array.from(byOperator.values()).sort((a, b) => b.applicationsAcceptedCount - a.applicationsAcceptedCount);
  }, [operatorPerformanceQueries]);

  const activeEstablishmentsCount = establishments.filter((item: EstablishmentResponse) => (item.status ?? "").toUpperCase() === "ACTIVE").length;
  const activeCandidatesCount = candidates.filter((item) => item.status === "ACTIVE").length;

  const applicationStatusOption = useMemo<EChartsOption>(() => {
    const counts = applications.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    }, {});
    const labels: Record<string, string> = {
      IN_PROGRESS: isFr ? "En cours" : "In progress",
      ACCEPTED: isFr ? "Acceptees" : "Accepted",
      REJECTED: isFr ? "Rejetees" : "Rejected",
    };
    const data = Object.entries(counts).map(([key, value]) => ({
      name: labels[key] ?? key,
      value,
      itemStyle: { color: APPLICATION_STATUS_COLORS[key] ?? "#9ca3af" },
    }));

    return {
      tooltip: { trigger: "item", ...tooltipStyle },
      legend: { bottom: 0, textStyle: { color: palette.mutedForeground, fontSize: 12 } },
      series: [
        {
          type: "pie",
          radius: ["55%", "80%"],
          itemStyle: { borderRadius: 6, borderColor: palette.card, borderWidth: 2 },
          label: { show: false },
          data,
        },
      ],
    };
  }, [applications, isFr, tooltipStyle, palette]);

  const funnelOption = useMemo<EChartsOption>(() => {
    const sortedStages = [...funnelStages].sort((a, b) => a.positionOrder - b.positionOrder);
    const countByStage = applications.reduce<Record<string, number>>((acc, item) => {
      acc[item.currentStageId] = (acc[item.currentStageId] ?? 0) + 1;
      return acc;
    }, {});
    const funnelColors = ["#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#22c55e", "#f59e0b"];
    const data = sortedStages.map((stage, index) => ({
      name: stage.name,
      value: countByStage[stage.id] ?? 0,
      itemStyle: { color: funnelColors[index % funnelColors.length] },
    }));

    return {
      tooltip: { trigger: "item", ...tooltipStyle },
      series: [
        {
          type: "funnel",
          left: "6%",
          right: "6%",
          top: 10,
          bottom: 10,
          width: "88%",
          minSize: "20%",
          maxSize: "100%",
          sort: "none",
          gap: 4,
          label: { color: "#ffffff", fontSize: 12 },
          itemStyle: { borderColor: palette.card, borderWidth: 1 },
          data,
        },
      ],
    };
  }, [funnelStages, applications, tooltipStyle, palette]);

  const acquisitionChannelOption = useMemo<EChartsOption>(() => {
    const channelById = new Map(acquisitionChannels.map((channel) => [channel.id, channel]));
    const countByChannel = candidates.reduce<Record<string, number>>((acc, item) => {
      acc[item.acquisitionChannelId] = (acc[item.acquisitionChannelId] ?? 0) + 1;
      return acc;
    }, {});
    const data = Object.entries(countByChannel).map(([channelId, value]) => {
      const channel = channelById.get(channelId);
      return {
        name: channel?.name ?? channelId,
        value,
        itemStyle: { color: CHANNEL_TYPE_COLORS[channel?.type ?? ""] ?? "#9ca3af" },
      };
    });

    return {
      tooltip: { trigger: "item", ...tooltipStyle },
      legend: { bottom: 0, type: "scroll", textStyle: { color: palette.mutedForeground, fontSize: 12 } },
      series: [
        {
          type: "pie",
          radius: ["40%", "75%"],
          itemStyle: { borderRadius: 6, borderColor: palette.card, borderWidth: 2 },
          label: { color: palette.mutedForeground, fontSize: 11 },
          data,
        },
      ],
    };
  }, [acquisitionChannels, candidates, tooltipStyle, palette]);

  const configurationVolumeOption = useMemo<EChartsOption>(() => {
    const categories = [
      isFr ? "Niveaux academiques" : "Academic levels",
      isFr ? "Diplomes d'entree" : "Entry diplomas",
      isFr ? "Filieres" : "Program tracks",
      isFr ? "Niveaux de filiere" : "Track levels",
      isFr ? "Canaux d'acquisition" : "Acquisition channels",
    ];
    const values = [
      academicLevels.length,
      entryDiplomas.length,
      programTracks.length,
      programTrackLevels.length,
      acquisitionChannels.length,
    ];

    return {
      tooltip: { trigger: "axis", ...tooltipStyle },
      grid: { left: 120, right: 24, top: 16, bottom: 16 },
      xAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: palette.border, type: "dashed" } },
        axisLabel: { color: palette.mutedForeground, fontSize: 12 },
      },
      yAxis: {
        type: "category",
        data: categories,
        axisLine: { lineStyle: { color: palette.border } },
        axisLabel: { color: palette.mutedForeground, fontSize: 12 },
      },
      series: [
        {
          type: "bar",
          data: values,
          itemStyle: { color: "#3b82f6", borderRadius: [0, 4, 4, 0] },
          barMaxWidth: 22,
        },
      ],
    };
  }, [academicLevels, entryDiplomas, programTracks, programTrackLevels, acquisitionChannels, isFr, tooltipStyle, palette]);

  return (
    <section className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {canReadEstablishments ? (
          <KpiCard
            icon={Building2}
            label={isFr ? "Etablissements" : "Establishments"}
            value={establishments.length}
            hint={isFr ? `${activeEstablishmentsCount} actifs` : `${activeEstablishmentsCount} active`}
          />
        ) : null}
        {canReadCandidates ? (
          <KpiCard
            icon={UserRound}
            label={isFr ? "Candidats" : "Candidates"}
            value={candidates.length}
            hint={isFr ? `${activeCandidatesCount} actifs` : `${activeCandidatesCount} active`}
          />
        ) : null}
        {canReadCandidateApplications ? (
          <KpiCard
            icon={Users2}
            label={isFr ? "Candidatures" : "Applications"}
            value={applications.length}
            hint={isFr ? "Toutes etapes confondues" : "All stages combined"}
          />
        ) : null}
        {canReadFunnelStages ? (
          <KpiCard
            icon={GitBranch}
            label={isFr ? "Etapes du pipeline" : "Pipeline stages"}
            value={funnelStages.length}
            hint={isFr ? "Configurees" : "Configured"}
          />
        ) : null}
      </div>

      {canReadCandidateApplications && canReadFunnelStages ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="border-border/60 bg-card/70 xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                {isFr ? "Funnel de conversion" : "Conversion funnel"}
              </CardTitle>
              <CardDescription>
                {isFr ? "Candidatures par etape actuelle du pipeline" : "Applications by current pipeline stage"}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ReactECharts option={funnelOption} style={{ height: "100%", width: "100%" }} />
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users2 className="h-5 w-5" />
                {isFr ? "Statut des candidatures" : "Application status"}
              </CardTitle>
              <CardDescription>{isFr ? "En cours, acceptees, rejetees" : "In progress, accepted, rejected"}</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ReactECharts option={applicationStatusOption} style={{ height: "100%", width: "100%" }} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {canReadCandidates && canReadAcquisitionChannels ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                {isFr ? "Candidats par canal d'acquisition" : "Candidates by acquisition channel"}
              </CardTitle>
              <CardDescription>{isFr ? "Repartition direct / indirect" : "Direct / indirect breakdown"}</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ReactECharts option={acquisitionChannelOption} style={{ height: "100%", width: "100%" }} />
            </CardContent>
          </Card>

          {canReadAnyConfiguration ? (
            <Card className="border-border/60 bg-card/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  {isFr ? "Volumetrie de configuration" : "Configuration volume"}
                </CardTitle>
                <CardDescription>
                  {isFr ? "Nombre d'elements configures par categorie" : "Number of configured items per category"}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ReactECharts option={configurationVolumeOption} style={{ height: "100%", width: "100%" }} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {canReadOperatorPerformance ? (
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              {isFr ? "Performance des opérateurs" : "Operator performance"}
            </CardTitle>
            <CardDescription>
              {isFr
                ? "Candidats, candidatures et taux de conversion par opérateur, tous établissements confondus."
                : "Candidates, applications and conversion rate per operator, across all establishments."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {operatorPerformance.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {isFr ? "Aucun opérateur affecté pour le moment." : "No operator assigned yet."}
              </p>
            ) : (
              <div className="overflow-auto rounded-xl border border-border/80 bg-background/70">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-3">{isFr ? "Opérateur" : "Operator"}</th>
                      <th className="px-3 py-3">{isFr ? "Candidats" : "Candidates"}</th>
                      <th className="px-3 py-3">{isFr ? "Candidatures" : "Applications"}</th>
                      <th className="px-3 py-3">{isFr ? "En cours" : "In progress"}</th>
                      <th className="px-3 py-3">{isFr ? "Acceptées" : "Accepted"}</th>
                      <th className="px-3 py-3">{isFr ? "Rejetées" : "Rejected"}</th>
                      <th className="px-3 py-3">{isFr ? "Taux de conversion" : "Conversion rate"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operatorPerformance.map((operator, index) => (
                      <tr key={operator.operatorUserId} className="border-t border-border/50 hover:bg-muted/30">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {index === 0 && operator.applicationsAcceptedCount > 0 ? (
                              <Trophy className="h-3.5 w-3.5 text-amber-500" />
                            ) : null}
                            <span className="font-medium">{operator.operatorDisplayName}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{operator.operatorEmail}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          {operator.candidatesCount}
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({operator.activeCandidatesCount} {isFr ? "actifs" : "active"})
                          </span>
                        </td>
                        <td className="px-3 py-2.5">{operator.applicationsCount}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline">{operator.applicationsInProgressCount}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="success">{operator.applicationsAcceptedCount}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="danger">{operator.applicationsRejectedCount}</Badge>
                        </td>
                        <td className="px-3 py-2.5 font-medium">
                          {operator.conversionRate != null ? `${Math.round(operator.conversionRate * 100)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
