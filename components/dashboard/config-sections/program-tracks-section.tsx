"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  ArrowRight,
  Download,
  Eye,
  FileDown,
  Filter,
  GitBranch,
  Link2,
  Pencil,
  Plus,
  Power,
  RefreshCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { buildPermissionSet, hasPermission } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast-provider";
import { AppTooltip } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type {
  AcademicLevelResponse,
  CreateProgramTrackRequest,
  ProgramTrackImportResultResponse,
  ProgramTrackResponse,
  UpdateProgramTrackRequest,
} from "@/lib/types";

type ProgramTrackFormState = {
  name: string;
  description: string;
  active: boolean;
};

const EMPTY_FORM: ProgramTrackFormState = { name: "", description: "", active: true };

type ImportFieldKey = "name" | "code" | "description" | "active";
const IMPORT_FIELD_ORDER: ImportFieldKey[] = ["name", "code", "description", "active"];
const IMPORT_FIELD_META: Record<ImportFieldKey, { required: boolean; label: string }> = {
  name: { required: true, label: "Intitulé / Name" },
  code: { required: false, label: "Code" },
  description: { required: false, label: "Description" },
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

function buildDefaultMapping(headers: string[]): Record<ImportFieldKey, string> {
  const normalized = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const aliases: Record<ImportFieldKey, string[]> = {
    name: ["name", "nom", "intitule", "libelle"],
    code: ["code"],
    description: ["description", "desc"],
    active: ["active", "actif", "enabled", "status", "statut"],
  };
  const mapping: Record<ImportFieldKey, string> = { name: "", code: "", description: "", active: "" };
  IMPORT_FIELD_ORDER.forEach((field) => {
    const idx = normalized.findIndex((h) => aliases[field].includes(h));
    if (idx >= 0) mapping[field] = String(idx);
  });
  return mapping;
}

function buildMappedFile(rows: string[][], mapping: Record<ImportFieldKey, string>): File {
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
  return new File([buf], "program-tracks-import.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function ProgramTracksSection({
  accessToken,
  locale,
  establishmentId,
}: {
  accessToken: string;
  locale: "fr" | "en";
  establishmentId: string;
}) {
  const router = useRouter();
  const effectiveEstId = establishmentId;

  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "view">("create");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formState, setFormState] = useState<ProgramTrackFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [focusedItem, setFocusedItem] = useState<ProgramTrackResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProgramTrackResponse | null>(null);
  const [deleteMode, setDeleteMode] = useState<"soft" | "hard">("soft");

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkTarget, setLinkTarget] = useState<ProgramTrackResponse | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [openForApplication, setOpenForApplication] = useState(true);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<ImportFieldKey, string>>({ name: "", code: "", description: "", active: "" });
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importDragOver, setImportDragOver] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const { toast } = useToast();

  const currentUserQuery = useQuery({
    queryKey: ["program-tracks", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });

  const query = useQuery({
    queryKey: ["config", "program-tracks", accessToken, effectiveEstId],
    queryFn: () => api.configuration.programTracks.list(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId),
  });

  const items = useMemo(() => query.data ?? [], [query.data]);

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);
  const canCreate = hasPermission(permissionSet, "program_tracks:create");
  const canUpdate = hasPermission(permissionSet, "program_tracks:update");
  const canDelete = hasPermission(permissionSet, "program_tracks:delete");
  const canHardDelete = hasPermission(permissionSet, "program_tracks:hard_delete");
  const canExport = hasPermission(permissionSet, "program_tracks:export");
  const canImport = hasPermission(permissionSet, "program_tracks:import");
  const canToggleStatus =
    hasPermission(permissionSet, "program_tracks:activate") ||
    hasPermission(permissionSet, "program_tracks:deactivate");
  const canLinkLevel = hasPermission(permissionSet, "program_track_levels:create");
  const canUnlinkLevel = hasPermission(permissionSet, "program_track_levels:delete");

  const academicLevelsQuery = useQuery({
    queryKey: ["config", "academic-levels", accessToken, effectiveEstId],
    queryFn: () => api.configuration.academicLevels.list(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId && linkDialogOpen),
  });

  const trackLevelsQuery = useQuery({
    queryKey: ["config", "program-track-levels", accessToken, effectiveEstId],
    queryFn: () => api.configuration.programTrackLevels.list(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId && linkDialogOpen),
  });

  const academicLevelsMap = useMemo(() => {
    const map = new Map<string, AcademicLevelResponse>();
    (academicLevelsQuery.data ?? []).forEach((level) => map.set(level.id, level));
    return map;
  }, [academicLevelsQuery.data]);

  const linkedLevels = useMemo(
    () => (trackLevelsQuery.data ?? []).filter((ptl) => ptl.programTrackId === linkTarget?.id),
    [trackLevelsQuery.data, linkTarget],
  );

  const linkedLevelIds = useMemo(() => new Set(linkedLevels.map((ptl) => ptl.academicLevelId)), [linkedLevels]);

  const availableLevels = useMemo(
    () => (academicLevelsQuery.data ?? []).filter((level) => !linkedLevelIds.has(level.id)),
    [academicLevelsQuery.data, linkedLevelIds],
  );

  const linkCreateMutation = useMutation({
    mutationFn: () =>
      api.configuration.programTrackLevels.create(accessToken, {
        establishmentId: effectiveEstId,
        programTrackId: linkTarget!.id,
        academicLevelId: selectedLevelId,
        openForApplication,
      }),
    onSuccess: async () => {
      await trackLevelsQuery.refetch();
      setSelectedLevelId("");
      setOpenForApplication(true);
      toast({ variant: "success", title: locale === "fr" ? "Niveau lié" : "Level linked" });
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const linkDeleteMutation = useMutation({
    mutationFn: (id: string) => api.configuration.programTrackLevels.delete(accessToken, id, effectiveEstId),
    onSuccess: async () => {
      await trackLevelsQuery.refetch();
      toast({ variant: "success", title: locale === "fr" ? "Niveau délié" : "Level unlinked" });
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const linkToggleMutation = useMutation({
    mutationFn: ({ id, open }: { id: string; open: boolean }) =>
      open
        ? api.configuration.programTrackLevels.deactivate(accessToken, id, effectiveEstId)
        : api.configuration.programTrackLevels.activate(accessToken, id, effectiveEstId),
    onSuccess: async () => {
      await trackLevelsQuery.refetch();
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const openLinkDialog = (item: ProgramTrackResponse) => {
    setLinkTarget(item);
    setSelectedLevelId("");
    setOpenForApplication(true);
    setLinkDialogOpen(true);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = statusFilter === "ALL" || (item.active ? "ACTIVE" : "INACTIVE") === statusFilter;
      const matchesSearch = q.length === 0 || `${item.code} ${item.name} ${item.description ?? ""}`.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [items, search, statusFilter]);

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
    mutationFn: (payload: CreateProgramTrackRequest) => api.configuration.programTracks.create(accessToken, payload),
    onSuccess: async () => { await query.refetch(); setDialogOpen(false); setFormError(null); },
    onError: (err) => setFormError((err as Error).message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProgramTrackRequest }) =>
      api.configuration.programTracks.update(accessToken, id, effectiveEstId, payload),
    onSuccess: async () => { await query.refetch(); setDialogOpen(false); setFormError(null); },
    onError: (err) => setFormError((err as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.configuration.programTracks.delete(accessToken, id, effectiveEstId),
    onSuccess: async () => { await query.refetch(); setDeleteTarget(null); setDeleteMode("soft"); },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => api.configuration.programTracks.hardDelete(accessToken, id, effectiveEstId),
    onSuccess: async () => { await query.refetch(); setDeleteTarget(null); setDeleteMode("soft"); },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.configuration.programTracks.activate(accessToken, id, effectiveEstId),
    onSuccess: () => query.refetch(),
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.configuration.programTracks.deactivate(accessToken, id, effectiveEstId),
    onSuccess: () => query.refetch(),
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const exportMutation = useMutation({
    mutationFn: () => api.configuration.programTracks.exportExcel(accessToken, effectiveEstId),
    onSuccess: (payload) => {
      triggerDownload(payload.blob, payload.fileName || "program-tracks-export.xlsx");
      toast({ variant: "success", title: locale === "fr" ? "Export réussi" : "Export successful" });
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur d'export" : "Export failed", description: (err as Error).message }),
  });

  const templateMutation = useMutation({
    mutationFn: () => api.configuration.programTracks.importTemplate(accessToken),
    onSuccess: (payload) => {
      triggerDownload(payload.blob, payload.fileName || "program-tracks-import-template.xlsx");
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => api.configuration.programTracks.importExcel(accessToken, effectiveEstId, file),
    onSuccess: async (result: ProgramTrackImportResultResponse) => {
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

  const openEditDialog = (item: ProgramTrackResponse) => {
    setFocusedItem(item);
    setFormState({ name: item.name, description: item.description ?? "", active: item.active });
    setFormError(null);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const openViewDialog = (item: ProgramTrackResponse) => {
    setFocusedItem(item);
    setDialogMode("view");
    setDialogOpen(true);
  };

  const submitDialog = () => {
    if (!formState.name.trim()) {
      setFormError(locale === "fr" ? "L'intitulé est obligatoire." : "Name is required.");
      return;
    }
    if (dialogMode === "create") {
      createMutation.mutate({
        establishmentId: effectiveEstId,
        name: formState.name.trim(),
        description: formState.description.trim() || undefined,
        active: formState.active,
      } as CreateProgramTrackRequest);
    } else {
      updateMutation.mutate({ id: focusedItem!.id, payload: { name: formState.name.trim(), description: formState.description.trim() || undefined } });
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
    title: locale === "fr" ? "Filières" : "Program tracks",
    subtitle: locale === "fr" ? "Gérez les filières d'étude par établissement." : "Manage program tracks per establishment.",
    add: locale === "fr" ? "Ajouter" : "Add",
    refresh: locale === "fr" ? "Actualiser" : "Refresh",
    filtersTooltip: locale === "fr" ? "Afficher/masquer les filtres" : "Show/hide filters",
    searchPlaceholder: locale === "fr" ? "Code, intitulé, description..." : "Code, name, description...",
    all: locale === "fr" ? "Tous" : "All",
    active: locale === "fr" ? "Actif" : "Active",
    inactive: locale === "fr" ? "Inactif" : "Inactive",
    colCode: "Code",
    colName: locale === "fr" ? "Intitulé" : "Name",
    colDescription: "Description",
    colStatus: locale === "fr" ? "Statut" : "Status",
    colCreatedBy: locale === "fr" ? "Créé par" : "Created by",
    colUpdatedBy: locale === "fr" ? "Modifié par" : "Updated by",
    colActions: locale === "fr" ? "Actions" : "Actions",
    noData: locale === "fr" ? "Aucune filière." : "No program tracks.",
    loadError: locale === "fr" ? "Erreur lors du chargement." : "Error loading data.",
    createTitle: locale === "fr" ? "Nouvelle filière" : "New program track",
    editTitle: locale === "fr" ? "Modifier la filière" : "Edit program track",
    viewTitle: locale === "fr" ? "Détail de la filière" : "Program track details",
    fieldName: locale === "fr" ? "Intitulé" : "Name",
    fieldDescription: "Description",
    fieldActive: locale === "fr" ? "Actif" : "Active",
    cancel: locale === "fr" ? "Annuler" : "Cancel",
    save: locale === "fr" ? "Enregistrer" : "Save",
    saving: locale === "fr" ? "Enregistrement..." : "Saving...",
    deleteTitle: locale === "fr" ? "Supprimer la filière ?" : "Delete program track?",
    deleteConfirm: locale === "fr" ? "Supprimer" : "Delete",
    deleting: locale === "fr" ? "Suppression..." : "Deleting...",
    tooltipView: locale === "fr" ? "Consulter" : "View",
    tooltipEdit: locale === "fr" ? "Modifier" : "Edit",
    tooltipDelete: locale === "fr" ? "Supprimer" : "Delete",
    tooltipActivate: locale === "fr" ? "Activer" : "Activate",
    tooltipDeactivate: locale === "fr" ? "Désactiver" : "Deactivate",
    tooltipViewDetail: locale === "fr" ? "Voir le détail" : "View details",
    tooltipLinkLevel: locale === "fr" ? "Lier à un niveau académique" : "Link to academic level",
    createdAt: locale === "fr" ? "Créé le" : "Created at",
    updatedAt: locale === "fr" ? "Modifié le" : "Updated at",
    count: (n: number) => locale === "fr" ? `${n} filière(s)` : `${n} track(s)`,
    pageLabel: (current: number, total: number) => `Page ${current} / ${total}`,
  };

  return (
    <div className="grid gap-6">
      {/* Table card */}
      <Card className="border-border/60 bg-card/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
                <GitBranch className="h-5 w-5 text-muted-foreground" />
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

          {/* KPI cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
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

          {/* Desktop table */}
          <div className="hidden overflow-auto rounded-xl border border-border/80 bg-background/70 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAllOnPage} className="h-4 w-4 rounded border-border accent-primary" aria-label="select all" />
                  </th>
                  <th className="px-3 py-3">{t.colCode}</th>
                  <th className="px-3 py-3">{t.colName}</th>
                  <th className="hidden px-3 py-3 lg:table-cell">{t.colDescription}</th>
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
                    <td className="px-3 py-2.5"><span className="font-mono text-xs">{item.code}</span></td>
                    <td className="px-3 py-2.5 font-medium">{item.name}</td>
                    <td className="hidden max-w-xs truncate px-3 py-2.5 lg:table-cell">
                      <span className="text-xs text-muted-foreground">{item.description ?? "—"}</span>
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
                            label: t.tooltipViewDetail,
                            icon: ArrowRight,
                            onClick: () => router.push(`/dashboard/program-tracks/${item.id}?establishmentId=${effectiveEstId}`),
                          },
                          {
                            label: t.tooltipView,
                            icon: Eye,
                            onClick: () => openViewDialog(item),
                          },
                          ...(canLinkLevel ? [{
                            label: t.tooltipLinkLevel,
                            icon: Link2,
                            onClick: () => openLinkDialog(item),
                          }] : []),
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
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{item.code}</p>
                    </div>
                  </div>
                  <Badge variant={item.active ? "success" : "outline"} className="shrink-0">
                    {item.active ? t.active : t.inactive}
                  </Badge>
                </div>
                {item.description && (
                  <p className="mb-2 text-xs text-muted-foreground">{item.description}</p>
                )}
                <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {item.createdByLabel && <span>{locale === "fr" ? "Créé par" : "By"}: {item.createdByLabel}</span>}
                  {item.updatedByLabel && <span>{locale === "fr" ? "Modifié par" : "Updated by"}: {item.updatedByLabel}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="h-8 rounded-lg px-2 text-xs" onClick={() => router.push(`/dashboard/program-tracks/${item.id}?establishmentId=${effectiveEstId}`)}>
                    <ArrowRight className="mr-1 h-3 w-3" />{t.tooltipViewDetail}
                  </Button>
                  {canLinkLevel && (
                    <Button size="sm" variant="outline" className="h-8 rounded-lg px-2 text-xs" onClick={() => openLinkDialog(item)}>
                      <Link2 className="mr-1 h-3 w-3" />{t.tooltipLinkLevel}
                    </Button>
                  )}
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
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen && (dialogMode === "create" || dialogMode === "edit")} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? t.createTitle : t.editTitle}</DialogTitle>
            {dialogMode === "edit" && (
              <DialogDescription>
                {locale === "fr" ? "Modifiez les informations de la filière." : "Update the program track details."}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="grid gap-4">
            {dialogMode === "edit" && focusedItem && (
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">Code</p>
                <p className="mt-0.5 font-mono text-sm font-medium">{focusedItem.code}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.fieldName} *</label>
              <Input
                value={formState.name}
                onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                placeholder={locale === "fr" ? "Informatique, Gestion, Commerce..." : "Computer science, Management, Commerce..."}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.fieldDescription}</label>
              <Input
                value={formState.description}
                onChange={(e) => setFormState((s) => ({ ...s, description: e.target.value }))}
                placeholder={locale === "fr" ? "Description optionnelle..." : "Optional description..."}
              />
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
              <input
                type="checkbox"
                id="pt-active-chk"
                checked={formState.active}
                onChange={(e) => setFormState((s) => ({ ...s, active: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <label htmlFor="pt-active-chk" className="cursor-pointer text-sm font-medium">{t.fieldActive}</label>
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
            <DialogDescription>{locale === "fr" ? "Informations complètes de la filière." : "Full program track details."}</DialogDescription>
          </DialogHeader>
          {focusedItem && (
            <div className="grid gap-3 text-sm">
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">Code</p>
                <p className="mt-1 font-mono font-medium">{focusedItem.code}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">{t.fieldName}</p>
                <p className="mt-1">{focusedItem.name}</p>
              </div>
              {focusedItem.description && (
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{t.fieldDescription}</p>
                  <p className="mt-1 text-sm">{focusedItem.description}</p>
                </div>
              )}
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">{t.colStatus}</p>
                <div className="mt-1"><Badge variant={focusedItem.active ? "success" : "outline"}>{focusedItem.active ? t.active : t.inactive}</Badge></div>
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
            {focusedItem && (
              <Button onClick={() => router.push(`/dashboard/program-tracks/${focusedItem.id}?establishmentId=${effectiveEstId}`)}>
                <ArrowRight className="mr-1.5 h-4 w-4" />
                {t.tooltipViewDetail}
              </Button>
            )}
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
                <span className="mt-1 block font-mono font-medium text-foreground">{deleteTarget.code} — {deleteTarget.name}</span>
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
              : (locale === "fr" ? "La filière sera archivée et masquée (suppression logique)." : "The track will be archived and hidden (soft delete).")}
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

      {/* Link to academic level dialog */}
      <Dialog
        open={linkDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setLinkDialogOpen(false);
            setLinkTarget(null);
            setSelectedLevelId("");
            setOpenForApplication(true);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{locale === "fr" ? "Lier à un niveau académique" : "Link to academic level"}</DialogTitle>
            <DialogDescription>
              {linkTarget && <span className="mt-1 block font-mono font-medium text-foreground">{linkTarget.code} — {linkTarget.name}</span>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Linked levels */}
            <div className="space-y-2">
              <p className="text-sm font-medium">{locale === "fr" ? "Niveaux liés" : "Linked levels"}</p>
              {trackLevelsQuery.isLoading || academicLevelsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">{locale === "fr" ? "Chargement..." : "Loading..."}</p>
              ) : linkedLevels.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 py-6 text-center">
                  <Link2 className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    {locale === "fr" ? "Aucun niveau académique lié." : "No academic level linked."}
                  </p>
                </div>
              ) : (
                <div className="max-h-48 space-y-2 overflow-auto pr-1">
                  {linkedLevels.map((ptl) => {
                    const level = academicLevelsMap.get(ptl.academicLevelId);
                    return (
                      <div key={ptl.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/70 p-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{level ? `${level.code} — ${level.label}` : ptl.academicLevelId}</p>
                          <Badge variant={ptl.openForApplication ? "success" : "outline"} className="mt-1 text-xs">
                            {ptl.openForApplication ? (locale === "fr" ? "Ouvert" : "Open") : (locale === "fr" ? "Fermé" : "Closed")}
                          </Badge>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {(hasPermission(permissionSet, "program_track_levels:activate") || hasPermission(permissionSet, "program_track_levels:deactivate")) && (
                            <AppTooltip content={ptl.openForApplication ? (locale === "fr" ? "Fermer" : "Close") : (locale === "fr" ? "Ouvrir" : "Open")}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => linkToggleMutation.mutate({ id: ptl.id, open: ptl.openForApplication })}
                                disabled={linkToggleMutation.isPending}
                              >
                                <Power className="h-3.5 w-3.5" />
                              </Button>
                            </AppTooltip>
                          )}
                          {canUnlinkLevel && (
                            <AppTooltip content={locale === "fr" ? "Délier" : "Unlink"}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 rounded-lg p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => linkDeleteMutation.mutate(ptl.id)}
                                disabled={linkDeleteMutation.isPending}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </AppTooltip>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Attach new level */}
            {canLinkLevel && (
              <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3">
                <p className="text-sm font-medium">{locale === "fr" ? "Lier un nouveau niveau" : "Link a new level"}</p>
                <SearchableSelect
                  options={availableLevels.map((level) => ({
                    value: level.id,
                    label: `${level.code} — ${level.label}`,
                    keywords: [level.code, level.label],
                  }))}
                  value={selectedLevelId}
                  onValueChange={setSelectedLevelId}
                  placeholder={locale === "fr" ? "Sélectionner un niveau académique" : "Select an academic level"}
                  searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                />
                {availableLevels.length === 0 && !academicLevelsQuery.isLoading && (
                  <p className="text-xs text-muted-foreground">
                    {locale === "fr" ? "Tous les niveaux académiques sont déjà liés." : "All academic levels are already linked."}
                  </p>
                )}
                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2.5">
                  <input
                    type="checkbox"
                    id="ptl-open-chk"
                    checked={openForApplication}
                    onChange={(e) => setOpenForApplication(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <label htmlFor="ptl-open-chk" className="cursor-pointer text-sm font-medium">
                    {locale === "fr" ? "Ouvert pour candidature" : "Open for application"}
                  </label>
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => linkCreateMutation.mutate()}
                  disabled={!selectedLevelId || linkCreateMutation.isPending}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  {linkCreateMutation.isPending ? (locale === "fr" ? "Liaison..." : "Linking...") : (locale === "fr" ? "Lier" : "Link")}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setLinkDialogOpen(false); setLinkTarget(null); setSelectedLevelId(""); setOpenForApplication(true); }}>
              {locale === "fr" ? "Fermer" : "Close"}
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
            setColumnMapping({ name: "", code: "", description: "", active: "" });
            setImportErrors([]);
          }
        }}
      >
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{locale === "fr" ? "Importer des filières" : "Import program tracks"}</DialogTitle>
            <DialogDescription>
              {locale === "fr" ? "Chargez un fichier Excel et mappez les colonnes aux champs de la filière." : "Upload an Excel file and map the columns to program track fields."}
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
                      <Button size="sm" variant="outline" onClick={() => setColumnMapping({ name: "", code: "", description: "", active: "" })}>Reset</Button>
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
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportFileName(""); setImportHeaders([]); setImportRows([]); setColumnMapping({ name: "", code: "", description: "", active: "" }); setImportErrors([]); }}>
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
