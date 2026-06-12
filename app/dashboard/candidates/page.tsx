"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  Contact,
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
import { DatePicker } from "@/components/ui/date-picker";
import { isTokenExpired } from "@/lib/jwt-utils";
import { COUNTRIES_BY_CODE, CITIES_BY_COUNTRY } from "@/lib/countries";
import { phonePrefixes } from "@/lib/phone-prefixes";
import type {
  CandidateGender,
  CandidateImportResultResponse,
  CandidateResponse,
  CandidateStatus,
  CreateCandidateRequest,
  UpdateCandidateRequest,
  WhatsappTarget,
} from "@/lib/types";

type CandidateFormState = {
  firstName: string;
  lastName: string;
  candidatePhonePrefix: string;
  candidatePhone: string;
  parentPhone1Prefix: string;
  parentPhone1: string;
  parentPhone2Prefix: string;
  parentPhone2: string;
  email: string;
  acquisitionChannelId: string;
  entryDiplomaId: string;
  previousSchool: string;
  addressLine: string;
  city: string;
  country: string;
  dateOfBirth: string;
  gender: CandidateGender;
  preferredWhatsappTarget: WhatsappTarget;
  observations: string;
};

const DEFAULT_PHONE_PREFIX = "+237";

const EMPTY_FORM: CandidateFormState = {
  firstName: "",
  lastName: "",
  candidatePhonePrefix: DEFAULT_PHONE_PREFIX,
  candidatePhone: "",
  parentPhone1Prefix: DEFAULT_PHONE_PREFIX,
  parentPhone1: "",
  parentPhone2Prefix: DEFAULT_PHONE_PREFIX,
  parentPhone2: "",
  email: "",
  acquisitionChannelId: "",
  entryDiplomaId: "",
  previousSchool: "",
  addressLine: "",
  city: "",
  country: "",
  dateOfBirth: "",
  gender: "UNSPECIFIED",
  preferredWhatsappTarget: "CANDIDATE",
  observations: "",
};

const GENDERS: CandidateGender[] = ["MALE", "FEMALE", "UNSPECIFIED"];
const WHATSAPP_TARGETS: WhatsappTarget[] = ["PARENT_1", "PARENT_2", "CANDIDATE"];

function splitPhone(value: string | undefined): { prefix: string; number: string } {
  if (!value) return { prefix: DEFAULT_PHONE_PREFIX, number: "" };
  const trimmed = value.trim();
  const match = phonePrefixes
    .slice()
    .sort((a, b) => b.value.length - a.value.length)
    .find((p) => trimmed.startsWith(p.value));
  if (match) {
    return { prefix: match.value, number: trimmed.slice(match.value.length).trim() };
  }
  return { prefix: DEFAULT_PHONE_PREFIX, number: trimmed };
}

function joinPhone(prefix: string, number: string): string {
  const trimmedNumber = number.trim();
  if (!trimmedNumber) return "";
  return `${prefix} ${trimmedNumber}`;
}

type ImportFieldKey =
  | "firstName"
  | "lastName"
  | "candidatePhone"
  | "acquisitionChannelCode"
  | "entryDiplomaCode"
  | "parentPhone1"
  | "parentPhone2"
  | "email"
  | "previousSchool"
  | "addressLine"
  | "city"
  | "country"
  | "dateOfBirth"
  | "gender"
  | "preferredWhatsappTarget"
  | "observations";

const IMPORT_FIELD_ORDER: ImportFieldKey[] = [
  "firstName",
  "lastName",
  "candidatePhone",
  "acquisitionChannelCode",
  "entryDiplomaCode",
  "parentPhone1",
  "parentPhone2",
  "email",
  "previousSchool",
  "addressLine",
  "city",
  "country",
  "dateOfBirth",
  "gender",
  "preferredWhatsappTarget",
  "observations",
];

const IMPORT_FIELD_META: Record<ImportFieldKey, { required: boolean; label: string }> = {
  firstName: { required: true, label: "Prénom / First name" },
  lastName: { required: true, label: "Nom / Last name" },
  candidatePhone: { required: true, label: "Téléphone candidat / Candidate phone" },
  acquisitionChannelCode: { required: true, label: "Canal d'acquisition (code) / Acquisition channel (code)" },
  entryDiplomaCode: { required: true, label: "Diplôme d'entrée (code) / Entry diploma (code)" },
  parentPhone1: { required: false, label: "Téléphone parent 1 / Parent phone 1" },
  parentPhone2: { required: false, label: "Téléphone parent 2 / Parent phone 2" },
  email: { required: false, label: "Email" },
  previousSchool: { required: false, label: "École précédente / Previous school" },
  addressLine: { required: false, label: "Adresse / Address" },
  city: { required: false, label: "Ville / City" },
  country: { required: false, label: "Pays / Country" },
  dateOfBirth: { required: false, label: "Date de naissance / Date of birth" },
  gender: { required: false, label: "Genre / Gender" },
  preferredWhatsappTarget: { required: false, label: "Cible WhatsApp / WhatsApp target" },
  observations: { required: false, label: "Observations" },
};

