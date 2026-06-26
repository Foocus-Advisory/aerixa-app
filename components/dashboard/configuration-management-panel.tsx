"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Filter, Power, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/components/ui/toast-provider";

type ConfigurationManagementPanelProps = {
  accessToken: string;
  locale: "fr" | "en";
  onLog?: (entry: string) => void;
};

export function ConfigurationManagementPanel({ accessToken, locale, onLog }: ConfigurationManagementPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const establishmentsQuery = useQuery({
    queryKey: ["config", "establishments", accessToken],
    queryFn: () => api.configuration.establishments.list(accessToken),
    enabled: Boolean(accessToken),
  });

  const filteredEstablishments = useMemo(() => {
    const all = establishmentsQuery.data ?? [];
    const q = searchQuery.trim().toLowerCase();
    return all.filter((item) => {
      const matchesSearch = q.length === 0 || `${item.code} ${item.name} ${item.shortName ?? ""}`.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "ALL" || (item.status ?? "ACTIVE") === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [establishmentsQuery.data, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEstablishments.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pagedEstablishments = filteredEstablishments.slice(safePage * pageSize, safePage * pageSize + pageSize);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [safePage]);

  const allOnPageSelected = pagedEstablishments.length > 0 && pagedEstablishments.every((item) => selectedIds.has(item.id));
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
      if (allOnPageSelected) pagedEstablishments.forEach((item) => next.delete(item.id));
      else pagedEstablishments.forEach((item) => next.add(item.id));
      return next;
    });
  };

  const bulkStatusMutation = useMutation({
    mutationFn: async (status: "ACTIVE" | "INACTIVE") => {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        if (status === "ACTIVE") {
          await api.configuration.establishments.activate(accessToken, id);
        } else {
          await api.configuration.establishments.deactivate(accessToken, id);
        }
      }
    },
    onSuccess: async (_data, status) => {
      await establishmentsQuery.refetch();
      setSelectedIds(new Set());
      onLog?.(`BUSINESS CONFIG ESTABLISHMENTS BULK ${status}: ${selectedIds.size}`);
    },
    onError: (error) => {
      toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (error as Error).message });
    },
  });

  return (
    <div className="grid gap-6">
      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle>{locale === "fr" ? "Configuration metier" : "Business configuration"}</CardTitle>
          <CardDescription>
            {locale === "fr"
              ? "Pilotage des etablissements et consultation de leur configuration metier."
              : "Manage establishments and review their business configuration."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {locale === "fr"
                ? "Consultez les etablissements disponibles, puis ouvrez le detail par onglet."
                : "Browse available establishments, then open detailed tab views."}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className={`h-9 w-9 rounded-xl text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground ${showFilters ? "bg-background/80 text-foreground" : ""}`}
              onClick={() => setShowFilters((current) => !current)}
              aria-label={locale === "fr" ? "Afficher/masquer les filtres" : "Show/hide filters"}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {showFilters ? (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor="establishment-search">
                  {locale === "fr" ? "Recherche" : "Search"}
                </label>
                <Input
                  id="establishment-search"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setPage(0);
                  }}
                  placeholder={locale === "fr" ? "Code, nom, nom court..." : "Code, name, short name..."}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{locale === "fr" ? "Statut" : "Status"}</label>
                <SearchableSelect
                  options={[
                    { value: "ALL", label: locale === "fr" ? "Tous" : "All", keywords: ["all", "tous"] },
                    { value: "ACTIVE", label: "ACTIVE", keywords: ["active"] },
                    { value: "INACTIVE", label: "INACTIVE", keywords: ["inactive"] },
                  ]}
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setPage(0);
                  }}
                  placeholder={locale === "fr" ? "Tous" : "All"}
                  searchPlaceholder={locale === "fr" ? "Rechercher un statut..." : "Search status..."}
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
                  value={`${pageSize}`}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(0);
                  }}
                  placeholder="10"
                  searchPlaceholder={locale === "fr" ? "Rechercher une taille..." : "Search size..."}
                />
              </div>
            </div>
          ) : null}

          {someSelected ? (
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 px-4 py-2.5">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{selectedIds.size}</span> {locale === "fr" ? "sélectionné(s)" : "selected"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg px-3 text-xs"
                  onClick={() => bulkStatusMutation.mutate("ACTIVE")}
                  disabled={bulkStatusMutation.isPending}
                >
                  <Power className="mr-1.5 h-3.5 w-3.5" />
                  {locale === "fr" ? "Activer la sélection" : "Activate selected"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg px-3 text-xs"
                  onClick={() => bulkStatusMutation.mutate("INACTIVE")}
                  disabled={bulkStatusMutation.isPending}
                >
                  <Power className="mr-1.5 h-3.5 w-3.5" />
                  {locale === "fr" ? "Désactiver la sélection" : "Deactivate selected"}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 rounded-lg px-3 text-xs" onClick={() => setSelectedIds(new Set())}>
                  {locale === "fr" ? "Désélectionner" : "Deselect all"}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="max-h-[44vh] overflow-auto rounded-xl border border-border/80 bg-background/70">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAllOnPage}
                      className="h-4 w-4 rounded border-border accent-primary"
                      aria-label="select all"
                    />
                  </th>
                  <th className="px-3 py-3">{locale === "fr" ? "Code" : "Code"}</th>
                  <th className="px-3 py-3">{locale === "fr" ? "Nom" : "Name"}</th>
                  <th className="px-3 py-3">{locale === "fr" ? "Nom court" : "Short name"}</th>
                  <th className="px-3 py-3">{locale === "fr" ? "Statut" : "Status"}</th>
                  <th className="px-3 py-3">{locale === "fr" ? "Action" : "Action"}</th>
                </tr>
              </thead>
              <tbody>
                {establishmentsQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">{locale === "fr" ? "Chargement..." : "Loading..."}</td>
                  </tr>
                ) : pagedEstablishments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">{locale === "fr" ? "Aucun etablissement." : "No establishments."}</td>
                  </tr>
                ) : (
                  pagedEstablishments.map((item) => (
                    <tr key={item.id} className={`border-t border-border/60 ${selectedIds.has(item.id) ? "bg-primary/5" : ""}`}>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelection(item.id)}
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                      </td>
                      <td className="px-3 py-3 font-mono text-xs">{item.code}</td>
                      <td className="px-3 py-3">{item.name}</td>
                      <td className="px-3 py-3 text-muted-foreground">{item.shortName ?? "-"}</td>
                      <td className="px-3 py-3">
                        <Badge variant="outline">{item.status ?? "ACTIVE"}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onLog?.(`BUSINESS CONFIG ESTABLISHMENT OPENED: ${item.code}`);
                            router.push(`/dashboard/establishments/${item.id}`);
                          }}
                        >
                          {locale === "fr" ? "Ouvrir" : "Open"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{filteredEstablishments.length} {locale === "fr" ? "etablissement(s)" : "establishment(s)"}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{locale === "fr" ? `Page ${safePage + 1} / ${totalPages}` : `Page ${safePage + 1} / ${totalPages}`}</p>
              <Button variant="outline" size="sm" onClick={() => setPage(0)} disabled={safePage === 0}>«</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={safePage === 0}>‹</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={safePage >= totalPages - 1}>›</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(totalPages - 1)} disabled={safePage >= totalPages - 1}>»</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
