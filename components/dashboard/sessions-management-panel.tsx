"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Eye, Filter, RefreshCcw, ShieldX } from "lucide-react";
import { api } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import type { SessionResponse } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AppTooltip } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast-provider";
import { hasPermission } from "@/lib/permissions";
import { SessionsCriticalActions } from "@/components/dashboard/sessions-critical-actions";

const PAGE_SIZE = 10;

type SessionsManagementPanelProps = {
  accessToken: string;
  locale: Locale;
  onLog: (entry: string) => void;
  permissionSet?: Set<string>;
};

type SessionStatusFilter = "ALL" | "ACTIVE" | "REVOKED" | "EXPIRED";
type SessionExportFormat = "csv" | "xlsx";
type SessionPeriodPreset = "CUSTOM" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS";

const labels = {
  fr: {
    title: "Sessions",
    subtitle: "Suivi des sessions utilisateur avec filtres et actions",
    filtersToggle: "Afficher/masquer les filtres",
    refresh: "Actualiser",
    exportXlsx: "Exporter en Excel",
    exportCsv: "Exporter en CSV",
    filterUser: "Utilisateur",
    filterUserPlaceholder: "Nom, email, username...",
    filterUserId: "Utilisateur (ID)",
    filterStatus: "Statut",
    filterFrom: "Début (du)",
    filterTo: "Début (au)",
    presetsLabel: "Périodes rapides",
    presetToday: "Aujourd’hui",
    preset7Days: "7 jours",
    preset30Days: "30 jours",
    presetCustom: "Personnalisée",
    all: "Tous",
    active: "Actives",
    revoked: "Révoquées",
    expired: "Expirées",
    tableUser: "Utilisateur",
    tableStart: "Début session",
    tableEnd: "Fin session",
    tableStatus: "Statut",
    tableIp: "Adresse IP",
    tableTerminal: "Terminal",
    tableActions: "Actions",
    noData: "Aucune session sur ce filtre.",
    loading: "Chargement des sessions...",
    actionsMenu: "Actions session",
    actionView: "Consulter",
    actionRevoke: "Révoquer",
    dialogTitle: "Détails de la session",
    dialogDescription: "Informations techniques et statut de la session",
    close: "Fermer",
    unknownUser: "Utilisateur inconnu",
    unknownTerminal: "Terminal inconnu",
    statusActive: "ACTIVE",
    statusRevoked: "REVOKED",
    statusExpired: "EXPIRED",
    current: "courante",
    rowsPerPage: "Lignes par page:",
    page: "Page",
    firstPage: "Première page",
    previousPage: "Page précédente",
    nextPage: "Page suivante",
    lastPage: "Dernière page",
    revokeSuccess: "Session révoquée",
    revokeFailed: "Échec de révocation",
    detailsFailed: "Impossible de charger les détails",
    exportSuccess: "Export terminé",
    exportFailed: "Export impossible",
    detailStart: "Début",
    detailEnd: "Fin",
    detailIp: "IP",
    detailDevice: "Appareil",
    detailUserAgent: "User Agent",
    sessionsCountSuffix: "session(s)",
    searchUser: "Rechercher un utilisateur...",
    searchStatus: "Rechercher un statut...",
    selectedRows: "ligne(s) sélectionnée(s)",
    selectAll: "Sélectionner toutes les sessions de la page",
  },
  en: {
    title: "Sessions",
    subtitle: "User session monitoring with filters and actions",
    filtersToggle: "Show/hide filters",
    refresh: "Refresh",
    exportXlsx: "Export to Excel",
    exportCsv: "Export to CSV",
    filterUser: "User",
    filterUserPlaceholder: "Name, email, username...",
    filterUserId: "User (ID)",
    filterStatus: "Status",
    filterFrom: "Start (from)",
    filterTo: "Start (to)",
    presetsLabel: "Quick periods",
    presetToday: "Today",
    preset7Days: "7 days",
    preset30Days: "30 days",
    presetCustom: "Custom",
    all: "All",
    active: "Active",
    revoked: "Revoked",
    expired: "Expired",
    tableUser: "User",
    tableStart: "Session start",
    tableEnd: "Session end",
    tableStatus: "Status",
    tableIp: "IP address",
    tableTerminal: "Terminal",
    tableActions: "Actions",
    noData: "No sessions for this filter.",
    loading: "Loading sessions...",
    actionsMenu: "Session actions",
    actionView: "View",
    actionRevoke: "Revoke",
    dialogTitle: "Session details",
    dialogDescription: "Technical details and current status",
    close: "Close",
    unknownUser: "Unknown user",
    unknownTerminal: "Unknown terminal",
    statusActive: "ACTIVE",
    statusRevoked: "REVOKED",
    statusExpired: "EXPIRED",
    current: "current",
    rowsPerPage: "Rows per page:",
    page: "Page",
    firstPage: "First page",
    previousPage: "Previous page",
    nextPage: "Next page",
    lastPage: "Last page",
    revokeSuccess: "Session revoked",
    revokeFailed: "Revoke failed",
    detailsFailed: "Unable to load details",
    exportSuccess: "Export completed",
    exportFailed: "Export failed",
    detailStart: "Start",
    detailEnd: "End",
    detailIp: "IP",
    detailDevice: "Device",
    detailUserAgent: "User Agent",
    sessionsCountSuffix: "session(s)",
    searchUser: "Search a user...",
    searchStatus: "Search a status...",
    selectedRows: "row(s) selected",
    selectAll: "Select all sessions on this page",
  },
} as const;

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toDateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function buildPresetRange(preset: Exclude<SessionPeriodPreset, "CUSTOM">) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  if (preset === "LAST_7_DAYS") {
    start.setDate(start.getDate() - 6);
  } else if (preset === "LAST_30_DAYS") {
    start.setDate(start.getDate() - 29);
  }

  return {
    startedFrom: toDateInputValue(start),
    startedTo: toDateInputValue(end),
  };
}

