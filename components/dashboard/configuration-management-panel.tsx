"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ConfigurationManagementPanelProps = {
  accessToken: string;
  locale: "fr" | "en";
  onLog?: (entry: string) => void;
};

export function ConfigurationManagementPanel({ accessToken, locale, onLog }: ConfigurationManagementPanelProps) {
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [detailsTab, setDetailsTab] = useState<"stats" | "catalog">("stats");

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

  const effectiveEstablishmentId = selectedEstablishmentId || pagedEstablishments[0]?.id || filteredEstablishments[0]?.id || "";

  const selectedEstablishment = useMemo(
    () => (establishmentsQuery.data ?? []).find((item) => item.id === effectiveEstablishmentId),
    [establishmentsQuery.data, effectiveEstablishmentId],
  );

  const canLoadScopedData = Boolean(accessToken && effectiveEstablishmentId);

  const entryDiplomasQuery = useQuery({
    queryKey: ["config", "entry-diplomas", accessToken, effectiveEstablishmentId],
    queryFn: () => api.configuration.entryDiplomas.list(accessToken, effectiveEstablishmentId),
    enabled: canLoadScopedData,
  });

  const academicLevelsQuery = useQuery({
    queryKey: ["config", "academic-levels", accessToken, effectiveEstablishmentId],
    queryFn: () => api.configuration.academicLevels.list(accessToken, effectiveEstablishmentId),
    enabled: canLoadScopedData,
  });

  const programTracksQuery = useQuery({
    queryKey: ["config", "program-tracks", accessToken, effectiveEstablishmentId],
    queryFn: () => api.configuration.programTracks.list(accessToken, effectiveEstablishmentId),
    enabled: canLoadScopedData,
  });

  const programTrackLevelsQuery = useQuery({
    queryKey: ["config", "program-track-levels", accessToken, effectiveEstablishmentId],
    queryFn: () => api.configuration.programTrackLevels.list(accessToken, effectiveEstablishmentId),
    enabled: canLoadScopedData,
  });

  const acquisitionChannelsQuery = useQuery({
    queryKey: ["config", "acquisition-channels", accessToken, effectiveEstablishmentId],
    queryFn: () => api.configuration.acquisitionChannels.list(accessToken, effectiveEstablishmentId),
    enabled: canLoadScopedData,
  });

  const funnelStagesQuery = useQuery({
    queryKey: ["config", "funnel-stages", accessToken, effectiveEstablishmentId],
    queryFn: () => api.configuration.funnelStages.list(accessToken, effectiveEstablishmentId),
    enabled: canLoadScopedData,
  });

  const counters = [
    {
      labelFr: "Etablissements",
      labelEn: "Establishments",
      value: establishmentsQuery.data?.length ?? 0,
      isError: establishmentsQuery.isError,
    },
    {
      labelFr: "Diplomes d'entree",
      labelEn: "Entry diplomas",
      value: entryDiplomasQuery.data?.length ?? 0,
      isError: entryDiplomasQuery.isError,
    },
    {
      labelFr: "Niveaux academiques",
      labelEn: "Academic levels",
      value: academicLevelsQuery.data?.length ?? 0,
      isError: academicLevelsQuery.isError,
    },
    {
      labelFr: "Filieres",
      labelEn: "Program tracks",
      value: programTracksQuery.data?.length ?? 0,
      isError: programTracksQuery.isError,
    },
    {
      labelFr: "Filiere x niveau",
      labelEn: "Track x level",
      value: programTrackLevelsQuery.data?.length ?? 0,
      isError: programTrackLevelsQuery.isError,
    },
    {
      labelFr: "Canaux d'acquisition",
      labelEn: "Acquisition channels",
      value: acquisitionChannelsQuery.data?.length ?? 0,
      isError: acquisitionChannelsQuery.isError,
    },
    {
      labelFr: "Etapes de funnel",
      labelEn: "Funnel stages",
      value: funnelStagesQuery.data?.length ?? 0,
      isError: funnelStagesQuery.isError,
    },
  ];

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

          <div className="max-h-[44vh] overflow-auto rounded-xl border border-border/80 bg-background/70">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
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
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">{locale === "fr" ? "Chargement..." : "Loading..."}</td>
                  </tr>
                ) : pagedEstablishments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">{locale === "fr" ? "Aucun etablissement." : "No establishments."}</td>
                  </tr>
                ) : (
                  pagedEstablishments.map((item) => (
                    <tr key={item.id} className={`border-t border-border/60 ${effectiveEstablishmentId === item.id ? "bg-muted/40" : ""}`}>
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
                            setSelectedEstablishmentId(item.id);
                            onLog?.(`BUSINESS CONFIG ESTABLISHMENT SELECTED: ${item.code}`);
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

      {effectiveEstablishmentId ? (
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle>
              {locale === "fr" ? "Detail de l'etablissement" : "Establishment details"}
              {selectedEstablishment ? ` - ${selectedEstablishment.code}` : ""}
            </CardTitle>
            <CardDescription>
              {locale === "fr" ? "Vue compartimentee avec onglets." : "Compartmented view with tabs."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Tabs value={detailsTab} onValueChange={(value) => setDetailsTab(value as "stats" | "catalog")}>
              <TabsList className="w-full md:w-auto">
                <TabsTrigger value="stats">{locale === "fr" ? "Statistiques" : "Statistics"}</TabsTrigger>
                <TabsTrigger value="catalog">{locale === "fr" ? "Catalogue preview" : "Catalog preview"}</TabsTrigger>
              </TabsList>
            </Tabs>

            {detailsTab === "stats" ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {counters.map((counter) => (
                  <div key={counter.labelEn} className="rounded-xl border border-border/70 bg-background/80 p-3">
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? counter.labelFr : counter.labelEn}</p>
                    <p className="mt-1 text-2xl font-semibold">{counter.value}</p>
                    {counter.isError ? <Badge variant="destructive">{locale === "fr" ? "Erreur" : "Error"}</Badge> : null}
                  </div>
                ))}
              </div>
            ) : null}

            {detailsTab === "catalog" ? (
              <div className="grid gap-4 text-sm md:grid-cols-2">
                <div className="space-y-2">
                  <p className="font-medium">{locale === "fr" ? "Diplomes d'entree" : "Entry diplomas"}</p>
                  {(entryDiplomasQuery.data ?? []).slice(0, 6).map((item) => (
                    <div key={item.id} className="rounded-md border border-border/60 bg-background/70 px-3 py-2">
                      {item.code} - {item.label}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="font-medium">{locale === "fr" ? "Niveaux academiques" : "Academic levels"}</p>
                  {(academicLevelsQuery.data ?? []).slice(0, 6).map((item) => (
                    <div key={item.id} className="rounded-md border border-border/60 bg-background/70 px-3 py-2">
                      {item.code} - {item.label}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="font-medium">{locale === "fr" ? "Filieres" : "Program tracks"}</p>
                  {(programTracksQuery.data ?? []).slice(0, 6).map((item) => (
                    <div key={item.id} className="rounded-md border border-border/60 bg-background/70 px-3 py-2">
                      {item.code} - {item.name}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="font-medium">{locale === "fr" ? "Canaux d'acquisition" : "Acquisition channels"}</p>
                  {(acquisitionChannelsQuery.data ?? []).slice(0, 6).map((item) => (
                    <div key={item.id} className="rounded-md border border-border/60 bg-background/70 px-3 py-2">
                      {item.code} - {item.name}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

    </div>
  );
}
