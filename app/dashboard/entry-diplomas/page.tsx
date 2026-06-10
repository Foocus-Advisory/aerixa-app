"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  Award,
  Download,
  Eye,
  FileDown,
  Filter,
  Pencil,
  Plus,
  Power,
  RefreshCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useDashboardStore } from "@/store/dashboard-store";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buildPermissionSet, hasPermission } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { AdminTopBar } from "@/components/dashboard/admin-top-bar";
import { AppTooltip } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { isTokenExpired } from "@/lib/jwt-utils";
import type {
  CreateEntryDiplomaRequest,
  EntryDiplomaImportResultResponse,
  EntryDiplomaResponse,
  UpdateEntryDiplomaRequest,
} from "@/lib/types";

type EntryDiplomaFormState = {
  label: string;
  rankOrder: string;
};

const EMPTY_FORM: EntryDiplomaFormState = { label: "", rankOrder: "" };

type EntryDiplomaImportFieldKey = "code" | "label" | "rankOrder" | "active";
const IMPORT_FIELD_ORDER: EntryDiplomaImportFieldKey[] = ["code", "label", "rankOrder", "active"];
const IMPORT_FIELD_META: Record<EntryDiplomaImportFieldKey, { required: boolean; label: string }> = {
  code: { required: false, label: "Code" },
  label: { required: true, label: "Libellé / Label" },
  rankOrder: { required: false, label: "Rang / Rank" },
  active: { required: false, label: "Actif / Active" },
};

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildDefaultMapping(headers: string[]): Record<EntryDiplomaImportFieldKey, string> {
  const normalized = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const aliases: Record<EntryDiplomaImportFieldKey, string[]> = {
    code: ["code"],
    label: ["label", "libelle", "libell", "nom", "name"],
    rankOrder: ["rankorder", "rank", "ordre", "order", "rang"],
    active: ["active", "actif", "enabled", "status", "statut"],
  };
  const mapping: Record<EntryDiplomaImportFieldKey, string> = { code: "", label: "", rankOrder: "", active: "" };
  IMPORT_FIELD_ORDER.forEach((field) => {
    const idx = normalized.findIndex((h) => aliases[field].includes(h));
    if (idx >= 0) mapping[field] = String(idx);
  });
  return mapping;
}