function formatDate(value: string | undefined, locale: Locale) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(locale === "fr" ? "fr-FR" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusClass(status: string) {
  if (status === "ACTIVE") {
    return "border border-emerald-200 bg-emerald-100 !text-emerald-900 dark:border-emerald-500/45 dark:bg-emerald-500/20 dark:!text-emerald-50";
  }
  if (status === "REVOKED") {
    return "border border-rose-200 bg-rose-100 !text-rose-900 dark:border-rose-500/45 dark:bg-rose-500/20 dark:!text-rose-50";
  }
  return "border border-amber-200 bg-amber-100 !text-amber-900 dark:border-amber-500/45 dark:bg-amber-500/20 dark:!text-amber-50";
}

function getStatusDotClass(status: string) {
  if (status === "ACTIVE") {
    return "bg-emerald-500 dark:bg-emerald-300";
  }
  if (status === "REVOKED") {
    return "bg-rose-500 dark:bg-rose-300";
  }
  return "bg-amber-500 dark:bg-amber-300";
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function deriveTerminalLabel(session: SessionResponse, locale: Locale) {
  const explicitDeviceName = session.deviceName?.trim();
  if (explicitDeviceName && !isUuidLike(explicitDeviceName)) {
    return explicitDeviceName;
  }

  const userAgent = session.userAgent ?? "";
  const browserName = /Edg\//i.test(userAgent)
    ? "Edge"
    : /OPR\//i.test(userAgent) || /Opera/i.test(userAgent)
      ? "Opera"
      : /Firefox\//i.test(userAgent)
        ? "Firefox"
        : /Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent) && !/OPR\//i.test(userAgent)
          ? "Chrome"
          : /Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent) && !/Chromium\//i.test(userAgent)
            ? "Safari"
            : null;

  const platformName = /iPhone/i.test(userAgent)
    ? "iPhone"
    : /iPad/i.test(userAgent)
      ? "iPad"
      : /Android/i.test(userAgent)
        ? "Android"
        : /Windows/i.test(userAgent)
          ? "Windows"
          : /Mac OS/i.test(userAgent)
            ? "macOS"
            : /Linux/i.test(userAgent)
              ? "Linux"
              : null;

  if (browserName && platformName) {
    return locale === "fr" ? `${browserName} sur ${platformName}` : `${browserName} on ${platformName}`;
  }

  if (browserName) {
    return browserName;
  }

  if (session.deviceType) {
    return session.deviceType;
  }

  return locale === "fr" ? labels.fr.unknownTerminal : labels.en.unknownTerminal;
}

