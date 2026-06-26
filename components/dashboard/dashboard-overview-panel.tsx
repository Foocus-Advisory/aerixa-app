"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import { AlertTriangle, Building2, KeyRound, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { chartPalette, chartTooltipStyle } from "@/lib/echarts-theme";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardOverviewPanelProps {
  accessToken: string;
  locale: Locale;
  theme: "light" | "dark";
  canReadUsers: boolean;
  canReadEstablishments: boolean;
  canReadAudit: boolean;
  canReadSessions: boolean;
}

const ROLE_COLORS: Record<string, string> = {
  ACTIVE: "#3b82f6",
  DISABLED: "#ef4444",
  PENDING_VERIFICATION: "#f59e0b",
  DELETED: "#9ca3af",
};

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
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

export function DashboardOverviewPanel({
  accessToken,
  locale,
  theme,
  canReadUsers,
  canReadEstablishments,
  canReadAudit,
  canReadSessions,
}: DashboardOverviewPanelProps) {
  const isFr = locale === "fr";
  const palette = useMemo(() => chartPalette(theme), [theme]);
  const tooltipStyle = useMemo(() => chartTooltipStyle(theme), [theme]);

  const userStatsQuery = useQuery({
    queryKey: ["dashboard-user-stats", accessToken],
    queryFn: () => api.users.stats(accessToken),
    enabled: Boolean(accessToken && canReadUsers),
  });

  const establishmentsQuery = useQuery({
    queryKey: ["dashboard-establishments", accessToken],
    queryFn: () => api.configuration.establishments.list(accessToken),
    enabled: Boolean(accessToken && canReadEstablishments),
  });

  const auditSummaryQuery = useQuery({
    queryKey: ["dashboard-audit-summary", accessToken],
    queryFn: () => api.auditLogs.summary(accessToken),
    enabled: Boolean(accessToken && canReadAudit),
  });

  const sessionsQuery = useQuery({
    queryKey: ["dashboard-sessions", accessToken],
    queryFn: () => api.sessions.list(accessToken),
    enabled: Boolean(accessToken && canReadSessions),
  });

  const userStatusData = useMemo(() => {
    const stats = userStatsQuery.data;
    if (!stats) return [];
    return [
      { key: "ACTIVE", label: isFr ? "Actifs" : "Active", value: stats.active },
      { key: "DISABLED", label: isFr ? "Desactives" : "Disabled", value: stats.disabled },
      { key: "PENDING_VERIFICATION", label: isFr ? "En attente" : "Pending", value: stats.pendingVerification },
      { key: "DELETED", label: isFr ? "Supprimes" : "Deleted", value: stats.deleted },
    ].filter((entry) => entry.value > 0);
  }, [userStatsQuery.data, isFr]);

  const securityTrendOption = useMemo<EChartsOption>(() => {
    const summary = auditSummaryQuery.data;
    const windows = ["24h", isFr ? "7j" : "7d", isFr ? "30j" : "30d"];
    const loginFailures = [summary?.loginFailures.last24h ?? 0, summary?.loginFailures.last7d ?? 0, summary?.loginFailures.last30d ?? 0];
    const reuseAttempts = [summary?.reuseAttempts.last24h ?? 0, summary?.reuseAttempts.last7d ?? 0, summary?.reuseAttempts.last30d ?? 0];
    const revocations = [summary?.revokeSessions.last24h ?? 0, summary?.revokeSessions.last7d ?? 0, summary?.revokeSessions.last30d ?? 0];

    return {
      tooltip: { trigger: "axis", ...tooltipStyle },
      legend: {
        bottom: 0,
        textStyle: { color: palette.mutedForeground, fontSize: 12 },
        data: [
          isFr ? "Echecs login" : "Login failures",
          isFr ? "Reutilisations" : "Reuse attempts",
          isFr ? "Revocations" : "Revocations",
        ],
      },
      grid: { left: 36, right: 16, top: 24, bottom: 48 },
      xAxis: {
        type: "category",
        data: windows,
        axisLine: { lineStyle: { color: palette.border } },
        axisLabel: { color: palette.mutedForeground, fontSize: 12 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: palette.border, type: "dashed" } },
        axisLabel: { color: palette.mutedForeground, fontSize: 12 },
      },
      series: [
        {
          name: isFr ? "Echecs login" : "Login failures",
          type: "bar",
          data: loginFailures,
          itemStyle: { color: "#ef4444", borderRadius: [4, 4, 0, 0] },
        },
        {
          name: isFr ? "Reutilisations" : "Reuse attempts",
          type: "bar",
          data: reuseAttempts,
          itemStyle: { color: "#f59e0b", borderRadius: [4, 4, 0, 0] },
        },
        {
          name: isFr ? "Revocations" : "Revocations",
          type: "bar",
          data: revocations,
          itemStyle: { color: "#3b82f6", borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  }, [auditSummaryQuery.data, isFr, tooltipStyle, palette]);

  const userStatusOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: "item", ...tooltipStyle },
    legend: {
      bottom: 0,
      textStyle: { color: palette.mutedForeground, fontSize: 12 },
    },
    series: [
      {
        type: "pie",
        radius: ["55%", "80%"],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: palette.card, borderWidth: 2 },
        label: { show: false },
        data: userStatusData.map((entry) => ({
          name: entry.label,
          value: entry.value,
          itemStyle: { color: ROLE_COLORS[entry.key] ?? "#9ca3af" },
        })),
      },
    ],
  }), [userStatusData, tooltipStyle, palette]);

  const activeEstablishmentsCount = (establishmentsQuery.data ?? []).filter(
    (item: { status?: string }) => (item.status ?? "").toUpperCase() === "ACTIVE",
  ).length;
  const totalEstablishmentsCount = (establishmentsQuery.data ?? []).length;
  const activeSessionsCount = (sessionsQuery.data ?? []).filter(
    (item: { status?: string }) => (item.status ?? "ACTIVE") === "ACTIVE",
  ).length;
  const topActors = (auditSummaryQuery.data?.adminActionsByActor ?? []).slice(0, 5);
  const topFailureIps = (auditSummaryQuery.data?.loginFailuresBySourceIp ?? []).slice(0, 5);

  return (
    <section className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {canReadUsers ? (
          <KpiCard
            icon={Users}
            label={isFr ? "Utilisateurs" : "Users"}
            value={userStatsQuery.data?.total ?? "-"}
            hint={isFr ? `${userStatsQuery.data?.active ?? 0} actifs` : `${userStatsQuery.data?.active ?? 0} active`}
          />
        ) : null}
        {canReadEstablishments ? (
          <KpiCard
            icon={Building2}
            label={isFr ? "Etablissements" : "Establishments"}
            value={totalEstablishmentsCount}
            hint={isFr ? `${activeEstablishmentsCount} actifs` : `${activeEstablishmentsCount} active`}
          />
        ) : null}
        {canReadSessions ? (
          <KpiCard
            icon={KeyRound}
            label={isFr ? "Sessions actives" : "Active sessions"}
            value={activeSessionsCount}
            hint={isFr ? "Connexions en cours" : "Currently connected"}
          />
        ) : null}
        {canReadAudit ? (
          <KpiCard
            icon={ShieldAlert}
            label={isFr ? "Echecs login (24h)" : "Login failures (24h)"}
            value={auditSummaryQuery.data?.loginFailures.last24h ?? 0}
            hint={isFr ? "Fenetre glissante 24h" : "Rolling 24h window"}
          />
        ) : null}
      </div>

      {canReadAudit ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="border-border/60 bg-card/70 xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                {isFr ? "Tendance securite" : "Security trend"}
              </CardTitle>
              <CardDescription>
                {isFr ? "Echecs de connexion, reutilisations et revocations par fenetre" : "Login failures, reuse attempts and revocations by window"}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ReactECharts option={securityTrendOption} style={{ height: "100%", width: "100%" }} />
            </CardContent>
          </Card>

          {canReadUsers && userStatusData.length > 0 ? (
            <Card className="border-border/60 bg-card/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {isFr ? "Repartition des utilisateurs" : "User breakdown"}
                </CardTitle>
                <CardDescription>{isFr ? "Par statut de compte" : "By account status"}</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ReactECharts option={userStatusOption} style={{ height: "100%", width: "100%" }} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {canReadAudit ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {isFr ? "Echecs de connexion par IP" : "Login failures by IP"}
              </CardTitle>
              <CardDescription>{isFr ? "Top 5 adresses sources" : "Top 5 source addresses"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {topFailureIps.length === 0 ? (
                <p className="text-sm text-muted-foreground">-</p>
              ) : (
                topFailureIps.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2">
                    <span className="truncate text-sm text-muted-foreground">{item.key}</span>
                    <Badge variant="outline">{item.count}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                {isFr ? "Actions admin par acteur" : "Admin actions by actor"}
              </CardTitle>
              <CardDescription>{isFr ? "Top 5 contributeurs" : "Top 5 contributors"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {topActors.length === 0 ? (
                <p className="text-sm text-muted-foreground">-</p>
              ) : (
                topActors.map((item) => (
                  <div key={item.actorId} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2">
                    <span className="truncate text-sm text-muted-foreground">{item.actorEmail ?? item.actorId}</span>
                    <Badge variant="outline">{item.count}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