function buildMappedFile(
  rows: string[][],
  mapping: Record<EntryDiplomaImportFieldKey, string>,
): File {
  const outputRows: string[][] = [IMPORT_FIELD_ORDER];
  for (const row of rows) {
    outputRows.push(
      IMPORT_FIELD_ORDER.map((k) => {
        const idx = mapping[k];
        return idx !== "" ? (row[Number(idx)] ?? "") : "";
      }),
    );
  }
  const ws = XLSX.utils.aoa_to_sheet(outputRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new File([buf], "entry-diplomas-import.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

const EMPTY_MAPPING: Record<EntryDiplomaImportFieldKey, string> = { code: "", label: "", rankOrder: "", active: "" };

export default function EntryDiplomasPage() {
  const router = useRouter();
  const { accessToken, locale, loadTokensFromStorage, setActiveTab } = useDashboardStore();
  const [isHydrated, setIsHydrated] = useState(false);

  const [selectedEstId, setSelectedEstId] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "view">("create");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formState, setFormState] = useState<EntryDiplomaFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [focusedItem, setFocusedItem] = useState<EntryDiplomaResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EntryDiplomaResponse | null>(null);
  const [deleteMode, setDeleteMode] = useState<"soft" | "hard">("soft");

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<EntryDiplomaImportFieldKey, string>>(EMPTY_MAPPING);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importDragOver, setImportDragOver] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    loadTokensFromStorage();
    setActiveTab("config-entry-diplomas");
    setIsHydrated(true);
  }, [loadTokensFromStorage, setActiveTab]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken || isTokenExpired(accessToken)) {
      router.replace("/login?reason=auth_required");
    }
  }, [accessToken, isHydrated, router]);

  const currentUserQuery = useQuery({
    queryKey: ["entry-diplomas", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });

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
    queryKey: ["config", "entry-diplomas", accessToken, effectiveEstId],
    queryFn: () => api.configuration.entryDiplomas.list(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId),
  });

  const items = useMemo(() => query.data ?? [], [query.data]);

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);
  const canCreate = hasPermission(permissionSet, "entry_diplomas:create");
  const canUpdate = hasPermission(permissionSet, "entry_diplomas:update");
  const canDelete = hasPermission(permissionSet, "entry_diplomas:delete");
  const canHardDelete = hasPermission(permissionSet, "entry_diplomas:hard_delete");
  const canExport = hasPermission(permissionSet, "entry_diplomas:export");
  const canImport = hasPermission(permissionSet, "entry_diplomas:import");
  const canToggleStatus =
    hasPermission(permissionSet, "entry_diplomas:activate") ||
    hasPermission(permissionSet, "entry_diplomas:deactivate");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = statusFilter === "ALL" || (item.active ? "ACTIVE" : "INACTIVE") === statusFilter;
      const matchesSearch = q.length === 0 || `${item.code} ${item.label}`.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [items, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize],
  );

  useEffect(() => {
    const maxPage = Math.max(totalPages - 1, 0);
    if (page > maxPage) setPage(maxPage);
  }, [page, totalPages]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [effectiveEstId, page]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateEntryDiplomaRequest) => api.configuration.entryDiplomas.create(accessToken, payload),
    onSuccess: async () => { await query.refetch(); setDialogOpen(false); setFormError(null); },
    onError: (err) => setFormError((err as Error).message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEntryDiplomaRequest }) =>
      api.configuration.entryDiplomas.update(accessToken, id, effectiveEstId, payload),
    onSuccess: async () => { await query.refetch(); setDialogOpen(false); setFormError(null); },
    onError: (err) => setFormError((err as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.configuration.entryDiplomas.delete(accessToken, id, effectiveEstId),
    onSuccess: async () => { await query.refetch(); setDeleteTarget(null); setDeleteMode("soft"); },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => api.configuration.entryDiplomas.hardDelete(accessToken, id, effectiveEstId),
    onSuccess: async () => { await query.refetch(); setDeleteTarget(null); setDeleteMode("soft"); },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.configuration.entryDiplomas.activate(accessToken, id, effectiveEstId),
    onSuccess: () => query.refetch(),
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.configuration.entryDiplomas.deactivate(accessToken, id, effectiveEstId),
    onSuccess: () => query.refetch(),
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const exportMutation = useMutation({
    mutationFn: () => api.configuration.entryDiplomas.exportExcel(accessToken, effectiveEstId),
    onSuccess: (payload) => {
      triggerDownload(payload.blob, payload.fileName || "entry-diplomas-export.xlsx");
      toast({ variant: "success", title: locale === "fr" ? "Export réussi" : "Export successful" });
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur d'export" : "Export failed", description: (err as Error).message }),
  });

  const templateMutation = useMutation({
    mutationFn: () => api.configuration.entryDiplomas.importTemplate(accessToken),
    onSuccess: (payload) => {
      triggerDownload(payload.blob, payload.fileName || "entry-diplomas-import-template.xlsx");
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => api.configuration.entryDiplomas.importExcel(accessToken, effectiveEstId, file),
    onSuccess: async (result: EntryDiplomaImportResultResponse) => {
      await query.refetch();
      setImportErrors(result.errors ?? []);
      toast({
        variant: result.failed > 0 ? "error" : "success",
        title: result.failed > 0
          ? (locale === "fr" ? "Import terminé avec des erreurs" : "Import completed with errors")
          : (locale === "fr" ? "Import terminé" : "Import complete"),
        description: result.failed > 0
          ? (locale === "fr"
              ? `${result.created}/${result.totalRows} ligne(s) importée(s), ${result.failed} échec(s). Voir le détail dans la fenêtre d'import.`
              : `${result.created}/${result.totalRows} row(s) imported, ${result.failed} failed. See details in the import dialog.`)
          : (locale === "fr" ? `${result.created} ligne(s) importée(s) avec succès.` : `${result.created} row(s) imported successfully.`),
        duration: result.failed > 0 ? 10000 : 6000,
      });
      if (result.failed === 0) {
        setImportDialogOpen(false);
        setImportFileName("");
        setImportHeaders([]);
        setImportRows([]);
      }
    },
    onError: (err) => {
      const apiErr = err as ApiError;
      setImportErrors([]);
      toast({
        variant: "error",
        title: locale === "fr" ? "Erreur d'import" : "Import failed",
        description: apiErr.message
          ? `${apiErr.message}${apiErr.errorCode ? ` (${apiErr.errorCode})` : ""}`
          : (locale === "fr" ? "Une erreur inconnue est survenue." : "An unknown error occurred."),
        duration: 10000,
      });
    },
  });

  const parseImportFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error(locale === "fr" ? "Aucune feuille trouvée" : "No sheet found");
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1, defval: "", blankrows: false });
    if (rows.length < 1) throw new Error(locale === "fr" ? "Fichier vide" : "Empty file");
    const headers = (rows[0] as (string | number | null)[]).map((c) => `${c ?? ""}`.trim()).filter((h) => h.length > 0);
    const dataRows = rows.slice(1).map((line) => (line as (string | number | null)[]).map((c) => `${c ?? ""}`.trim())).filter((l) => l.some((c) => c.length > 0));
    setImportFileName(file.name);
    setImportHeaders(headers);
    setImportRows(dataRows);
    setColumnMapping(buildDefaultMapping(headers));
    setImportErrors([]);
  };

  const submitMappedImport = () => {
    const missingRequired = IMPORT_FIELD_ORDER.filter((k) => IMPORT_FIELD_META[k].required && !columnMapping[k]);
    if (missingRequired.length > 0) {
      toast({ variant: "error", title: locale === "fr" ? "Champs requis manquants" : "Missing required fields", description: missingRequired.map((k) => IMPORT_FIELD_META[k].label).join(", ") });
      return;
    }
    const file = buildMappedFile(importRows, columnMapping);
    importMutation.mutate(file);
  };

  const openCreateDialog = () => {
    setFormState(EMPTY_FORM);
    setFormError(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const openEditDialog = (item: EntryDiplomaResponse) => {
    setFocusedItem(item);
    setFormState({ label: item.label, rankOrder: item.rankOrder != null ? String(item.rankOrder) : "" });
    setFormError(null);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const openViewDialog = (item: EntryDiplomaResponse) => {
    setFocusedItem(item);
    setDialogMode("view");
    setDialogOpen(true);
  };

  const submitDialog = () => {
    if (!formState.label.trim()) {
      setFormError(locale === "fr" ? "Le libellé est obligatoire." : "Label is required.");
      return;
    }
    const rankOrder = formState.rankOrder.trim() !== "" ? Number(formState.rankOrder) : undefined;
    if (rankOrder !== undefined && (Number.isNaN(rankOrder) || rankOrder < 0)) {
      setFormError(locale === "fr" ? "Le rang doit être un entier positif." : "Rank must be a positive integer.");
      return;
    }
    if (dialogMode === "create") {
      createMutation.mutate({ establishmentId: effectiveEstId, label: formState.label.trim(), rankOrder });
    } else {
      updateMutation.mutate({ id: focusedItem!.id, payload: { label: formState.label.trim(), rankOrder } });
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
    title: locale === "fr" ? "Diplômes d'entrée" : "Entry diplomas",
    subtitle: locale === "fr" ? "Gérez les diplômes requis pour candidater par établissement." : "Manage entry diplomas required to apply, per establishment.",
    add: locale === "fr" ? "Ajouter" : "Add",
    refresh: locale === "fr" ? "Actualiser" : "Refresh",
    filtersTooltip: locale === "fr" ? "Afficher/masquer les filtres" : "Show/hide filters",
    searchPlaceholder: locale === "fr" ? "Code, libellé..." : "Code, label...",
    all: locale === "fr" ? "Tous" : "All",
    active: locale === "fr" ? "Actif" : "Active",
    inactive: locale === "fr" ? "Inactif" : "Inactive",
    colCode: "Code",
    colLabel: locale === "fr" ? "Libellé" : "Label",
    colRank: locale === "fr" ? "Rang" : "Rank",
    colStatus: locale === "fr" ? "Statut" : "Status",
    colCreatedBy: locale === "fr" ? "Créé par" : "Created by",
    colActions: locale === "fr" ? "Actions" : "Actions",
    noData: locale === "fr" ? "Aucun diplôme d'entrée." : "No entry diplomas.",
    loadError: locale === "fr" ? "Erreur lors du chargement." : "Error loading data.",
    createTitle: locale === "fr" ? "Nouveau diplôme d'entrée" : "New entry diploma",
    editTitle: locale === "fr" ? "Modifier le diplôme" : "Edit entry diploma",
    viewTitle: locale === "fr" ? "Détail du diplôme" : "Entry diploma details",
    fieldLabel: locale === "fr" ? "Libellé" : "Label",
    fieldRank: locale === "fr" ? "Rang" : "Rank",
    cancel: locale === "fr" ? "Annuler" : "Cancel",
    save: locale === "fr" ? "Enregistrer" : "Save",
    saving: locale === "fr" ? "Enregistrement..." : "Saving...",
    deleteTitle: locale === "fr" ? "Supprimer ce diplôme ?" : "Delete this entry diploma?",
    deleteConfirm: locale === "fr" ? "Supprimer" : "Delete",
    deleting: locale === "fr" ? "Suppression..." : "Deleting...",
    tooltipView: locale === "fr" ? "Consulter" : "View",
    tooltipEdit: locale === "fr" ? "Modifier" : "Edit",
    tooltipDelete: locale === "fr" ? "Supprimer" : "Delete",
    tooltipActivate: locale === "fr" ? "Activer" : "Activate",
    tooltipDeactivate: locale === "fr" ? "Désactiver" : "Deactivate",
    createdAt: locale === "fr" ? "Créé le" : "Created at",
    updatedAt: locale === "fr" ? "Modifié le" : "Updated at",
    count: (n: number) => locale === "fr" ? `${n} diplôme(s)` : `${n} diploma(s)`,
    pageLabel: (current: number, total: number) => `Page ${current} / ${total}`,
  };

  if (!isHydrated || !accessToken || isTokenExpired(accessToken)) {
    return null;
  }

  return (
    <div className="admin-typography min-h-screen bg-background text-foreground">
      <AppSidebar />

      <div className="pb-20 md:pb-0 md:pl-22.5">
        <AdminTopBar />

        <main className="w-full space-y-5 px-3 py-4 pb-24 md:space-y-6 md:px-8 md:py-8 md:pb-8">
          <Breadcrumbs
            items={[
              { label: locale === "fr" ? "Configuration" : "Configuration" },
              { label: t.title },
            ]}
          />
          <div className="grid gap-6">
            {/* Section presentation card */}
            <Card className="border-border/60 bg-card/70 shadow-sm">
              <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-2xl md:text-3xl">
                    {locale === "fr" ? "Dashboard Admin AERIXA" : "AERIXA Admin Dashboard"}
                  </CardTitle>
                  <CardDescription>
                    {locale === "fr" ? "Pilotage Auth, Utilisateurs, Sessions et RBAC" : "Auth, Users, Sessions and RBAC control center"}
                  </CardDescription>
                </div>
                <Badge className="w-fit" variant="outline">
                  <Award className="h-3.5 w-3.5" />
                  {locale === "fr" ? "Section : Diplômes d'entrée" : "Section: Entry diplomas"}
                </Badge>
              </CardHeader>
            </Card>

            {/* Table card */}
            <Card className="border-border/60 bg-card/70">
              <CardHeader className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
                      <Award className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle>{t.title}</CardTitle>
                      <CardDescription>{t.subtitle}</CardDescription>
                    </div>
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
                    <AppTooltip content={locale === "fr" ? "Télécharger le template" : "Download template"}>
                      <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground" onClick={() => templateMutation.mutate()} disabled={templateMutation.isPending}>
                        <FileDown className="h-4 w-4" />
                      </Button>
                    </AppTooltip>
                    {canExport && (
                      <AppTooltip content={locale === "fr" ? "Exporter en Excel" : "Export to Excel"}>
                        <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending || !effectiveEstId}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </AppTooltip>
                    )}
                    {canImport && (
                      <AppTooltip content={locale === "fr" ? "Importer depuis Excel" : "Import from Excel"}>
                        <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground" onClick={() => setImportDialogOpen(true)} disabled={!effectiveEstId}>
                          <Upload className="h-4 w-4" />
                        </Button>
                      </AppTooltip>
                    )}
                    {canCreate && (
                      <Button size="sm" className="h-9 rounded-xl px-3" onClick={openCreateDialog} disabled={!effectiveEstId}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        {t.add}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{locale === "fr" ? "Total" : "Total"}</p>
                    <p className="mt-2 text-2xl font-semibold">{items.length}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{locale === "fr" ? "Actifs" : "Active"}</p>
                    <p className="mt-2 text-2xl font-semibold">{items.filter((x) => x.active).length}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{locale === "fr" ? "Inactifs" : "Inactive"}</p>
                    <p className="mt-2 text-2xl font-semibold">{items.filter((x) => !x.active).length}</p>
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
                    onValueChange={(v) => { setSelectedEstId(v); setPage(0); }}
                    placeholder={locale === "fr" ? "Sélectionner un établissement" : "Select an establishment"}
                    searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                  />
                  {establishmentsQuery.isError && (
                    <p className="text-xs text-destructive">{locale === "fr" ? "Impossible de charger les établissements." : "Could not load establishments."}</p>
                  )}
                </div>

                {showFilters && (
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">{locale === "fr" ? "Recherche" : "Search"}</label>
                      <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder={t.searchPlaceholder} />
                    </div>
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

                {someSelected && (
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

                <div className="overflow-auto rounded-xl border border-border/80 bg-background/70">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="w-10 px-3 py-3">
                          <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAllOnPage} className="h-4 w-4 rounded border-border accent-primary" aria-label="select all" />
                        </th>
                        <th className="px-3 py-3">{t.colCode}</th>
                        <th className="px-3 py-3">{t.colLabel}</th>
                        <th className="px-3 py-3">{t.colRank}</th>
                        <th className="hidden px-3 py-3 lg:table-cell">{t.colCreatedBy}</th>
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
                          <td className="px-3 py-2.5"><span className="font-mono text-xs">{item.code}</span></td>
                          <td className="px-3 py-2.5">{item.label}</td>
                          <td className="px-3 py-2.5">
                            {item.rankOrder != null
                              ? <span className="font-mono text-xs">{item.rankOrder}</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="hidden px-3 py-2.5 lg:table-cell">
                            <span className="text-xs text-muted-foreground">{item.createdByLabel ?? "—"}</span>
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
                                  onClick: () => openViewDialog(item),
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
          </div>
        </main>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen && (dialogMode === "create" || dialogMode === "edit")} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? t.createTitle : t.editTitle}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? (locale === "fr" ? "Le code sera généré automatiquement à partir du libellé." : "The code will be auto-generated from the label.")
                : (locale === "fr" ? "Modifiez les informations du diplôme." : "Update the entry diploma details.")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {dialogMode === "edit" && focusedItem && (
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">Code</p>
                <p className="mt-0.5 font-mono text-sm font-medium">{focusedItem.code}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.fieldLabel} *</label>
              <Input
                value={formState.label}
                onChange={(e) => setFormState((s) => ({ ...s, label: e.target.value }))}
                placeholder={locale === "fr" ? "Baccalauréat, BTS, Licence..." : "High school diploma, BTS, Bachelor..."}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.fieldRank}</label>
              <Input
                type="number"
                min={0}
                value={formState.rankOrder}
                onChange={(e) => setFormState((s) => ({ ...s, rankOrder: e.target.value }))}
                placeholder="1, 2, 3..."
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

      {/* View dialog */}
      <Dialog open={dialogOpen && dialogMode === "view"} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.viewTitle}</DialogTitle>
            <DialogDescription>{locale === "fr" ? "Informations complètes du diplôme d'entrée." : "Full entry diploma details."}</DialogDescription>
          </DialogHeader>
          {focusedItem && (
            <div className="grid gap-3 text-sm">
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">Code</p>
                <p className="mt-1 font-mono font-medium">{focusedItem.code}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">{t.fieldLabel}</p>
                <p className="mt-1">{focusedItem.label}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{t.colRank}</p>
                  <p className="mt-1 font-mono">{focusedItem.rankOrder ?? "—"}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{t.colStatus}</p>
                  <div className="mt-1"><Badge variant={focusedItem.active ? "success" : "outline"}>{focusedItem.active ? t.active : t.inactive}</Badge></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{t.createdAt}</p>
                  <p className="mt-1 text-xs">{new Date(focusedItem.createdAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}</p>
                  {focusedItem.createdByLabel && <p className="mt-0.5 text-xs text-muted-foreground">{focusedItem.createdByLabel}</p>}
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{t.updatedAt}</p>
                  <p className="mt-1 text-xs">{new Date(focusedItem.updatedAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}</p>
                  {focusedItem.updatedByLabel && <p className="mt-0.5 text-xs text-muted-foreground">{focusedItem.updatedByLabel}</p>}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.cancel}</Button>
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
                <span className="mt-1 block font-mono font-medium text-foreground">{deleteTarget.code} — {deleteTarget.label}</span>
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
              : (locale === "fr" ? "Le diplôme sera archivé et masqué (suppression logique)." : "The diploma will be archived and hidden (soft delete).")}
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

      {/* Import dialog */}
      <Dialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setImportDialogOpen(false);
            setImportFileName("");
            setImportHeaders([]);
            setImportRows([]);
            setColumnMapping(EMPTY_MAPPING);
            setImportErrors([]);
          }
        }}
      >
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{locale === "fr" ? "Importer des diplômes d'entrée" : "Import entry diplomas"}</DialogTitle>
            <DialogDescription>
              {locale === "fr" ? "Chargez un fichier Excel et mappez les colonnes aux champs du diplôme." : "Upload an Excel file and map the columns to entry diploma fields."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-1 max-h-[72vh]">
            <div
              onDragOver={(e) => { e.preventDefault(); setImportDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setImportDragOver(false); }}
              onDrop={async (e) => {
                e.preventDefault();
                setImportDragOver(false);
                const file = e.dataTransfer.files?.[0] ?? null;
                if (!file) return;
                try { await parseImportFile(file); } catch (err) { toast({ variant: "error", title: locale === "fr" ? "Fichier invalide" : "Invalid file", description: (err as Error).message }); }
              }}
              className={`rounded-xl border border-dashed p-8 text-center transition-colors ${importDragOver ? "border-primary bg-primary/5" : "border-border/70 bg-background/60"}`}
            >
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <p className="font-medium">{locale === "fr" ? "Glissez-déposez votre fichier ici" : "Drag and drop your file here"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{locale === "fr" ? "Formats acceptés : .xlsx, .xls, .csv" : "Accepted formats: .xlsx, .xls, .csv"}</p>
              <Button variant="outline" className="mt-4" onClick={() => importInputRef.current?.click()}>
                {locale === "fr" ? "Choisir un fichier" : "Choose file"}
              </Button>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0] ?? null;
                  e.target.value = "";
                  if (!file) return;
                  try { await parseImportFile(file); } catch (err) { toast({ variant: "error", title: locale === "fr" ? "Fichier invalide" : "Invalid file", description: (err as Error).message }); }
                }}
              />
            </div>

            {importHeaders.length > 0 && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                  <p className="mb-1 text-sm font-semibold">{locale === "fr" ? "Champs du modèle" : "Model fields"}</p>
                  <p className="mb-3 text-xs text-muted-foreground">{importFileName} • {importRows.length} {locale === "fr" ? "lignes détectées" : "rows detected"}</p>
                  <div className="max-h-72 space-y-2 overflow-auto pr-1">
                    {IMPORT_FIELD_ORDER.map((fieldKey) => {
                      const meta = IMPORT_FIELD_META[fieldKey];
                      return (
                        <div key={fieldKey} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                          <p className="text-sm font-medium">{meta.label}{meta.required ? " *" : ""}</p>
                          <p className="text-xs text-muted-foreground">
                            {columnMapping[fieldKey] ? `${locale === "fr" ? "Mappé sur" : "Mapped to"}: ${importHeaders[Number(columnMapping[fieldKey])] ?? "—"}` : (locale === "fr" ? "Non mappé" : "Not mapped")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{locale === "fr" ? "Correspondance des colonnes" : "Column mapping"}</p>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setColumnMapping(buildDefaultMapping(importHeaders))}>Auto-map</Button>
                      <Button size="sm" variant="outline" onClick={() => setColumnMapping(EMPTY_MAPPING)}>Reset</Button>
                    </div>
                  </div>
                  <div className="max-h-72 space-y-3 overflow-auto pr-1">
                    {IMPORT_FIELD_ORDER.map((fieldKey) => {
                      const meta = IMPORT_FIELD_META[fieldKey];
                      return (
                        <div key={fieldKey} className="space-y-1">
                          <label className="text-sm font-medium">{meta.label}{meta.required ? " *" : ""}</label>
                          <select
                            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                            value={columnMapping[fieldKey] || ""}
                            onChange={(e) => setColumnMapping((c) => ({ ...c, [fieldKey]: e.target.value }))}
                          >
                            <option value="">{locale === "fr" ? "— Ne pas importer —" : "— Do not import —"}</option>
                            {importHeaders.map((h, i) => (
                              <option key={`${fieldKey}-${i}`} value={String(i)}>{h}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {importErrors.length > 0 && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
                <p className="mb-2 text-sm font-semibold text-destructive">
                  {locale === "fr"
                    ? `${importErrors.length} ligne(s) n'ont pas pu être importées`
                    : `${importErrors.length} row(s) could not be imported`}
                </p>
                <ul className="max-h-48 space-y-1 overflow-auto pr-1 text-xs text-destructive">
                  {importErrors.map((errMsg, idx) => (
                    <li key={idx} className="rounded-md bg-destructive/10 px-2 py-1 font-mono">{errMsg}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportFileName(""); setImportHeaders([]); setImportRows([]); setColumnMapping(EMPTY_MAPPING); setImportErrors([]); }}>
              {locale === "fr" ? "Annuler" : "Cancel"}
            </Button>
            <Button onClick={submitMappedImport} disabled={importHeaders.length === 0 || importMutation.isPending}>
              {importMutation.isPending ? (locale === "fr" ? "Import en cours..." : "Importing...") : (locale === "fr" ? "Importer" : "Import")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