const EMPTY_MAPPING: Record<ImportFieldKey, string> = IMPORT_FIELD_ORDER.reduce(
  (acc, key) => ({ ...acc, [key]: "" }),
  {} as Record<ImportFieldKey, string>,
);

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
    firstName: ["firstname", "prenom"],
    lastName: ["lastname", "nom"],
    candidatePhone: ["candidatephone", "telephonecandidat", "telephone", "phone"],
    acquisitionChannelCode: ["acquisitionchannelcode", "canalacquisition", "canal"],
    entryDiplomaCode: ["entrydiplomacode", "diplome", "diplomeentree"],
    parentPhone1: ["parentphone1", "telephoneparent1", "parent1"],
    parentPhone2: ["parentphone2", "telephoneparent2", "parent2"],
    email: ["email", "mail"],
    previousSchool: ["previousschool", "ecoleprecedente", "ecole"],
    addressLine: ["addressline", "adresse", "address"],
    city: ["city", "ville"],
    country: ["country", "pays"],
    dateOfBirth: ["dateofbirth", "datenaissance", "naissance"],
    gender: ["gender", "genre", "sexe"],
    preferredWhatsappTarget: ["preferredwhatsapptarget", "whatsapptarget", "ciblewhatsapp"],
    observations: ["observations", "notes", "remarques"],
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
  return new File([buf], "candidates-import.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export default function CandidatesPage() {
  const router = useRouter();
  const { accessToken, locale, loadTokensFromStorage, setActiveTab } = useDashboardStore();
  const [isHydrated, setIsHydrated] = useState(false);

  const [selectedEstId, setSelectedEstId] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | CandidateStatus>("ALL");
  const [genderFilter, setGenderFilter] = useState<"ALL" | CandidateGender>("ALL");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formState, setFormState] = useState<CandidateFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [focusedItem, setFocusedItem] = useState<CandidateResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CandidateResponse | null>(null);
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

  useEffect(() => {
    loadTokensFromStorage();
    setActiveTab("candidates");
    setIsHydrated(true);
  }, [loadTokensFromStorage, setActiveTab]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken || isTokenExpired(accessToken)) {
      router.replace("/login?reason=auth_required");
    }
  }, [accessToken, isHydrated, router]);

  const currentUserQuery = useQuery({
    queryKey: ["candidates", "current-user", accessToken],
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

  const acquisitionChannelsQuery = useQuery({
    queryKey: ["config", "acquisition-channels", accessToken, effectiveEstId],
    queryFn: () => api.configuration.acquisitionChannels.list(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId),
  });

  const entryDiplomasQuery = useQuery({
    queryKey: ["config", "entry-diplomas", accessToken, effectiveEstId],
    queryFn: () => api.configuration.entryDiplomas.list(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId),
  });

  const acquisitionChannelOptions = useMemo(
    () =>
      (acquisitionChannelsQuery.data ?? []).map((ch) => ({
        value: ch.id,
        label: ch.name,
        keywords: [ch.code, ch.name],
      })),
    [acquisitionChannelsQuery.data],
  );

  const entryDiplomaOptions = useMemo(
    () =>
      (entryDiplomasQuery.data ?? []).map((d) => ({
        value: d.id,
        label: d.label,
        keywords: [d.code, d.label],
      })),
    [entryDiplomasQuery.data],
  );

  const acquisitionChannelMap = useMemo(() => {
    const map = new Map<string, string>();
    (acquisitionChannelsQuery.data ?? []).forEach((ch) => map.set(ch.id, `${ch.code} — ${ch.name}`));
    return map;
  }, [acquisitionChannelsQuery.data]);

  const entryDiplomaMap = useMemo(() => {
    const map = new Map<string, string>();
    (entryDiplomasQuery.data ?? []).forEach((d) => map.set(d.id, `${d.code} — ${d.label}`));
    return map;
  }, [entryDiplomasQuery.data]);

  const query = useQuery({
    queryKey: ["candidates", accessToken, effectiveEstId],
    queryFn: () => api.candidates.list(accessToken, effectiveEstId),
    enabled: Boolean(accessToken && effectiveEstId),
  });

  const items = useMemo(() => query.data ?? [], [query.data]);

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);
  const canCreate = hasPermission(permissionSet, "candidates:create");
  const canUpdate = hasPermission(permissionSet, "candidates:update");
  const canDelete = hasPermission(permissionSet, "candidates:delete");
  const canHardDelete = hasPermission(permissionSet, "candidates:hard_delete");
  const canExport = hasPermission(permissionSet, "candidates:export");
  const canImport = hasPermission(permissionSet, "candidates:import");
  const canToggleStatus =
    hasPermission(permissionSet, "candidates:activate") ||
    hasPermission(permissionSet, "candidates:deactivate");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      const matchesGender = genderFilter === "ALL" || (item.gender ?? "UNSPECIFIED") === genderFilter;
      const matchesSearch =
        q.length === 0 ||
        `${item.firstName} ${item.lastName} ${item.candidatePhone} ${item.email ?? ""}`.toLowerCase().includes(q);
      return matchesStatus && matchesGender && matchesSearch;
    });
  }, [items, search, statusFilter, genderFilter]);

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
    mutationFn: (payload: CreateCandidateRequest) => api.candidates.create(accessToken, payload),
    onSuccess: async () => { await query.refetch(); setDialogOpen(false); setFormError(null); },
    onError: (err) => setFormError((err as Error).message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCandidateRequest }) =>
      api.candidates.update(accessToken, id, effectiveEstId, payload),
    onSuccess: async () => { await query.refetch(); setDialogOpen(false); setFormError(null); },
    onError: (err) => setFormError((err as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.candidates.delete(accessToken, id, effectiveEstId),
    onSuccess: async () => { await query.refetch(); setDeleteTarget(null); setDeleteMode("soft"); },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => api.candidates.hardDelete(accessToken, id, effectiveEstId),
    onSuccess: async () => { await query.refetch(); setDeleteTarget(null); setDeleteMode("soft"); },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.candidates.activate(accessToken, id, effectiveEstId),
    onSuccess: () => query.refetch(),
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.candidates.deactivate(accessToken, id, effectiveEstId),
    onSuccess: () => query.refetch(),
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const exportMutation = useMutation({
    mutationFn: () => api.candidates.exportExcel(accessToken, effectiveEstId),
    onSuccess: (payload) => {
      triggerDownload(payload.blob, payload.fileName || "candidates-export.xlsx");
      toast({ variant: "success", title: locale === "fr" ? "Export réussi" : "Export successful" });
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur d'export" : "Export failed", description: (err as Error).message }),
  });

  const templateMutation = useMutation({
    mutationFn: () => api.candidates.importTemplate(accessToken),
    onSuccess: (payload) => {
      triggerDownload(payload.blob, payload.fileName || "candidates-import-template.xlsx");
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => api.candidates.importExcel(accessToken, effectiveEstId, file),
    onSuccess: async (result: CandidateImportResultResponse) => {
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
    setFormState({
      ...EMPTY_FORM,
      acquisitionChannelId: acquisitionChannelOptions[0]?.value ?? "",
      entryDiplomaId: entryDiplomaOptions[0]?.value ?? "",
    });
    setFormError(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const openEditDialog = (item: CandidateResponse) => {
    setFocusedItem(item);
    const candidatePhone = splitPhone(item.candidatePhone);
    const parentPhone1 = splitPhone(item.parentPhone1);
    const parentPhone2 = splitPhone(item.parentPhone2);
    setFormState({
      firstName: item.firstName,
      lastName: item.lastName,
      candidatePhonePrefix: candidatePhone.prefix,
      candidatePhone: candidatePhone.number,
      parentPhone1Prefix: parentPhone1.prefix,
      parentPhone1: parentPhone1.number,
      parentPhone2Prefix: parentPhone2.prefix,
      parentPhone2: parentPhone2.number,
      email: item.email ?? "",
      acquisitionChannelId: item.acquisitionChannelId,
      entryDiplomaId: item.entryDiplomaId,
      previousSchool: item.previousSchool ?? "",
      addressLine: item.addressLine ?? "",
      city: item.city ?? "",
      country: item.country ?? "",
      dateOfBirth: item.dateOfBirth ?? "",
      gender: item.gender ?? "UNSPECIFIED",
      preferredWhatsappTarget: item.preferredWhatsappTarget,
      observations: item.observations ?? "",
    });
    setFormError(null);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const submitDialog = () => {
    if (!formState.firstName.trim()) {
      setFormError(locale === "fr" ? "Le prénom est obligatoire." : "First name is required.");
      return;
    }
    if (!formState.lastName.trim()) {
      setFormError(locale === "fr" ? "Le nom est obligatoire." : "Last name is required.");
      return;
    }
    if (!formState.candidatePhone.trim()) {
      setFormError(locale === "fr" ? "Le téléphone du candidat est obligatoire." : "Candidate phone is required.");
      return;
    }
    if (!formState.acquisitionChannelId) {
      setFormError(locale === "fr" ? "Le canal d'acquisition est obligatoire." : "Acquisition channel is required.");
      return;
    }
    if (!formState.entryDiplomaId) {
      setFormError(locale === "fr" ? "Le diplôme d'entrée est obligatoire." : "Entry diploma is required.");
      return;
    }

    const basePayload = {
      firstName: formState.firstName.trim(),
      lastName: formState.lastName.trim(),
      candidatePhone: joinPhone(formState.candidatePhonePrefix, formState.candidatePhone),
      parentPhone1: joinPhone(formState.parentPhone1Prefix, formState.parentPhone1) || undefined,
      parentPhone2: joinPhone(formState.parentPhone2Prefix, formState.parentPhone2) || undefined,
      email: formState.email.trim() || undefined,
      acquisitionChannelId: formState.acquisitionChannelId,
      entryDiplomaId: formState.entryDiplomaId,
      previousSchool: formState.previousSchool.trim() || undefined,
      addressLine: formState.addressLine.trim() || undefined,
      city: formState.city.trim() || undefined,
      country: formState.country.trim() || undefined,
      dateOfBirth: formState.dateOfBirth || undefined,
      gender: formState.gender,
      preferredWhatsappTarget: formState.preferredWhatsappTarget,
      observations: formState.observations.trim() || undefined,
    };

    if (dialogMode === "create") {
      createMutation.mutate({ ...basePayload, establishmentId: effectiveEstId } as CreateCandidateRequest);
    } else {
      updateMutation.mutate({ id: focusedItem!.id, payload: basePayload });
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
    title: locale === "fr" ? "Candidats" : "Candidates",
    subtitle: locale === "fr" ? "Gérez les candidats par établissement." : "Manage candidates per establishment.",
    add: locale === "fr" ? "Ajouter" : "Add",
    refresh: locale === "fr" ? "Actualiser" : "Refresh",
    filtersTooltip: locale === "fr" ? "Afficher/masquer les filtres" : "Show/hide filters",
    searchPlaceholder: locale === "fr" ? "Nom, téléphone, email..." : "Name, phone, email...",
    all: locale === "fr" ? "Tous" : "All",
    active: locale === "fr" ? "Actif" : "Active",
    archived: locale === "fr" ? "Archivé" : "Archived",
    colName: locale === "fr" ? "Candidat" : "Candidate",
    colContact: locale === "fr" ? "Contact" : "Contact",
    colChannel: locale === "fr" ? "Canal d'acquisition" : "Acquisition channel",
    colDiploma: locale === "fr" ? "Diplôme d'entrée" : "Entry diploma",
    colGender: locale === "fr" ? "Genre" : "Gender",
    colStatus: locale === "fr" ? "Statut" : "Status",
    colCreatedBy: locale === "fr" ? "Créé par" : "Created by",
    colUpdatedBy: locale === "fr" ? "Modifié par" : "Updated by",
    colActions: locale === "fr" ? "Actions" : "Actions",
    noData: locale === "fr" ? "Aucun candidat." : "No candidates.",
    loadError: locale === "fr" ? "Erreur lors du chargement." : "Error loading data.",
    createTitle: locale === "fr" ? "Nouveau candidat" : "New candidate",
    editTitle: locale === "fr" ? "Modifier le candidat" : "Edit candidate",
    cancel: locale === "fr" ? "Annuler" : "Cancel",
    save: locale === "fr" ? "Enregistrer" : "Save",
    saving: locale === "fr" ? "Enregistrement..." : "Saving...",
    deleteTitle: locale === "fr" ? "Supprimer le candidat ?" : "Delete candidate?",
    deleteConfirm: locale === "fr" ? "Supprimer" : "Delete",
    deleting: locale === "fr" ? "Suppression..." : "Deleting...",
    tooltipView: locale === "fr" ? "Consulter" : "View",
    tooltipEdit: locale === "fr" ? "Modifier" : "Edit",
    tooltipDelete: locale === "fr" ? "Supprimer" : "Delete",
    tooltipActivate: locale === "fr" ? "Activer" : "Activate",
    tooltipDeactivate: locale === "fr" ? "Archiver" : "Archive",
    count: (n: number) => locale === "fr" ? `${n} candidat(s)` : `${n} candidate(s)`,
    pageLabel: (current: number, total: number) => `Page ${current} / ${total}`,
  };

  const statusLabel = (status: CandidateStatus) => (status === "ACTIVE" ? t.active : t.archived);
  const statusBadgeVariant = (status: CandidateStatus): "success" | "outline" => status === "ACTIVE" ? "success" : "outline";

  const genderLabel = (gender?: CandidateGender) => {
    switch (gender) {
      case "MALE": return locale === "fr" ? "Masculin" : "Male";
      case "FEMALE": return locale === "fr" ? "Féminin" : "Female";
      default: return locale === "fr" ? "Non précisé" : "Unspecified";
    }
  };

  const whatsappTargetLabel = (target: WhatsappTarget) => {
    switch (target) {
      case "PARENT_1": return locale === "fr" ? "Parent 1" : "Parent 1";
      case "PARENT_2": return locale === "fr" ? "Parent 2" : "Parent 2";
      case "CANDIDATE": return locale === "fr" ? "Candidat" : "Candidate";
      default: return target;
    }
  };

  if (!isHydrated || !accessToken || isTokenExpired(accessToken)) return null;

  return (
    <div className="admin-typography min-h-screen bg-background text-foreground">
      <AppSidebar />

      <div className="pb-20 md:pb-0 md:pl-22.5">
        <AdminTopBar />

        <main className="w-full space-y-5 px-3 py-4 pb-24 md:space-y-6 md:px-8 md:py-8 md:pb-8">
          <Breadcrumbs
            items={[
              { label: locale === "fr" ? "Candidats" : "Candidates" },
              { label: locale === "fr" ? "Liste des candidats" : "Candidates list" },
            ]}
          />
          <div className="grid gap-6">
            {/* Section card */}
            <Card className="border-border/60 bg-card/70 shadow-sm">
              <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-2xl md:text-3xl">{t.title}</CardTitle>
                  <CardDescription>{t.subtitle}</CardDescription>
                </div>
                <Badge className="w-fit" variant="outline">
                  <Contact className="h-3.5 w-3.5" />
                  {locale === "fr" ? "Section : Candidats" : "Section: Candidates"}
                </Badge>
              </CardHeader>
            </Card>

            {/* Table card */}
            <Card className="border-border/60 bg-card/70">
              <CardHeader className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
                      <Contact className="h-5 w-5 text-muted-foreground" />
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
                      <Button size="sm" className="h-9 rounded-xl px-3" onClick={openCreateDialog} disabled={!effectiveEstId || acquisitionChannelOptions.length === 0 || entryDiplomaOptions.length === 0}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        {t.add}
                      </Button>
                    )}
                  </div>
                </div>

                {/* KPI cards */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
                    <p className="mt-2 text-2xl font-semibold">{items.length}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.active}</p>
                    <p className="mt-2 text-2xl font-semibold">{items.filter((x) => x.status === "ACTIVE").length}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.archived}</p>
                    <p className="mt-2 text-2xl font-semibold">{items.filter((x) => x.status === "ARCHIVED").length}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{locale === "fr" ? "Avec email" : "With email"}</p>
                    <p className="mt-2 text-2xl font-semibold">{items.filter((x) => x.email).length}</p>
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
                          { value: "ARCHIVED", label: t.archived, keywords: ["archived", "archive"] },
                        ]}
                        value={statusFilter}
                        onValueChange={(v) => { setStatusFilter(v as "ALL" | CandidateStatus); setPage(0); }}
                        placeholder={t.all}
                        searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">{t.colGender}</label>
                      <SearchableSelect
                        options={[
                          { value: "ALL", label: t.all, keywords: ["all", "tous"] },
                          ...GENDERS.map((g) => ({ value: g, label: genderLabel(g), keywords: [g.toLowerCase()] })),
                        ]}
                        value={genderFilter}
                        onValueChange={(v) => { setGenderFilter(v as "ALL" | CandidateGender); setPage(0); }}
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
                        <th className="px-3 py-3">{t.colName}</th>
                        <th className="px-3 py-3">{t.colContact}</th>
                        <th className="hidden px-3 py-3 lg:table-cell">{t.colChannel}</th>
                        <th className="hidden px-3 py-3 xl:table-cell">{t.colDiploma}</th>
                        <th className="px-3 py-3">{t.colGender}</th>
                        <th className="hidden px-3 py-3 lg:table-cell">{t.colCreatedBy}</th>
                        <th className="hidden px-3 py-3 xl:table-cell">{t.colUpdatedBy}</th>
                        <th className="px-3 py-3">{t.colStatus}</th>
                        <th className="px-3 py-3">{t.colActions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {query.isLoading ? (
                        <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">{locale === "fr" ? "Chargement…" : "Loading…"}</td></tr>
                      ) : query.isError ? (
                        <tr><td colSpan={10} className="px-3 py-8 text-center text-destructive">{t.loadError}</td></tr>
                      ) : pageItems.length === 0 ? (
                        <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">{t.noData}</td></tr>
                      ) : pageItems.map((item) => (
                        <tr key={item.id} className={`border-t border-border/50 transition-colors hover:bg-muted/30 ${selectedIds.has(item.id) ? "bg-primary/5" : ""}`}>
                          <td className="px-3 py-2.5">
                            <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelection(item.id)} className="h-4 w-4 rounded border-border accent-primary" />
                          </td>
                          <td className="px-3 py-2.5 font-medium">{item.firstName} {item.lastName}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col text-xs">
                              <span className="font-mono">{item.candidatePhone}</span>
                              {item.email && <span className="text-muted-foreground">{item.email}</span>}
                            </div>
                          </td>
                          <td className="hidden px-3 py-2.5 lg:table-cell">
                            <span className="text-xs text-muted-foreground">{acquisitionChannelMap.get(item.acquisitionChannelId) ?? "—"}</span>
                          </td>
                          <td className="hidden px-3 py-2.5 xl:table-cell">
                            <span className="text-xs text-muted-foreground">{entryDiplomaMap.get(item.entryDiplomaId) ?? "—"}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge variant="outline">{genderLabel(item.gender)}</Badge>
                          </td>
                          <td className="hidden px-3 py-2.5 lg:table-cell">
                            <span className="text-xs text-muted-foreground">{item.createdByLabel ?? "—"}</span>
                          </td>
                          <td className="hidden px-3 py-2.5 xl:table-cell">
                            <span className="text-xs text-muted-foreground">{item.updatedByLabel ?? "—"}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge variant={statusBadgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                          </td>
                          <td className="px-3 py-2.5">
                            <DropdownMenu
                              triggerTooltip={locale === "fr" ? "Actions" : "Actions"}
                              items={[
                                {
                                  label: t.tooltipView,
                                  icon: Eye,
                                  onClick: () => router.push(`/dashboard/candidates/${item.id}?establishmentId=${effectiveEstId}`),
                                },
                                ...(canUpdate ? [{
                                  label: t.tooltipEdit,
                                  icon: Pencil,
                                  onClick: () => openEditDialog(item),
                                }] : []),
                                ...(canToggleStatus ? [{
                                  label: item.status === "ACTIVE" ? t.tooltipDeactivate : t.tooltipActivate,
                                  icon: Power,
                                  onClick: () => item.status === "ACTIVE" ? deactivateMutation.mutate(item.id) : activateMutation.mutate(item.id),
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
                            <p className="font-medium">{item.firstName} {item.lastName}</p>
                            <p className="font-mono text-xs text-muted-foreground">{item.candidatePhone}</p>
                            {item.email && <p className="text-xs text-muted-foreground">{item.email}</p>}
                          </div>
                        </div>
                        <Badge variant={statusBadgeVariant(item.status)} className="shrink-0">
                          {statusLabel(item.status)}
                        </Badge>
                      </div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{genderLabel(item.gender)}</Badge>
                      </div>
                      <div className="mb-3 flex flex-col gap-0.5 text-xs text-muted-foreground">
                        <span>{t.colChannel}: {acquisitionChannelMap.get(item.acquisitionChannelId) ?? "—"}</span>
                        <span>{t.colDiploma}: {entryDiplomaMap.get(item.entryDiplomaId) ?? "—"}</span>
                        {item.createdByLabel && <span>{locale === "fr" ? "Créé par" : "By"}: {item.createdByLabel}</span>}
                        {item.updatedByLabel && <span>{locale === "fr" ? "Modifié par" : "Updated by"}: {item.updatedByLabel}</span>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" className="h-8 rounded-lg px-2 text-xs" onClick={() => router.push(`/dashboard/candidates/${item.id}?establishmentId=${effectiveEstId}`)}>
                          <Eye className="mr-1 h-3 w-3" />{t.tooltipView}
                        </Button>
                        {canUpdate && (
                          <Button size="sm" variant="outline" className="h-8 rounded-lg px-2 text-xs" onClick={() => openEditDialog(item)}>
                            <Pencil className="mr-1 h-3 w-3" />{t.tooltipEdit}
                          </Button>
                        )}
                        {canToggleStatus && (
                          <Button size="sm" variant="outline" className="h-8 rounded-lg px-2 text-xs" onClick={() => item.status === "ACTIVE" ? deactivateMutation.mutate(item.id) : activateMutation.mutate(item.id)}>
                            <Power className="mr-1 h-3 w-3" />{item.status === "ACTIVE" ? t.tooltipDeactivate : t.tooltipActivate}
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
          </div>
        </main>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? t.createTitle : t.editTitle}</DialogTitle>
            {dialogMode === "edit" && (
              <DialogDescription>
                {locale === "fr" ? "Modifiez les informations du candidat." : "Update the candidate details."}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{locale === "fr" ? "Prénom" : "First name"} *</label>
                <Input value={formState.firstName} onChange={(e) => setFormState((s) => ({ ...s, firstName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{locale === "fr" ? "Nom" : "Last name"} *</label>
                <Input value={formState.lastName} onChange={(e) => setFormState((s) => ({ ...s, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{locale === "fr" ? "Téléphone candidat" : "Candidate phone"} *</label>
                <div className="flex gap-2">
                  <SearchableSelect
                    options={phonePrefixes.map((prefix) => ({ value: prefix.value, label: prefix.label, keywords: prefix.keywords }))}
                    value={formState.candidatePhonePrefix}
                    onValueChange={(v) => setFormState((s) => ({ ...s, candidatePhonePrefix: v }))}
                    placeholder={locale === "fr" ? "Indicatif" : "Prefix"}
                    searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                    className="w-32 shrink-0"
                  />
                  <Input
                    value={formState.candidatePhone}
                    onChange={(e) => setFormState((s) => ({ ...s, candidatePhone: e.target.value }))}
                    className="flex-1 min-w-0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={formState.email} onChange={(e) => setFormState((s) => ({ ...s, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{locale === "fr" ? "Téléphone parent 1" : "Parent phone 1"}</label>
                <div className="flex gap-2">
                  <SearchableSelect
                    options={phonePrefixes.map((prefix) => ({ value: prefix.value, label: prefix.label, keywords: prefix.keywords }))}
                    value={formState.parentPhone1Prefix}
                    onValueChange={(v) => setFormState((s) => ({ ...s, parentPhone1Prefix: v }))}
                    placeholder={locale === "fr" ? "Indicatif" : "Prefix"}
                    searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                    className="w-32 shrink-0"
                  />
                  <Input
                    value={formState.parentPhone1}
                    onChange={(e) => setFormState((s) => ({ ...s, parentPhone1: e.target.value }))}
                    className="flex-1 min-w-0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{locale === "fr" ? "Téléphone parent 2" : "Parent phone 2"}</label>
                <div className="flex gap-2">
                  <SearchableSelect
                    options={phonePrefixes.map((prefix) => ({ value: prefix.value, label: prefix.label, keywords: prefix.keywords }))}
                    value={formState.parentPhone2Prefix}
                    onValueChange={(v) => setFormState((s) => ({ ...s, parentPhone2Prefix: v }))}
                    placeholder={locale === "fr" ? "Indicatif" : "Prefix"}
                    searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                    className="w-32 shrink-0"
                  />
                  <Input
                    value={formState.parentPhone2}
                    onChange={(e) => setFormState((s) => ({ ...s, parentPhone2: e.target.value }))}
                    className="flex-1 min-w-0"
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <label className="text-sm font-medium">{locale === "fr" ? "Canal d'acquisition" : "Acquisition channel"} *</label>
                <SearchableSelect
                  options={acquisitionChannelOptions}
                  value={formState.acquisitionChannelId}
                  onValueChange={(v) => setFormState((s) => ({ ...s, acquisitionChannelId: v }))}
                  placeholder={locale === "fr" ? "Sélectionner..." : "Select..."}
                  searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                  className="w-full"
                />
              </div>
              <div className="min-w-0 space-y-2">
                <label className="text-sm font-medium">{locale === "fr" ? "Diplôme d'entrée" : "Entry diploma"} *</label>
                <SearchableSelect
                  options={entryDiplomaOptions}
                  value={formState.entryDiplomaId}
                  onValueChange={(v) => setFormState((s) => ({ ...s, entryDiplomaId: v }))}
                  placeholder={locale === "fr" ? "Sélectionner..." : "Select..."}
                  searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                  className="w-full"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">{locale === "fr" ? "Date de naissance" : "Date of birth"}</label>
                <DatePicker
                  value={formState.dateOfBirth}
                  onValueChange={(v) => setFormState((s) => ({ ...s, dateOfBirth: v }))}
                  placeholder={locale === "fr" ? "Sélectionner une date" : "Select a date"}
                  locale={locale}
                  maxDate={new Date()}
                  className="w-full"
                />
              </div>
              <div className="min-w-0 space-y-2">
                <label className="text-sm font-medium">{t.colGender}</label>
                <SearchableSelect
                  options={GENDERS.map((g) => ({ value: g, label: genderLabel(g), keywords: [g.toLowerCase()] }))}
                  value={formState.gender}
                  onValueChange={(v) => setFormState((s) => ({ ...s, gender: v as CandidateGender }))}
                  placeholder={t.colGender}
                  searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                  className="w-full"
                />
              </div>
              <div className="min-w-0 space-y-2">
                <label className="text-sm font-medium">{locale === "fr" ? "Cible WhatsApp" : "WhatsApp target"}</label>
                <SearchableSelect
                  options={WHATSAPP_TARGETS.map((wt) => ({ value: wt, label: whatsappTargetLabel(wt), keywords: [wt.toLowerCase()] }))}
                  value={formState.preferredWhatsappTarget}
                  onValueChange={(v) => setFormState((s) => ({ ...s, preferredWhatsappTarget: v as WhatsappTarget }))}
                  placeholder={locale === "fr" ? "Cible WhatsApp" : "WhatsApp target"}
                  searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                  className="w-full"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{locale === "fr" ? "École précédente" : "Previous school"}</label>
              <Input value={formState.previousSchool} onChange={(e) => setFormState((s) => ({ ...s, previousSchool: e.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <label className="text-sm font-medium">{locale === "fr" ? "Pays" : "Country"}</label>
                <SearchableSelect
                  options={COUNTRIES_BY_CODE.map((country) => ({
                    value: country.code,
                    label: country.name,
                    keywords: [country.code, country.name],
                  }))}
                  value={formState.country}
                  onValueChange={(v) => setFormState((s) => ({ ...s, country: v, city: "" }))}
                  placeholder={locale === "fr" ? "Sélectionner un pays" : "Select a country"}
                  searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                  className="w-full"
                />
              </div>
              <div className="min-w-0 space-y-2">
                <label className="text-sm font-medium">{locale === "fr" ? "Ville" : "City"}</label>
                <SearchableSelect
                  options={(CITIES_BY_COUNTRY[formState.country] ?? []).map((city) => ({
                    value: city,
                    label: city,
                    keywords: [city],
                  }))}
                  value={formState.city}
                  onValueChange={(v) => setFormState((s) => ({ ...s, city: v }))}
                  placeholder={locale === "fr" ? "Sélectionner une ville" : "Select a city"}
                  searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                  disabled={!formState.country}
                  className="w-full"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Adresse" : "Address"}</label>
              <Input value={formState.addressLine} onChange={(e) => setFormState((s) => ({ ...s, addressLine: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Observations</label>
              <textarea
                value={formState.observations}
                onChange={(e) => setFormState((s) => ({ ...s, observations: e.target.value }))}
                rows={3}
                className="flex w-full rounded-md border border-input bg-(--input-bg) px-3 py-2 text-sm text-foreground [font-family:var(--font-grift)] shadow-sm transition-colors placeholder:text-muted-foreground placeholder:font-medium placeholder:[font-family:var(--font-grift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

      {/* Delete confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteMode("soft"); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.deleteTitle}</DialogTitle>
            <DialogDescription>
              {deleteTarget && (
                <span className="mt-1 block font-medium text-foreground">{deleteTarget.firstName} {deleteTarget.lastName}</span>
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
              : (locale === "fr" ? "Le candidat sera archivé et masqué (suppression logique)." : "The candidate will be archived and hidden (soft delete).")}
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
            <DialogTitle>{locale === "fr" ? "Importer des candidats" : "Import candidates"}</DialogTitle>
            <DialogDescription>
              {locale === "fr" ? "Chargez un fichier Excel et mappez les colonnes aux champs du candidat." : "Upload an Excel file and map the columns to candidate fields."}
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