export function SessionsManagementPanel({ accessToken, locale, onLog, permissionSet }: SessionsManagementPanelProps) {
  const { toast } = useToast();
  const t = labels[locale];
  const permissions = permissionSet ?? new Set<string>();
  const canReadSessions =
    hasPermission(permissions, "sessions:read_all") ||
    hasPermission(permissions, "sessions:read_children");
  const canRevokeSessions = hasPermission(permissions, "sessions:revoke");
  const canExportSessions = canReadSessions;

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [showFilters, setShowFilters] = useState(true);
  const [statusFilter, setStatusFilter] = useState<SessionStatusFilter>("ALL");
  const [userQuery, setUserQuery] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [startedFrom, setStartedFrom] = useState("");
  const [startedTo, setStartedTo] = useState("");
  const [periodPreset, setPeriodPreset] = useState<SessionPeriodPreset>("CUSTOM");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const usersQuery = useQuery({
    queryKey: ["sessions", "users-options", accessToken],
    queryFn: () => api.users.options(accessToken),
    enabled: Boolean(accessToken && canReadSessions),
  });

  const sessionsQuery = useQuery({
    queryKey: ["sessions-admin", accessToken, page, pageSize, statusFilter, userQuery, userIdFilter, startedFrom, startedTo],
    queryFn: () =>
      api.sessions.listAdmin(accessToken, {
        page,
        size: pageSize,
        status: statusFilter,
        userId: userIdFilter || undefined,
        userQuery: userQuery.trim() || undefined,
        startedFrom: startedFrom || undefined,
        startedTo: startedTo || undefined,
      }),
    enabled: Boolean(accessToken && canReadSessions),
  });

  const detailsQuery = useQuery({
    queryKey: ["sessions-admin", "details", selectedSessionId, accessToken],
    queryFn: () => api.sessions.getAdmin(accessToken, selectedSessionId),
    enabled: Boolean(accessToken) && detailsOpen && Boolean(selectedSessionId),
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => api.sessions.revokeAdmin(accessToken, sessionId),
    onSuccess: async () => {
      await Promise.all([sessionsQuery.refetch(), detailsQuery.refetch()]);
      toast({ variant: "success", title: t.revokeSuccess });
      onLog("SESSION REVOKE OK");
    },
    onError: (error) => {
      toast({ variant: "error", title: t.revokeFailed, description: (error as Error).message });
      onLog(`SESSION REVOKE ERROR: ${(error as Error).message}`);
    },
  });

  const exportMutation = useMutation({
    mutationFn: (format: SessionExportFormat) =>
      api.sessions.exportAdmin(
        accessToken,
        {
          status: statusFilter,
          userId: userIdFilter || undefined,
          userQuery: userQuery.trim() || undefined,
          startedFrom: startedFrom || undefined,
          startedTo: startedTo || undefined,
        },
        format,
      ),
    onSuccess: (payload, format) => {
      triggerDownload(payload.blob, payload.fileName);
      onLog(`EXPORT SESSIONS OK (${format.toUpperCase()})`);
      toast({
        variant: "success",
        title: t.exportSuccess,
        description: payload.fileName,
      });
    },
    onError: (error) => {
      onLog(`EXPORT SESSIONS ERROR: ${(error as Error).message}`);
      toast({
        variant: "error",
        title: t.exportFailed,
        description: (error as Error).message,
      });
    },
  });

  const sessions = sessionsQuery.data?.content ?? [];
  const totalPages = sessionsQuery.data?.totalPages ?? 0;
  const totalElements = sessionsQuery.data?.totalElements ?? 0;

  const userOptions = useMemo(
    () =>
      (usersQuery.data ?? []).map((user) => ({
        value: user.id,
        label: user.displayName,
        keywords: [user.displayName, user.email ?? ""],
        email: user.email,
      })),
    [usersQuery.data],
  );

  const userSelectOptions = useMemo(() => [
    { value: "", label: t.all, keywords: [] },
    ...userOptions,
  ], [userOptions, t.all]);

  const statusOptions = useMemo(() => [
    { value: "ALL", label: t.all, keywords: [] },
    { value: "ACTIVE", label: t.active, keywords: ["active", "actif", "actives"] },
    { value: "REVOKED", label: t.revoked, keywords: ["revoked", "revoquee", "révoquée"] },
    { value: "EXPIRED", label: t.expired, keywords: ["expired", "expire", "expiré"] },
  ], [t]);

  const allSelectedOnPage = sessions.length > 0 && sessions.every((s) => selectedIds.has(s.id));

  const toggleSelectAll = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allSelectedOnPage) {
        sessions.forEach((s) => next.delete(s.id));
      } else {
        sessions.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const openDetails = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setDetailsOpen(true);
  };

  const applyPreset = (preset: Exclude<SessionPeriodPreset, "CUSTOM">) => {
    const range = buildPresetRange(preset);
    setPage(0);
    setPeriodPreset(preset);
    setStartedFrom(range.startedFrom);
    setStartedTo(range.startedTo);
  };

  const currentDetail: SessionResponse | undefined = detailsQuery.data;

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>{t.title}</CardTitle>
            <CardDescription>{t.subtitle}</CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 p-1.5">
            <AppTooltip content={t.filtersToggle}>
              <Button
                variant="ghost"
                size="sm"
                className={`h-9 w-9 rounded-xl text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground ${showFilters ? "bg-background/80 text-foreground" : ""}`}
                onClick={() => setShowFilters((value) => !value)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </AppTooltip>

            <AppTooltip content={t.refresh}>
              <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground" onClick={() => sessionsQuery.refetch()} disabled={sessionsQuery.isFetching}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </AppTooltip>

            <SessionsCriticalActions
              canExportSessions={canExportSessions}
              exportPending={exportMutation.isPending}
              exportXlsxLabel={t.exportXlsx}
              exportCsvLabel={t.exportCsv}
              onExportXlsx={() => exportMutation.mutate("xlsx")}
              onExportCsv={() => exportMutation.mutate("csv")}
            />
          </div>
        </div>

        {showFilters ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{t.presetsLabel}</span>
              {[
                { key: "TODAY" as const, label: t.presetToday },
                { key: "LAST_7_DAYS" as const, label: t.preset7Days },
                { key: "LAST_30_DAYS" as const, label: t.preset30Days },
              ].map((preset) => (
                <Button
                  key={preset.key}
                  variant={periodPreset === preset.key ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => applyPreset(preset.key)}
                >
                  {preset.label}
                </Button>
              ))}
              {periodPreset === "CUSTOM" && (startedFrom || startedTo) ? (
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                  {t.presetCustom}
                </Badge>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t.filterUser}</label>
                <Input
                  placeholder={t.filterUserPlaceholder}
                  value={userQuery}
                  onChange={(event) => {
                    setPage(0);
                    setUserQuery(event.target.value);
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t.filterUserId}</label>
                <SearchableSelect
                  options={userSelectOptions}
                  value={userIdFilter}
                  onValueChange={(value) => {
                    setPage(0);
                    setUserIdFilter(value);
                  }}
                  placeholder={t.all}
                  searchPlaceholder={t.searchUser}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t.filterStatus}</label>
                <SearchableSelect
                  options={statusOptions}
                  value={statusFilter}
                  onValueChange={(value) => {
                    setPage(0);
                    setStatusFilter(value as SessionStatusFilter);
                  }}
                  placeholder={t.all}
                  searchPlaceholder={t.searchStatus}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t.filterFrom}</label>
                <Input
                  type="date"
                  value={startedFrom}
                  onChange={(event) => {
                    setPage(0);
                    setPeriodPreset("CUSTOM");
                    setStartedFrom(event.target.value);
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t.filterTo}</label>
                <Input
                  type="date"
                  value={startedTo}
                  onChange={(event) => {
                    setPage(0);
                    setPeriodPreset("CUSTOM");
                    setStartedTo(event.target.value);
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-xl border border-border/80 bg-background/70 [overflow-clip-margin:visible]">
          <table className="w-full min-w-5xl text-left text-sm">
            <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelectedOnPage}
                    onChange={toggleSelectAll}
                    aria-label={t.selectAll}
                  />
                </th>
                <th className="px-3 py-3">{t.tableUser}</th>
                <th className="px-3 py-3">{t.tableStart}</th>
                <th className="px-3 py-3">{t.tableEnd}</th>
                <th className="px-3 py-3">{t.tableStatus}</th>
                <th className="px-3 py-3">{t.tableIp}</th>
                <th className="px-3 py-3">{t.tableTerminal}</th>
                <th className="px-3 py-3">{t.tableActions}</th>
              </tr>
            </thead>
            <tbody>
              {sessionsQuery.isFetching && sessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                    {t.loading}
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                    {t.noData}
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  const status = session.status || "ACTIVE";
                  const displayUser = session.userDisplayName || session.userEmail || t.unknownUser;
                  const displayTerminal = deriveTerminalLabel(session, locale);

                  return (
                    <tr key={session.id} className={`border-t border-border/60 ${selectedIds.has(session.id) ? "bg-muted/20" : ""}`}>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(session.id)}
                          onChange={() => toggleSelectOne(session.id)}
                          aria-label={`Sélectionner la session ${session.id}`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium">{displayUser}</div>
                        <div className="text-xs text-muted-foreground">{session.userEmail || "-"}</div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{formatDate(session.createdAt, locale)}</td>
                      <td className="px-3 py-3 text-muted-foreground">{formatDate(session.endedAt, locale)}</td>
                      <td className="px-3 py-3">
                        <Badge variant="outline" className={`h-7 gap-1.5 rounded-full px-3 py-0 text-[12px] font-medium leading-none ${getStatusClass(status)}`}>
                          <span className={`h-1.75 w-1.75 rounded-full ${getStatusDotClass(status)}`} />
                          {status} {session.isCurrentSession ? `(${t.current})` : ""}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{session.ipAddress || "-"}</td>
                      <td className="px-3 py-3 text-muted-foreground">{displayTerminal}</td>
                      <td className="px-3 py-3">
                        <DropdownMenu
                          triggerTooltip={t.actionsMenu}
                          items={[
                            {
                              label: t.actionView,
                              icon: Eye,
                              onClick: () => openDetails(session.id),
                            },
                            {
                              label: t.actionRevoke,
                              icon: ShieldX,
                              variant: "destructive",
                              onClick: () => revokeSessionMutation.mutate(session.id),
                              disabled: !canRevokeSessions || revokeSessionMutation.isPending || status !== "ACTIVE",
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-border/60 pt-4 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-muted-foreground">
            {selectedIds.size > 0
              ? `${selectedIds.size} ${t.selectedRows}`
              : `${totalElements} ${t.sessionsCountSuffix}`
            }
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{t.rowsPerPage}</span>
            <select
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(0);
              }}
            >
              {[10, 20, 50].map((sizeOption) => (
                <option key={`sessions-page-size-${sizeOption}`} value={sizeOption}>{sizeOption}</option>
              ))}
            </select>

            <span className="mx-1 text-xs text-muted-foreground">
              {t.page} {totalPages === 0 ? 0 : page + 1} / {Math.max(totalPages, 1)}
            </span>

            <Button size="sm" variant="outline" className="h-8 w-8" onClick={() => setPage(0)} disabled={page === 0} aria-label={t.firstPage}>
              «
            </Button>
            <Button size="sm" variant="outline" className="h-8 w-8" onClick={() => setPage((current) => Math.max(current - 1, 0))} disabled={page === 0} aria-label={t.previousPage}>
              ‹
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8"
              onClick={() => setPage((current) => Math.min(current + 1, Math.max(totalPages - 1, 0)))}
              disabled={totalPages === 0 || page >= totalPages - 1}
              aria-label={t.nextPage}
            >
              ›
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8"
              onClick={() => setPage(Math.max(totalPages - 1, 0))}
              disabled={totalPages === 0 || page >= totalPages - 1}
              aria-label={t.lastPage}
            >
              »
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.dialogTitle}</DialogTitle>
            <DialogDescription>{t.dialogDescription}</DialogDescription>
          </DialogHeader>

          {!currentDetail && detailsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">{t.loading}</p>
          ) : !currentDetail ? (
            <p className="text-sm text-destructive">{t.detailsFailed}</p>
          ) : (
            <div className="grid gap-3 text-sm">
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <div className="font-medium">{currentDetail.userDisplayName || t.unknownUser}</div>
                <div className="text-muted-foreground">{currentDetail.userEmail || "-"}</div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{t.detailStart}</p>
                  <p>{formatDate(currentDetail.createdAt, locale)}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{t.detailEnd}</p>
                  <p>{formatDate(currentDetail.endedAt, locale)}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{t.detailIp}</p>
                  <p>{currentDetail.ipAddress || "-"}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{t.detailDevice}</p>
                  <p>{deriveTerminalLabel(currentDetail, locale)}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 p-3 md:col-span-2">
                  <p className="text-xs text-muted-foreground">{t.detailUserAgent}</p>
                  <p className="break-all">{currentDetail.userAgent || "-"}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>{t.close}</Button>
            {currentDetail ? (
              <Button
                variant="destructive"
                onClick={() => revokeSessionMutation.mutate(currentDetail.id)}
                disabled={!canRevokeSessions || revokeSessionMutation.isPending || currentDetail.status !== "ACTIVE"}
              >
                {t.actionRevoke}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
