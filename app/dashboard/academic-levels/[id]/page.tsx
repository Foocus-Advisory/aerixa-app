"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Link2,
  Plus,
  Search,
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
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { isTokenExpired } from "@/lib/jwt-utils";
import type { EntryDiplomaResponse } from "@/lib/types";

const PAGE_SIZE = 10;

function formatDate(value: string, locale: "fr" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function AcademicLevelDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { accessToken, locale, loadTokensFromStorage, setActiveTab } = useDashboardStore();
  const [isHydrated, setIsHydrated] = useState(false);

  // attach dialog
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [selectedDiplomaId, setSelectedDiplomaId] = useState("");

  // view diploma dialog
  const [viewDiploma, setViewDiploma] = useState<EntryDiplomaResponse | null>(null);

  // table filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // table selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // pagination
  const [page, setPage] = useState(0);

  const levelId = useMemo(() => {
    const rawId = params?.id;
    return Array.isArray(rawId) ? rawId[0] : rawId ?? "";
  }, [params]);

  const establishmentId = searchParams?.get("establishmentId") ?? "";

  const { toast } = useToast();

  useEffect(() => {
    loadTokensFromStorage();
    setActiveTab("config-academic-levels");
    setIsHydrated(true);
  }, [loadTokensFromStorage, setActiveTab]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken || isTokenExpired(accessToken)) {
      router.replace("/login?reason=auth_required");
    }
  }, [accessToken, isHydrated, router]);

  const currentUserQuery = useQuery({
    queryKey: ["academic-level-detail", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });

  const levelQuery = useQuery({
    queryKey: ["academic-level", "detail", accessToken, establishmentId, levelId],
    queryFn: () => api.configuration.academicLevels.get(accessToken, levelId, establishmentId),
    enabled: Boolean(accessToken && levelId && establishmentId),
  });

  const attachedQuery = useQuery({
    queryKey: ["academic-level", "entry-diplomas", accessToken, levelId, establishmentId],
    queryFn: () => api.configuration.academicLevels.listEntryDiplomas(accessToken, levelId, establishmentId),
    enabled: Boolean(accessToken && levelId && establishmentId),
  });

  const allDiplomasQuery = useQuery({
    queryKey: ["config", "entry-diplomas", accessToken, establishmentId],
    queryFn: () => api.configuration.entryDiplomas.list(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId && attachDialogOpen),
  });

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);
  const canAttach = hasPermission(permissionSet, "academic_levels:attach_entry_diploma");
  const canDetach = hasPermission(permissionSet, "academic_levels:detach_entry_diploma");

  const attachMutation = useMutation({
    mutationFn: ({ edId }: { edId: string }) =>
      api.configuration.academicLevels.attachEntryDiploma(accessToken, levelId, edId, establishmentId),
    onSuccess: async () => {
      await attachedQuery.refetch();
      await levelQuery.refetch();
      setAttachDialogOpen(false);
      setSelectedDiplomaId("");
      toast({ variant: "success", title: locale === "fr" ? "Diplôme associé" : "Diploma attached" });
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const detachMutation = useMutation({
    mutationFn: (edId: string) =>
      api.configuration.academicLevels.detachEntryDiploma(accessToken, levelId, edId, establishmentId),
    onSuccess: async () => {
      await attachedQuery.refetch();
      await levelQuery.refetch();
      toast({ variant: "success", title: locale === "fr" ? "Diplôme retiré" : "Diploma detached" });
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const bulkDetachMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await api.configuration.academicLevels.detachEntryDiploma(accessToken, levelId, id, establishmentId);
      }
    },
    onSuccess: async () => {
      setSelectedIds(new Set());
      await attachedQuery.refetch();
      await levelQuery.refetch();
      toast({ variant: "success", title: locale === "fr" ? "Diplômes retirés" : "Diplomas detached" });
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const level = levelQuery.data;
  const attachedDiplomas = attachedQuery.data ?? [];
  const attachedIds = useMemo(() => new Set(attachedDiplomas.map((d) => d.id)), [attachedDiplomas]);
  const availableDiplomas = useMemo(
    () => (allDiplomasQuery.data ?? []).filter((d: EntryDiplomaResponse) => !attachedIds.has(d.id)),
    [allDiplomasQuery.data, attachedIds],
  );

  // filtered diplomas
  const filteredDiplomas = useMemo(() => {
    let list = attachedDiplomas;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((d) => d.code.toLowerCase().includes(q) || d.label.toLowerCase().includes(q));
    }
    if (statusFilter === "active") list = list.filter((d) => d.active);
    if (statusFilter === "inactive") list = list.filter((d) => !d.active);
    return list;
  }, [attachedDiplomas, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredDiplomas.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageDiplomas = filteredDiplomas.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [search, statusFilter]);

  // Reset selections when data changes
  useEffect(() => { setSelectedIds(new Set()); }, [attachedQuery.data]);

  const allOnPageSelected = pageDiplomas.length > 0 && pageDiplomas.every((d) => selectedIds.has(d.id));
  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageDiplomas.forEach((d) => next.delete(d.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageDiplomas.forEach((d) => next.add(d.id));
        return next;
      });
    }
  };
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };


  if (!isHydrated || !accessToken || isTokenExpired(accessToken)) {
    return null;
  }

  const hasActiveFilters = search.trim() !== "" || statusFilter !== "all";

  return (
    <div className="admin-typography min-h-screen bg-background text-foreground">
      <AppSidebar />

      <div className="pb-20 md:pb-0 md:pl-22.5">
        <AdminTopBar />

        <main className="w-full space-y-5 px-3 py-4 pb-24 md:space-y-6 md:px-8 md:py-8 md:pb-8">
          <Breadcrumbs
            items={[
              { label: locale === "fr" ? "Configuration" : "Configuration" },
              { label: locale === "fr" ? "Niveaux académiques" : "Academic levels" },
              { label: level?.label ?? (locale === "fr" ? "Détail" : "Detail") },
            ]}
            onNavigate={(_tab, stepsBack) => {
              for (let i = 0; i < stepsBack; i++) router.back();
            }}
          />

          {/* Header card */}
          <Card className="border-border/60 bg-card/70 shadow-sm">
            <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
                  <GraduationCap className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl md:text-3xl">
                    {levelQuery.isLoading ? (locale === "fr" ? "Chargement..." : "Loading...") : (level?.label ?? (locale === "fr" ? "Niveau académique" : "Academic level"))}
                  </CardTitle>
                  <CardDescription>
                    {level ? <span className="font-mono">{level.code}</span> : null}
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
                {level && (
                  <Badge variant={level.active ? "success" : "outline"}>
                    {level.active ? (locale === "fr" ? "Actif" : "Active") : (locale === "fr" ? "Inactif" : "Inactive")}
                  </Badge>
                )}
              </div>
            </CardHeader>
          </Card>

          {levelQuery.isLoading ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-muted-foreground">{locale === "fr" ? "Chargement..." : "Loading..."}</CardContent>
            </Card>
          ) : levelQuery.isError ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-destructive">{locale === "fr" ? "Impossible de charger la fiche." : "Could not load the record."}</CardContent>
            </Card>
          ) : !level ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-muted-foreground">{locale === "fr" ? "Niveau introuvable." : "Level not found."}</CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              {/* Info panel */}
              <Card className="border-border/60 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GraduationCap className="h-4 w-4" />
                    {level.code}
                  </CardTitle>
                  <CardDescription>{level.label}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Rang" : "Rank"}</p>
                    <p className="mt-1 font-mono">{level.rankOrder ?? "—"}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Diplômes associés" : "Attached diplomas"}</p>
                    <p className="mt-1 font-semibold">{level.entryDiplomasCount ?? attachedDiplomas.length}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Créé le" : "Created at"}</p>
                    <p className="mt-1 text-xs">{formatDate(level.createdAt, locale)}</p>
                    {level.createdByLabel && <p className="mt-0.5 text-xs text-muted-foreground">{level.createdByLabel}</p>}
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Modifié le" : "Updated at"}</p>
                    <p className="mt-1 text-xs">{formatDate(level.updatedAt, locale)}</p>
                    {level.updatedByLabel && <p className="mt-0.5 text-xs text-muted-foreground">{level.updatedByLabel}</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Entry diplomas panel */}
              <Card className="border-border/60 bg-card/70">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Link2 className="h-4 w-4" />
                      {locale === "fr" ? "Diplômes d'entrée associés" : "Attached entry diplomas"}
                    </CardTitle>
                    <CardDescription>
                      {locale === "fr" ? "Diplômes requis pour accéder à ce niveau." : "Diplomas required to access this level."}
                    </CardDescription>
                  </div>
                  {canAttach && (
                    <Button size="sm" className="shrink-0" onClick={() => { setSelectedDiplomaId(""); setAttachDialogOpen(true); }} disabled={!establishmentId}>
                      <Plus className="mr-1.5 h-4 w-4" />
                      {locale === "fr" ? "Associer" : "Attach"}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Toolbar: search + status filter */}
                  {attachedDiplomas.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative flex-1 min-w-40">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          className="h-8 rounded-lg pl-8 text-xs"
                          placeholder={locale === "fr" ? "Rechercher..." : "Search..."}
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                          <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-0.5">
                        {(["all", "active", "inactive"] as const).map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setStatusFilter(f)}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${statusFilter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            {f === "all" ? (locale === "fr" ? "Tous" : "All") : f === "active" ? (locale === "fr" ? "Actifs" : "Active") : (locale === "fr" ? "Inactifs" : "Inactive")}
                          </button>
                        ))}
                      </div>
                      {hasActiveFilters && (
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
                          <X className="mr-1 h-3 w-3" />
                          {locale === "fr" ? "Effacer" : "Clear"}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Bulk action bar */}
                  {selectedIds.size > 0 && canDetach && (
                    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
                      <span className="text-xs text-muted-foreground">
                        {selectedIds.size} {locale === "fr" ? "sélectionné(s)" : "selected"}
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="ml-auto h-7 rounded-lg px-2.5 text-xs"
                        onClick={() => bulkDetachMutation.mutate(Array.from(selectedIds))}
                        disabled={bulkDetachMutation.isPending}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        {locale === "fr" ? "Retirer la sélection" : "Detach selected"}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2.5 text-xs" onClick={() => setSelectedIds(new Set())}>
                        {locale === "fr" ? "Désélectionner" : "Deselect all"}
                      </Button>
                    </div>
                  )}

                  {attachedQuery.isLoading ? (
                    <p className="py-4 text-sm text-muted-foreground">{locale === "fr" ? "Chargement..." : "Loading..."}</p>
                  ) : attachedQuery.isError ? (
                    <p className="py-4 text-sm text-destructive">{locale === "fr" ? "Erreur lors du chargement." : "Error loading data."}</p>
                  ) : attachedDiplomas.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 py-10 text-center">
                      <Link2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">
                        {locale === "fr" ? "Aucun diplôme d'entrée associé." : "No entry diplomas attached."}
                      </p>
                      {canAttach && (
                        <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSelectedDiplomaId(""); setAttachDialogOpen(true); }}>
                          <Plus className="mr-1.5 h-4 w-4" />
                          {locale === "fr" ? "Associer un diplôme" : "Attach a diploma"}
                        </Button>
                      )}
                    </div>
                  ) : filteredDiplomas.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        {locale === "fr" ? "Aucun résultat pour ces filtres." : "No results for these filters."}
                      </p>
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
                                  checked={allOnPageSelected}
                                  onChange={toggleSelectAll}
                                  className="h-4 w-4 rounded border-border accent-primary"
                                  aria-label="select all"
                                />
                              </th>
                              <th className="px-3 py-3">Code</th>
                              <th className="px-3 py-3">{locale === "fr" ? "Libellé" : "Label"}</th>
                              <th className="px-3 py-3">{locale === "fr" ? "Rang" : "Rank"}</th>
                              <th className="px-3 py-3">{locale === "fr" ? "Statut" : "Status"}</th>
                              <th className="px-3 py-3">{locale === "fr" ? "Actions" : "Actions"}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageDiplomas.map((diploma) => (
                              <tr
                                key={diploma.id}
                                className={`border-t border-border/50 transition-colors hover:bg-muted/30 ${selectedIds.has(diploma.id) ? "bg-primary/5" : ""}`}
                              >
                                <td className="px-3 py-2.5">
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(diploma.id)}
                                    onChange={() => toggleOne(diploma.id)}
                                    className="h-4 w-4 rounded border-border accent-primary"
                                  />
                                </td>
                                <td className="px-3 py-2.5"><span className="font-mono text-xs">{diploma.code}</span></td>
                                <td className="px-3 py-2.5">{diploma.label}</td>
                                <td className="px-3 py-2.5">
                                  {diploma.rankOrder != null
                                    ? <span className="font-mono text-xs">{diploma.rankOrder}</span>
                                    : <span className="text-muted-foreground">—</span>}
                                </td>
                                <td className="px-3 py-2.5">
                                  <Badge variant={diploma.active ? "success" : "outline"}>
                                    {diploma.active ? (locale === "fr" ? "Actif" : "Active") : (locale === "fr" ? "Inactif" : "Inactive")}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2.5">
                                  <DropdownMenu
                                    triggerTooltip={locale === "fr" ? "Actions" : "Actions"}
                                    items={[
                                      {
                                        label: locale === "fr" ? "Voir le détail" : "View details",
                                        onClick: () => setViewDiploma(diploma),
                                      },
                                      ...(canDetach ? [{
                                        label: locale === "fr" ? "Retirer" : "Detach",
                                        icon: Trash2,
                                        onClick: () => detachMutation.mutate(diploma.id),
                                        disabled: detachMutation.isPending,
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
                      <div className="grid gap-2 md:hidden">
                        {pageDiplomas.map((diploma) => (
                          <div
                            key={diploma.id}
                            className={`rounded-xl border border-border/60 bg-background/70 p-3 ${selectedIds.has(diploma.id) ? "border-primary/40 bg-primary/5" : ""}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(diploma.id)}
                                  onChange={() => toggleOne(diploma.id)}
                                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                                />
                                <div>
                                  <span className="font-mono text-xs text-muted-foreground">{diploma.code}</span>
                                  <p className="mt-0.5 text-sm font-medium">{diploma.label}</p>
                                  {diploma.rankOrder != null && (
                                    <p className="mt-0.5 text-xs text-muted-foreground">{locale === "fr" ? "Rang" : "Rank"}: <span className="font-mono">{diploma.rankOrder}</span></p>
                                  )}
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <Badge variant={diploma.active ? "success" : "outline"} className="text-xs">
                                  {diploma.active ? (locale === "fr" ? "Actif" : "Active") : (locale === "fr" ? "Inactif" : "Inactive")}
                                </Badge>
                                <DropdownMenu
                                  triggerTooltip={locale === "fr" ? "Actions" : "Actions"}
                                  items={[
                                    {
                                      label: locale === "fr" ? "Voir le détail" : "View details",
                                      onClick: () => setViewDiploma(diploma),
                                    },
                                    ...(canDetach ? [{
                                      label: locale === "fr" ? "Retirer" : "Detach",
                                      icon: Trash2,
                                      onClick: () => detachMutation.mutate(diploma.id),
                                      disabled: detachMutation.isPending,
                                      variant: "destructive" as const,
                                    }] : []),
                                  ]}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">
                            {filteredDiplomas.length} {locale === "fr" ? "résultat(s)" : "result(s)"}
                            {" — "}
                            {locale === "fr" ? `Page ${safePage + 1} / ${totalPages}` : `Page ${safePage + 1} of ${totalPages}`}
                          </p>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" className="h-8 w-8 rounded-lg p-0" onClick={() => setPage(0)} disabled={safePage === 0}>«</Button>
                            <Button variant="outline" size="sm" className="h-8 w-8 rounded-lg p-0" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}>
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 w-8 rounded-lg p-0" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 w-8 rounded-lg p-0" onClick={() => setPage(totalPages - 1)} disabled={safePage >= totalPages - 1}>»</Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Attach dialog */}
      <Dialog open={attachDialogOpen} onOpenChange={(open) => { if (!open) { setAttachDialogOpen(false); setSelectedDiplomaId(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{locale === "fr" ? "Associer un diplôme d'entrée" : "Attach entry diploma"}</DialogTitle>
            <DialogDescription>
              {level && <span className="mt-1 block font-mono font-medium text-foreground">{level.code} — {level.label}</span>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium">{locale === "fr" ? "Diplôme d'entrée" : "Entry diploma"}</label>
            <SearchableSelect
              options={availableDiplomas.map((ed: EntryDiplomaResponse) => ({
                value: ed.id,
                label: `${ed.code} — ${ed.label}`,
                keywords: [ed.code, ed.label],
              }))}
              value={selectedDiplomaId}
              onValueChange={setSelectedDiplomaId}
              placeholder={locale === "fr" ? "Sélectionner un diplôme" : "Select a diploma"}
              searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
            />
            {availableDiplomas.length === 0 && !allDiplomasQuery.isLoading && (
              <p className="text-xs text-muted-foreground">
                {locale === "fr" ? "Tous les diplômes de cet établissement sont déjà associés." : "All diplomas for this establishment are already attached."}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAttachDialogOpen(false); setSelectedDiplomaId(""); }} disabled={attachMutation.isPending}>
              {locale === "fr" ? "Annuler" : "Cancel"}
            </Button>
            <Button
              onClick={() => { if (selectedDiplomaId) attachMutation.mutate({ edId: selectedDiplomaId }); }}
              disabled={!selectedDiplomaId || attachMutation.isPending}
            >
              {attachMutation.isPending
                ? (locale === "fr" ? "Association..." : "Attaching...")
                : (locale === "fr" ? "Associer" : "Attach")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View diploma dialog */}
      <Dialog open={Boolean(viewDiploma)} onOpenChange={(open) => { if (!open) setViewDiploma(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{locale === "fr" ? "Détail du diplôme" : "Diploma details"}</DialogTitle>
            {viewDiploma && (
              <DialogDescription>
                <span className="font-mono font-medium text-foreground">{viewDiploma.code}</span>
              </DialogDescription>
            )}
          </DialogHeader>
          {viewDiploma && (
            <div className="space-y-2 text-sm">
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{locale === "fr" ? "Libellé" : "Label"}</p>
                <p className="mt-0.5 font-medium">{viewDiploma.label}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{locale === "fr" ? "Rang" : "Rank"}</p>
                  <p className="mt-0.5 font-mono">{viewDiploma.rankOrder ?? "—"}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{locale === "fr" ? "Statut" : "Status"}</p>
                  <div className="mt-0.5">
                    <Badge variant={viewDiploma.active ? "success" : "outline"}>
                      {viewDiploma.active ? (locale === "fr" ? "Actif" : "Active") : (locale === "fr" ? "Inactif" : "Inactive")}
                    </Badge>
                  </div>
                </div>
              </div>
              {viewDiploma.createdByLabel && (
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{locale === "fr" ? "Créé par" : "Created by"}</p>
                  <p className="mt-0.5">{viewDiploma.createdByLabel}</p>
                </div>
              )}
              {viewDiploma.updatedByLabel && (
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{locale === "fr" ? "Modifié par" : "Updated by"}</p>
                  <p className="mt-0.5">{viewDiploma.updatedByLabel}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDiploma(null)}>{locale === "fr" ? "Fermer" : "Close"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
