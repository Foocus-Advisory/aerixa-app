"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  Columns3,
  Download,
  Eye,
  FileDown,
  Filter,
  List,
  Pencil,
  Plus,
  Power,
  RefreshCcw,
  Table2,
  Trash2,
  Upload,
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
  CreateFunnelStageRequest,
  FunnelStageImportResultResponse,
  FunnelStageResponse,
  FunnelStageType,
  PipelineViewType,
  UpdateFunnelStageRequest,
} from "@/lib/types";

type FunnelStageFormState = {
  name: string;
  description: string;
  stageType: FunnelStageType;
  positionOrder: string;
};

const EMPTY_FORM: FunnelStageFormState = { name: "", description: "", stageType: "INTERMEDIATE", positionOrder: "" };

const STAGE_TYPES: FunnelStageType[] = ["INITIAL", "INTERMEDIATE", "FINAL_SUCCESS", "FINAL_FAILURE"];

type ImportFieldKey = "name" | "stageType" | "positionOrder" | "code" | "description" | "active";
const IMPORT_FIELD_ORDER: ImportFieldKey[] = ["name", "stageType", "positionOrder", "code", "description", "active"];
const IMPORT_FIELD_META: Record<ImportFieldKey, { required: boolean; label: string }> = {
  name: { required: true, label: "Intitulé / Name" },
  stageType: { required: true, label: "Type d'étape / Stage type" },
  positionOrder: { required: true, label: "Position" },
  code: { required: false, label: "Code" },
  description: { required: false, label: "Description" },
  active: { required: false, label: "Actif / Active" },
};
const EMPTY_MAPPING: Record<ImportFieldKey, string> = { name: "", stageType: "", positionOrder: "", code: "", description: "", active: "" };

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
    stageType: ["stagetype", "type", "etapetype"],
    positionOrder: ["positionorder", "position", "ordre", "rang"],
    code: ["code"],
    description: ["description", "desc"],
    active: ["active", "actif", "enabled", "status", "statut"],
  };
  const mapping: Record<ImportFieldKey, string> = { ...EMPTY_MAPPING };
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
  return new File([buf], "funnel-stages-import.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function FunnelStagesSection({
  accessToken,
  locale,
  establishmentId,
}: {
  accessToken: string;
  locale: "fr" | "en";
  establishmentId: string;
}) {
  const router = useRouter();

  const [viewMode, setViewMode] = useState<PipelineViewType>("TABLE");
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [stageTypeFilter, setStageTypeFilter] = useState<"ALL" | FunnelStageType>("ALL");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverType, setDragOverType] = useState<FunnelStageType | null>(null);

  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formState, setFormState] = useState<FunnelStageFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [focusedItem, setFocusedItem] = useState<FunnelStageResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FunnelStageResponse | null>(null);
  const [deleteMode, setDeleteMode] = useState<"soft" | "hard">("soft");

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<ImportFieldKey, string>>(EMPTY_MAPPING);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importDragOver, setImportDragOver] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const { toast } = useToast();

  const currentUserQuery = useQuery({
    queryKey: ["funnel-stages", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });

  const effectiveEstId = establishmentId;

  const viewPreferenceQuery = useQuery({
    queryKey: ["config", "funnel-stages", "view-preference", accessToken, effectiveEstId],
    queryFn: () => api.configuration.pipelineViewPreference.get(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId),
  });

  useEffect(() => {
    if (viewPreferenceQuery.data?.preferredView) {
      setViewMode(viewPreferenceQuery.data.preferredView);
    }
  }, [viewPreferenceQuery.data]);

  const viewPreferenceMutation = useMutation({
    mutationFn: (preferredView: PipelineViewType) =>
      api.configuration.pipelineViewPreference.update(accessToken, { establishmentId: effectiveEstId, preferredView }),
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const changeViewMode = (next: PipelineViewType) => {
    setViewMode(next);
    if (effectiveEstId) {
      viewPreferenceMutation.mutate(next);
    }
  };

  const query = useQuery({
    queryKey: ["config", "funnel-stages", accessToken, effectiveEstId],
    queryFn: () => api.configuration.funnelStages.list(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId),
  });

  const items = useMemo(() => query.data ?? [], [query.data]);

  const availableStageTypes = useMemo(() => {
    const singleInstanceTypes: FunnelStageType[] = ["INITIAL", "FINAL_SUCCESS"];
    const usedTypes = new Set(
      items
        .filter((item) => item.active && focusedItem?.id !== item.id)
        .map((item) => item.stageType)
        .filter((type) => singleInstanceTypes.includes(type)),
    );
    return STAGE_TYPES.filter((type) => !usedTypes.has(type));
  }, [items, focusedItem]);

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);
  const canCreate = hasPermission(permissionSet, "funnel_stages:create");
  const canUpdate = hasPermission(permissionSet, "funnel_stages:update");
  const canDelete = hasPermission(permissionSet, "funnel_stages:delete");
  const canHardDelete = hasPermission(permissionSet, "funnel_stages:hard_delete");
  const canExport = hasPermission(permissionSet, "funnel_stages:export");
  const canImport = hasPermission(permissionSet, "funnel_stages:import");
  const canToggleStatus =
    hasPermission(permissionSet, "funnel_stages:activate") ||
    hasPermission(permissionSet, "funnel_stages:deactivate");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = statusFilter === "ALL" || (item.active ? "ACTIVE" : "INACTIVE") === statusFilter;
      const matchesType = stageTypeFilter === "ALL" || item.stageType === stageTypeFilter;
      const matchesSearch = q.length === 0 || `${item.code} ${item.name}`.toLowerCase().includes(q);
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [items, search, statusFilter, stageTypeFilter]);

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
    mutationFn: (payload: CreateFunnelStageRequest) => api.configuration.funnelStages.create(accessToken, payload),
    onSuccess: async () => { await query.refetch(); setDialogOpen(false); setFormError(null); },
    onError: (err) => setFormError((err as Error).message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFunnelStageRequest }) =>
      api.configuration.funnelStages.update(accessToken, id, effectiveEstId, payload),
    onSuccess: async () => { await query.refetch(); setDialogOpen(false); setFormError(null); },
    onError: (err) => setFormError((err as Error).message),
  });

  const changeStageTypeMutation = useMutation({
    mutationFn: ({ id, stageType }: { id: string; stageType: FunnelStageType }) =>
      api.configuration.funnelStages.update(accessToken, id, effectiveEstId, { stageType }),
    onSuccess: async () => { await query.refetch(); },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.configuration.funnelStages.delete(accessToken, id, effectiveEstId),
    onSuccess: async () => { await query.refetch(); setDeleteTarget(null); setDeleteMode("soft"); },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => api.configuration.funnelStages.hardDelete(accessToken, id, effectiveEstId),
    onSuccess: async () => { await query.refetch(); setDeleteTarget(null); setDeleteMode("soft"); },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.configuration.funnelStages.activate(accessToken, id, effectiveEstId),
    onSuccess: () => query.refetch(),
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.configuration.funnelStages.deactivate(accessToken, id, effectiveEstId),
    onSuccess: () => query.refetch(),
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const exportMutation = useMutation({
    mutationFn: () => api.configuration.funnelStages.exportExcel(accessToken, effectiveEstId),
    onSuccess: (payload) => {
      triggerDownload(payload.blob, payload.fileName || "funnel-stages-export.xlsx");
      toast({ variant: "success", title: locale === "fr" ? "Export réussi" : "Export successful" });
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur d'export" : "Export failed", description: (err as Error).message }),
  });

  const templateMutation = useMutation({
    mutationFn: () => api.configuration.funnelStages.importTemplate(accessToken),
    onSuccess: (payload) => {
      triggerDownload(payload.blob, payload.fileName || "funnel-stages-import-template.xlsx");
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => api.configuration.funnelStages.importExcel(accessToken, effectiveEstId, file),
    onSuccess: async (result: FunnelStageImportResultResponse) => {
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
    const maxPosition = items.reduce((max, item) => Math.max(max, item.positionOrder ?? 0), 0);
    const defaultStageType = availableStageTypes.includes(EMPTY_FORM.stageType) ? EMPTY_FORM.stageType : (availableStageTypes[0] ?? EMPTY_FORM.stageType);
    setFormState({ ...EMPTY_FORM, stageType: defaultStageType, positionOrder: String(maxPosition + 1) });
    setFormError(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const openEditDialog = (item: FunnelStageResponse) => {
    setFocusedItem(item);
    setFormState({
      name: item.name,
      description: item.description ?? "",
      stageType: item.stageType,
      positionOrder: String(item.positionOrder ?? ""),
    });
    setFormError(null);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const submitDialog = () => {
    if (!formState.name.trim()) {
      setFormError(locale === "fr" ? "L'intitulé est obligatoire." : "Name is required.");
      return;
    }
    const positionOrder = Number(formState.positionOrder);
    if (!Number.isInteger(positionOrder) || positionOrder <= 0) {
      setFormError(locale === "fr" ? "La position doit être un entier strictement positif." : "Position must be a strictly positive integer.");
      return;
    }
    if (dialogMode === "create") {
      createMutation.mutate({
        establishmentId: effectiveEstId,
        name: formState.name.trim(),
        description: formState.description.trim() || undefined,
        stageType: formState.stageType,
        positionOrder,
      } as CreateFunnelStageRequest);
    } else {
      updateMutation.mutate({
        id: focusedItem!.id,
        payload: {
          name: formState.name.trim(),
          description: formState.description.trim(),
          stageType: formState.stageType,
          positionOrder,
        },
      });
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
    title: locale === "fr" ? "Étapes du tunnel" : "Funnel stages",
    subtitle: locale === "fr" ? "Gérez les étapes du tunnel de conversion par établissement." : "Manage conversion funnel stages per establishment.",
    add: locale === "fr" ? "Ajouter" : "Add",
    refresh: locale === "fr" ? "Actualiser" : "Refresh",
    filtersTooltip: locale === "fr" ? "Afficher/masquer les filtres" : "Show/hide filters",
    searchPlaceholder: locale === "fr" ? "Code, intitulé..." : "Code, name...",
    all: locale === "fr" ? "Tous" : "All",
    active: locale === "fr" ? "Actif" : "Active",
    inactive: locale === "fr" ? "Inactif" : "Inactive",
    colCode: "Code",
    colName: locale === "fr" ? "Intitulé" : "Name",
    colType: locale === "fr" ? "Type d'étape" : "Stage type",
    colPosition: locale === "fr" ? "Position" : "Position",
    colStatus: locale === "fr" ? "Statut" : "Status",
    colCreatedBy: locale === "fr" ? "Créé par" : "Created by",
    colUpdatedBy: locale === "fr" ? "Modifié par" : "Updated by",
    colActions: locale === "fr" ? "Actions" : "Actions",
    noData: locale === "fr" ? "Aucune étape de tunnel." : "No funnel stages.",
    loadError: locale === "fr" ? "Erreur lors du chargement." : "Error loading data.",
    createTitle: locale === "fr" ? "Nouvelle étape de tunnel" : "New funnel stage",
    editTitle: locale === "fr" ? "Modifier l'étape de tunnel" : "Edit funnel stage",
    fieldName: locale === "fr" ? "Intitulé" : "Name",
    fieldDescription: "Description",
    fieldType: locale === "fr" ? "Type d'étape" : "Stage type",
    fieldPosition: locale === "fr" ? "Position" : "Position",
    cancel: locale === "fr" ? "Annuler" : "Cancel",
    save: locale === "fr" ? "Enregistrer" : "Save",
    saving: locale === "fr" ? "Enregistrement..." : "Saving...",
    deleteTitle: locale === "fr" ? "Supprimer l'étape de tunnel ?" : "Delete funnel stage?",
    deleteConfirm: locale === "fr" ? "Supprimer" : "Delete",
    deleting: locale === "fr" ? "Suppression..." : "Deleting...",
    tooltipView: locale === "fr" ? "Consulter" : "View",
    tooltipEdit: locale === "fr" ? "Modifier" : "Edit",
    tooltipDelete: locale === "fr" ? "Supprimer" : "Delete",
    tooltipActivate: locale === "fr" ? "Activer" : "Activate",
    tooltipDeactivate: locale === "fr" ? "Désactiver" : "Deactivate",
    count: (n: number) => locale === "fr" ? `${n} étape(s)` : `${n} stage(s)`,
    pageLabel: (current: number, total: number) => `Page ${current} / ${total}`,
    codeAutoHint: locale === "fr" ? "Le code sera généré automatiquement." : "The code will be generated automatically.",
  };

  const stageTypeLabel = (type: FunnelStageType) => {
    switch (type) {
      case "INITIAL": return locale === "fr" ? "Initiale" : "Initial";
      case "INTERMEDIATE": return locale === "fr" ? "Intermédiaire" : "Intermediate";
      case "FINAL_SUCCESS": return locale === "fr" ? "Succès final" : "Final success";
      case "FINAL_FAILURE": return locale === "fr" ? "Échec final" : "Final failure";
      default: return type;
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
    <div className="grid gap-6">
      <Card className="border-border/60 bg-card/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle>{t.title}</CardTitle>
              <CardDescription>{t.subtitle}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 p-1.5">
              <DropdownMenu
                triggerTooltip={locale === "fr" ? "Changer de vue" : "Switch view"}
                triggerIcon={
                  viewMode === "KANBAN" ? Columns3 : viewMode === "LIST" ? List : Table2
                }
                triggerClassName="h-9 w-9 rounded-xl text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
                items={[
                  {
                    label: locale === "fr" ? "Tableau" : "Table",
                    icon: Table2,
                    onClick: () => changeViewMode("TABLE"),
                    variant: viewMode === "TABLE" ? "active" : "default",
                  },
                  {
                    label: "Kanban",
                    icon: Columns3,
                    onClick: () => changeViewMode("KANBAN"),
                    variant: viewMode === "KANBAN" ? "active" : "default",
                  },
                  {
                    label: locale === "fr" ? "Liste" : "List",
                    icon: List,
                    onClick: () => changeViewMode("LIST"),
                    variant: viewMode === "LIST" ? "active" : "default",
                  },
                ]}
              />
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
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
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{stageTypeLabel("INITIAL")}</p>
              <p className="mt-2 text-2xl font-semibold">{items.filter((x) => x.stageType === "INITIAL").length}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{stageTypeLabel("INTERMEDIATE")}</p>
              <p className="mt-2 text-2xl font-semibold">{items.filter((x) => x.stageType === "INTERMEDIATE").length}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{locale === "fr" ? "Étapes finales" : "Final stages"}</p>
              <p className="mt-2 text-2xl font-semibold">{items.filter((x) => x.stageType === "FINAL_SUCCESS" || x.stageType === "FINAL_FAILURE").length}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4">
          {showFilters && (
            <div className="grid gap-3 md:grid-cols-4">
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
                <label className="text-xs text-muted-foreground">{t.colType}</label>
                <SearchableSelect
                  options={[
                    { value: "ALL", label: t.all, keywords: ["all", "tous"] },
                    ...STAGE_TYPES.map((type) => ({ value: type, label: stageTypeLabel(type), keywords: [type.toLowerCase()] })),
                  ]}
                  value={stageTypeFilter}
                  onValueChange={(v) => { setStageTypeFilter(v as "ALL" | FunnelStageType); setPage(0); }}
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

          {viewMode === "TABLE" && (
          <>
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
                  <th className="px-3 py-3">{t.colType}</th>
                  <th className="px-3 py-3">{t.colPosition}</th>
                  <th className="hidden px-3 py-3 lg:table-cell">{t.colCreatedBy}</th>
                  <th className="hidden px-3 py-3 xl:table-cell">{t.colUpdatedBy}</th>
                  <th className="px-3 py-3">{t.colStatus}</th>
                  <th className="px-3 py-3">{t.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {query.isLoading ? (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">{locale === "fr" ? "Chargement…" : "Loading…"}</td></tr>
                ) : query.isError ? (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-destructive">{t.loadError}</td></tr>
                ) : pageItems.length === 0 ? (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">{t.noData}</td></tr>
                ) : pageItems.map((item) => (
                  <tr key={item.id} className={`border-t border-border/50 transition-colors hover:bg-muted/30 ${selectedIds.has(item.id) ? "bg-primary/5" : ""}`}>
                    <td className="px-3 py-2.5">
                      <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelection(item.id)} className="h-4 w-4 rounded border-border accent-primary" />
                    </td>
                    <td className="px-3 py-2.5"><span className="font-mono text-xs">{item.code}</span></td>
                    <td className="px-3 py-2.5 font-medium">{item.name}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={stageTypeBadgeVariant(item.stageType)}>{stageTypeLabel(item.stageType)}</Badge>
                    </td>
                    <td className="px-3 py-2.5"><span className="font-mono text-xs">{item.positionOrder}</span></td>
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
                            label: t.tooltipView,
                            icon: Eye,
                            onClick: () => router.push(`/dashboard/funnel-stages/${item.id}?establishmentId=${establishmentId}`),
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
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant={stageTypeBadgeVariant(item.stageType)}>{stageTypeLabel(item.stageType)}</Badge>
                  <Badge variant="outline">{t.colPosition}: {item.positionOrder}</Badge>
                </div>
                <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {item.createdByLabel && <span>{locale === "fr" ? "Créé par" : "By"}: {item.createdByLabel}</span>}
                  {item.updatedByLabel && <span>{locale === "fr" ? "Modifié par" : "Updated by"}: {item.updatedByLabel}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="h-8 rounded-lg px-2 text-xs" onClick={() => router.push(`/dashboard/funnel-stages/${item.id}?establishmentId=${establishmentId}`)}>
                    <Eye className="mr-1 h-3 w-3" />{t.tooltipView}
                  </Button>
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
          </>
          )}

          {viewMode === "KANBAN" && (
            <div className="grid gap-3 overflow-x-auto pb-2 md:grid-flow-col md:auto-cols-[minmax(300px,1fr)]">
              {query.isLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{locale === "fr" ? "Chargement…" : "Loading…"}</p>
              ) : query.isError ? (
                <p className="py-8 text-center text-sm text-destructive">{t.loadError}</p>
              ) : (
                STAGE_TYPES.map((type) => {
                  const stageItems = filtered.filter((item) => item.stageType === type);
                  const isDragOver = dragOverType === type;
                  const draggedItem = draggedItemId ? filtered.find((i) => i.id === draggedItemId) ?? null : null;
                  const dropAllowed = draggedItem !== null && draggedItem.stageType !== type;
                  return (
                    <div
                      key={type}
                      className={`flex min-w-0 flex-col gap-3 rounded-xl border p-4 transition-colors ${
                        isDragOver
                          ? dropAllowed
                            ? "border-primary bg-primary/10"
                            : "border-destructive/50 bg-destructive/5"
                          : "border-border/70 bg-background/50"
                      }`}
                      onDragOver={(e) => {
                        if (!draggedItem) return;
                        e.preventDefault();
                        if (dragOverType !== type) setDragOverType(type);
                      }}
                      onDragLeave={() => {
                        if (dragOverType === type) setDragOverType(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverType(null);
                        if (draggedItem && draggedItem.stageType !== type) {
                          changeStageTypeMutation.mutate({ id: draggedItem.id, stageType: type });
                        }
                        setDraggedItemId(null);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={stageTypeBadgeVariant(type)}>{stageTypeLabel(type)}</Badge>
                        <span className="text-xs text-muted-foreground">{stageItems.length}</span>
                      </div>
                      <div className="flex flex-col gap-3">
                        {stageItems.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-border/60 bg-background/40 p-3 text-center text-xs text-muted-foreground">{t.noData}</p>
                        ) : (
                          stageItems
                            .slice()
                            .sort((a, b) => a.positionOrder - b.positionOrder)
                            .map((item) => (
                              <div
                                key={item.id}
                                className={`rounded-xl border border-border/70 bg-card/80 p-4 text-sm shadow-sm ${canUpdate ? "cursor-grab active:cursor-grabbing" : ""} ${draggedItemId === item.id ? "opacity-50" : ""}`}
                                draggable={canUpdate}
                                onDragStart={(e) => {
                                  if (!canUpdate) return;
                                  setDraggedItemId(item.id);
                                  e.dataTransfer.effectAllowed = "move";
                                }}
                                onDragEnd={() => {
                                  setDraggedItemId(null);
                                  setDragOverType(null);
                                }}
                              >
                                <div className="mb-1 flex items-start justify-between gap-2">
                                  <p className="font-medium leading-tight">{item.name}</p>
                                  <Badge variant={item.active ? "success" : "outline"} className="shrink-0">
                                    {item.active ? t.active : t.inactive}
                                  </Badge>
                                </div>
                                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span className="font-mono">{item.code}</span>
                                  <span>{t.colPosition}: {item.positionOrder}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" variant="outline" className="h-8 rounded-lg px-2.5 text-xs" onClick={() => router.push(`/dashboard/funnel-stages/${item.id}?establishmentId=${establishmentId}`)}>
                                    <Eye className="mr-1 h-3.5 w-3.5" />{t.tooltipView}
                                  </Button>
                                  {canUpdate && (
                                    <Button size="sm" variant="outline" className="h-8 rounded-lg px-2.5 text-xs" onClick={() => openEditDialog(item)}>
                                      <Pencil className="mr-1 h-3.5 w-3.5" />{t.tooltipEdit}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {viewMode === "LIST" && (
            <div className="flex flex-col divide-y divide-border/60 overflow-hidden rounded-xl border border-border/80 bg-background/70">
              {query.isLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{locale === "fr" ? "Chargement…" : "Loading…"}</p>
              ) : query.isError ? (
                <p className="py-8 text-center text-sm text-destructive">{t.loadError}</p>
              ) : pageItems.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t.noData}</p>
              ) : (
                pageItems.map((item) => (
                  <div key={item.id} className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/30 ${selectedIds.has(item.id) ? "bg-primary/5" : ""}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelection(item.id)} className="h-4 w-4 shrink-0 rounded border-border accent-primary" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{item.code}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={stageTypeBadgeVariant(item.stageType)}>{stageTypeLabel(item.stageType)}</Badge>
                      <Badge variant="outline">{t.colPosition}: {item.positionOrder}</Badge>
                      <Badge variant={item.active ? "success" : "outline"}>
                        {item.active ? t.active : t.inactive}
                      </Badge>
                      <DropdownMenu
                        triggerTooltip={locale === "fr" ? "Actions" : "Actions"}
                        items={[
                          {
                            label: t.tooltipView,
                            icon: Eye,
                            onClick: () => router.push(`/dashboard/funnel-stages/${item.id}?establishmentId=${establishmentId}`),
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
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? t.createTitle : t.editTitle}</DialogTitle>
            {dialogMode === "edit" && (
              <DialogDescription>
                {locale === "fr" ? "Modifiez les informations de l'étape de tunnel." : "Update the funnel stage details."}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="grid gap-4">
            {dialogMode === "edit" && focusedItem ? (
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">Code</p>
                <p className="mt-0.5 font-mono text-sm font-medium">{focusedItem.code}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t.codeAutoHint}</p>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.fieldName} *</label>
              <Input
                value={formState.name}
                onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                placeholder={locale === "fr" ? "Prise de contact, Devis envoyé, Client gagné..." : "Contacted, Quote sent, Won..."}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.fieldDescription}</label>
              <textarea
                value={formState.description}
                onChange={(e) => setFormState((s) => ({ ...s, description: e.target.value }))}
                placeholder={locale === "fr" ? "Description optionnelle de l'étape..." : "Optional description of the stage..."}
                rows={3}
                className="flex w-full rounded-md border border-input bg-(--input-bg) px-3 py-2 text-sm text-foreground [font-family:var(--font-grift)] shadow-sm transition-colors placeholder:text-muted-foreground placeholder:font-medium placeholder:[font-family:var(--font-grift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.fieldType} *</label>
                <SearchableSelect
                  options={availableStageTypes.map((type) => ({ value: type, label: stageTypeLabel(type), keywords: [type.toLowerCase()] }))}
                  value={formState.stageType}
                  onValueChange={(v) => setFormState((s) => ({ ...s, stageType: v as FunnelStageType }))}
                  placeholder={t.fieldType}
                  searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.fieldPosition} *</label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={formState.positionOrder}
                  onChange={(e) => setFormState((s) => ({ ...s, positionOrder: e.target.value }))}
                  placeholder="1"
                />
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isMutating}>{t.cancel}</Button>
            <Button onClick={submitDialog} disabled={isMutating}>{isMutating ? t.saving : t.save}</Button>
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
              : (locale === "fr" ? "L'étape sera archivée et masquée (suppression logique)." : "The stage will be archived and hidden (soft delete).")}
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
            <DialogTitle>{locale === "fr" ? "Importer des étapes de tunnel" : "Import funnel stages"}</DialogTitle>
            <DialogDescription>
              {locale === "fr" ? "Chargez un fichier Excel et mappez les colonnes aux champs de l'étape de tunnel." : "Upload an Excel file and map the columns to funnel stage fields."}
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
