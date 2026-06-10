"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Award, Building2, Download, Eye, FileDown, FileUp, Filter, ImagePlus, Pencil, Plus, Power, RefreshCcw, Trash2, Upload, X } from "lucide-react";
import { api } from "@/lib/api";
import { buildPermissionSet, hasPermission } from "@/lib/permissions";
import { phonePrefixes } from "@/lib/phone-prefixes";
import { COUNTRIES_BY_CODE, CITIES_BY_COUNTRY } from "@/lib/countries";
import { useToast } from "@/components/ui/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AppTooltip } from "@/components/ui/tooltip";
import type { CreateEstablishmentRequest, UpdateEstablishmentRequest, EntryDiplomaResponse, CreateEntryDiplomaRequest, UpdateEntryDiplomaRequest, EntryDiplomaImportResultResponse } from "@/lib/types";

type Locale = "fr" | "en";

type ConfigSectionPanelProps = {
  accessToken: string;
  locale: Locale;
};

type EstablishmentFormState = {
  code: string;
  name: string;
  shortName: string;
  status: "ACTIVE" | "INACTIVE";
  addressLine1: string;
  addressLine2: string;
  city: string;
  country: string;
  whatsappPhonePrefix: string;
  whatsappPhone: string;
  otherPhonePrefix: string;
  otherPhone: string;
  email: string;
};

const EMPTY_ESTABLISHMENT_FORM: EstablishmentFormState = {
  code: "",
  name: "",
  shortName: "",
  status: "ACTIVE",
  addressLine1: "",
  addressLine2: "",
  city: "",
  country: "",
  whatsappPhonePrefix: "+237",
  whatsappPhone: "",
  otherPhonePrefix: "+237",
  otherPhone: "",
  email: "",
};

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Impossible de lire le fichier logo"));
    reader.readAsDataURL(file);
  });
}

function generateEstablishmentCode(): string {
  return `EST-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

function formatEstablishmentDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

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

type DiplomaImportFieldKey = "code" | "label" | "rankOrder" | "active";

const DIPLOMA_IMPORT_FIELD_ORDER: DiplomaImportFieldKey[] = ["code", "label", "rankOrder", "active"];

const diplomaImportFieldMeta: Record<DiplomaImportFieldKey, { required: boolean; label: string }> = {
  code: { required: false, label: "Code" },
  label: { required: true, label: "Libellé" },
  rankOrder: { required: false, label: "Rang" },
  active: { required: false, label: "Actif" },
};

function buildDiplomaDefaultMapping(headers: string[]): Record<DiplomaImportFieldKey, string> {
  const normalized = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const aliases: Record<DiplomaImportFieldKey, string[]> = {
    code: ["code", "code"],
    label: ["label", "libelle", "libell"],
    rankOrder: ["rankorder", "rang", "ordre", "order"],
    active: ["active", "actif", "statut", "status"],
  };
  const mapping: Record<DiplomaImportFieldKey, string> = { code: "", label: "", rankOrder: "", active: "" };
  DIPLOMA_IMPORT_FIELD_ORDER.forEach((field) => {
    const idx = normalized.findIndex((h) => aliases[field].includes(h));
    if (idx >= 0) mapping[field] = String(idx);
  });
  return mapping;
}

function buildDiplomaMappedFile(
  sourceRows: string[][],
  mapping: Record<DiplomaImportFieldKey, string>,
): File {
  const outputRows: string[][] = [DIPLOMA_IMPORT_FIELD_ORDER];
  sourceRows.forEach((row) => {
    const mapped = DIPLOMA_IMPORT_FIELD_ORDER.map((field) => {
      const idx = mapping[field];
      if (!idx) return "";
      return row[Number(idx)] ?? "";
    });
    outputRows.push(mapped);
  });
  const ws = XLSX.utils.aoa_to_sheet(outputRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "entry-diplomas");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new File([buf], "entry-diplomas-import-mapped.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function statusVariant(status?: string) {
  return status === "INACTIVE" ? "outline" : "success";
}

function statusLabel(status: string | undefined, locale: Locale) {
  if (status === "INACTIVE") {
    return locale === "fr" ? "Inactif" : "Inactive";
  }

  return locale === "fr" ? "Actif" : "Active";
}

/* ─────────────────────────── Shared hooks ─────────────────────────── */

function useEstablishments(accessToken: string) {
  return useQuery({
    queryKey: ["config", "establishments", accessToken],
    queryFn: () => api.configuration.establishments.list(accessToken),
    enabled: Boolean(accessToken),
  });
}

function useEstablishmentSelector(accessToken: string) {
  const [selectedId, setSelectedId] = useState("");
  const query = useEstablishments(accessToken);
  const effectiveId = selectedId || query.data?.[0]?.id || "";
  const options = useMemo(
    () =>
      (query.data ?? []).map((item) => ({
        value: item.id,
        label: `${item.code} — ${item.name}`,
        keywords: [item.code, item.name, item.shortName ?? ""],
      })),
    [query.data],
  );
  return { selectedId, setSelectedId, effectiveId, options, isError: query.isError };
}

/* ─────────────────────────── Shared table wrapper ─────────────────── */

function SectionTable({
  headers,
  rows,
  isLoading,
  isError,
  emptyFr,
  emptyEn,
  errorFr,
  errorEn,
  locale,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  isLoading: boolean;
  isError: boolean;
  emptyFr: string;
  emptyEn: string;
  errorFr: string;
  errorEn: string;
  locale: Locale;
}) {
  const colSpan = headers.length;
  return (
    <div className="overflow-auto rounded-xl border border-border/80 bg-background/70">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={colSpan} className="px-3 py-8 text-center text-muted-foreground">
                {locale === "fr" ? "Chargement..." : "Loading..."}
              </td>
            </tr>
          ) : isError ? (
            <tr>
              <td colSpan={colSpan} className="px-3 py-8 text-center text-destructive">
                {locale === "fr" ? errorFr : errorEn}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="px-3 py-8 text-center text-muted-foreground">
                {locale === "fr" ? emptyFr : emptyEn}
              </td>
            </tr>
          ) : (
            rows.map((cells, rowIndex) => (
              <tr key={rowIndex} className="border-t border-border/60">
                {cells.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ScopedSelectorBar({
  locale,
  options,
  value,
  onChange,
  isError,
}: {
  locale: Locale;
  options: { value: string; label: string; keywords: string[] }[];
  value: string;
  onChange: (v: string) => void;
  isError: boolean;
}) {
  return (
    <div className="grid gap-1 md:max-w-md">
      <p className="text-xs font-medium text-muted-foreground">{locale === "fr" ? "Etablissement" : "Establishment"}</p>
      <SearchableSelect
        options={options}
        value={value}
        onValueChange={onChange}
        placeholder={locale === "fr" ? "Selectionner un etablissement" : "Select an establishment"}
        searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
      />
      {isError ? (
        <p className="text-xs text-destructive">
          {locale === "fr" ? "Impossible de charger les etablissements." : "Could not load establishments."}
        </p>
      ) : null}
    </div>
  );
}

/* ─────────────────────────── Establishments ───────────────────────── */

export function EstablishmentsPanel({ accessToken, locale }: ConfigSectionPanelProps) {
  const router = useRouter();
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [formState, setFormState] = useState<EstablishmentFormState>(EMPTY_ESTABLISHMENT_FORM);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ["config", "establishments", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);
  const canCreateEstablishment = hasPermission(permissionSet, "establishments:create");
  const canUpdateEstablishment = hasPermission(permissionSet, "establishments:update");
  const canDeleteEstablishment = hasPermission(permissionSet, "establishments:delete");
  const canChangeStatus = hasPermission(permissionSet, "establishments:activate") || hasPermission(permissionSet, "establishments:deactivate");
  const isSuperAdmin = currentUserQuery.data?.roles?.some((r) => r === "SUPER_ADMIN") ?? false;

  const query = useEstablishments(accessToken);
  const items = useMemo(() => query.data ?? [], [query.data]);
  const canCreateMultiple = isSuperAdmin || items.length === 0;
  const effectiveSelectedId = selectedEstablishmentId || items[0]?.id || "";
  const selectedEstablishment = useMemo(
    () => items.find((item) => item.id === effectiveSelectedId) ?? null,
    [items, effectiveSelectedId],
  );

  const saveMutation = useMutation({
    mutationFn: async (payload: { mode: "create" | "edit"; id?: string; values: EstablishmentFormState }) => {
      const basePayload: CreateEstablishmentRequest = {
        code: payload.values.code,
        name: payload.values.name.trim(),
        shortName: payload.values.shortName.trim() || undefined,
        addressLine1: payload.values.addressLine1.trim() || undefined,
        addressLine2: payload.values.addressLine2.trim() || undefined,
        city: payload.values.city || undefined,
        country: payload.values.country || undefined,
        whatsappPhonePrefix: payload.values.whatsappPhone ? payload.values.whatsappPhonePrefix : undefined,
        whatsappPhone: payload.values.whatsappPhone || undefined,
        otherPhonePrefix: payload.values.otherPhone ? payload.values.otherPhonePrefix : undefined,
        otherPhone: payload.values.otherPhone || undefined,
        email: payload.values.email.trim() || undefined,
      };

      let saved;
      if (payload.mode === "create") {
        saved = await api.configuration.establishments.create(accessToken, basePayload);
      } else {
        if (!payload.id) {
          throw new Error(locale === "fr" ? "Etablissement introuvable" : "Establishment not found");
        }

        const updatePayload: UpdateEstablishmentRequest = {
          ...basePayload,
          status: payload.values.status,
        };

        saved = await api.configuration.establishments.update(accessToken, payload.id, updatePayload);
      }

      if (logoFile) {
        saved = await api.configuration.establishments.uploadLogo(accessToken, saved.id, logoFile);
      }

      return saved;
    },
    onSuccess: async (saved) => {
      await query.refetch();
      setSelectedEstablishmentId(saved.id);
      setSelectedIds((current) => new Set(current).add(saved.id));
      setDialogOpen(false);
      setLogoFile(null);
      setLogoPreview("");
      setFormError(null);
    },
    onError: (error) => {
      setFormError((error as Error).message);
    },
  });

  const deleteLogoMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEstablishment?.id) {
        throw new Error(locale === "fr" ? "Etablissement introuvable" : "Establishment not found");
      }

      return api.configuration.establishments.deleteLogo(accessToken, selectedEstablishment.id);
    },
    onSuccess: async () => {
      await query.refetch();
      setLogoFile(null);
      setLogoPreview("");
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    },
    onError: (error) => {
      setFormError((error as Error).message);
    },
  });

  const deleteEstablishmentMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.configuration.establishments.delete(accessToken, id);
    },
    onSuccess: async () => {
      await query.refetch();
      setSelectedEstablishmentId("");
    },
  });

  const activateEstablishmentMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.configuration.establishments.activate(accessToken, id);
    },
    onSuccess: async () => {
      await query.refetch();
    },
  });

  const deactivateEstablishmentMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.configuration.establishments.deactivate(accessToken, id);
    },
    onSuccess: async () => {
      await query.refetch();
    },
  });

  useEffect(() => {
    if (!dialogOpen || dialogMode !== "edit" || !selectedEstablishment?.id || !selectedEstablishment.logoUrl || logoFile) {
      return;
    }

    let cancelled = false;
    let objectUrl = "";

    api.configuration.establishments.getLogoBlob(accessToken, selectedEstablishment.id)
      .then((blob) => {
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setLogoPreview(objectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setLogoPreview("");
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [accessToken, dialogMode, dialogOpen, logoFile, selectedEstablishment?.id, selectedEstablishment?.logoUrl]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      if (!matchesStatus) {
        return false;
      }

      if (normalizedSearch.length === 0) {
        return true;
      }

      return `${item.code} ${item.name} ${item.shortName ?? ""}`.toLowerCase().includes(normalizedSearch);
    });
  }, [items, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const pageItems = useMemo(
    () => filteredItems.slice(page * pageSize, page * pageSize + pageSize),
    [filteredItems, page, pageSize],
  );
  const allSelectedOnPage = pageItems.length > 0 && pageItems.every((item) => selectedIds.has(item.id));

  useEffect(() => {
    const maxPage = Math.max(totalPages - 1, 0);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setSelectedIds((current) => {
      const validIds = new Set(items.map((item) => item.id));
      const next = new Set(Array.from(current).filter((id) => validIds.has(id)));

      if (next.size === current.size) {
        let unchanged = true;
        for (const id of current) {
          if (!next.has(id)) {
            unchanged = false;
            break;
          }
        }

        if (unchanged) {
          return current;
        }
      }

      return next;
    });
  }, [items]);

  const openCreateDialog = () => {
    if (!canCreateEstablishment) {
      return;
    }

    setDialogMode("create");
    setFormState({ ...EMPTY_ESTABLISHMENT_FORM, code: generateEstablishmentCode() });
    setLogoFile(null);
    setLogoPreview("");
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = () => {
    if (!selectedEstablishment || !canUpdateEstablishment) {
      return;
    }

    setDialogMode("edit");
    setFormState({
      code: selectedEstablishment.code,
      name: selectedEstablishment.name,
      shortName: selectedEstablishment.shortName ?? "",
      addressLine1: selectedEstablishment.addressLine1 ?? "",
      addressLine2: selectedEstablishment.addressLine2 ?? "",
      city: selectedEstablishment.city ?? "",
      country: selectedEstablishment.country ?? "",
      status: selectedEstablishment.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      whatsappPhonePrefix: selectedEstablishment.whatsappPhonePrefix ?? "+237",
      whatsappPhone: selectedEstablishment.whatsappPhone ?? "",
      otherPhonePrefix: selectedEstablishment.otherPhonePrefix ?? "+237",
      otherPhone: selectedEstablishment.otherPhone ?? "",
      email: selectedEstablishment.email ?? "",
    });
    setLogoFile(null);
    setLogoPreview("");
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialogFor = (establishmentId: string) => {
    const target = items.find((item) => item.id === establishmentId);
    if (!target || !canUpdateEstablishment) {
      return;
    }

    setSelectedEstablishmentId(target.id);
    setDialogMode("edit");
    setFormState({
      code: target.code,
      name: target.name,
      shortName: target.shortName ?? "",
      addressLine1: target.addressLine1 ?? "",
      addressLine2: target.addressLine2 ?? "",
      city: target.city ?? "",
      country: target.country ?? "",
      status: target.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      whatsappPhonePrefix: target.whatsappPhonePrefix ?? "+237",
      whatsappPhone: target.whatsappPhone ?? "",
      otherPhonePrefix: target.otherPhonePrefix ?? "+237",
      otherPhone: target.otherPhone ?? "",
      email: target.email ?? "",
    });
    setLogoFile(null);
    setLogoPreview("");
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
    setFormError(null);
    setDialogOpen(true);
  };

  const openViewPage = (establishmentId: string) => {
    const target = items.find((item) => item.id === establishmentId);
    if (!target) {
      return;
    }

    setSelectedEstablishmentId(target.id);
    router.push(`/dashboard/establishments/${target.id}`);
  };

  const toggleSelectAllOnPage = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allSelectedOnPage) {
        pageItems.forEach((item) => next.delete(item.id));
      } else {
        pageItems.forEach((item) => next.add(item.id));
      }
      return next;
    });
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const submitDialog = () => {
    if (formState.name.trim().length === 0) {
      setFormError(locale === "fr" ? "Le nom est obligatoire." : "Name is required.");
      return;
    }

    void saveMutation.mutateAsync({
      mode: dialogMode,
      id: selectedEstablishment?.id,
      values: formState,
    });
  };

  const selectLogoFile = () => {
    logoInputRef.current?.click();
  };

  const onLogoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const normalizedType = file.type.toLowerCase();
    if (!normalizedType.startsWith("image/")) {
      setFormError(locale === "fr" ? "Le logo doit etre une image." : "Logo must be an image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError(locale === "fr" ? "Le logo ne doit pas depasser 5 Mo." : "Logo must not exceed 5 MB.");
      event.target.value = "";
      return;
    }

    void readFileAsDataUrl(file)
      .then((dataUrl) => {
        setLogoFile(file);
        setLogoPreview(dataUrl);
        setFormError(null);
      })
      .catch((error) => {
        setFormError((error as Error).message);
      });
  };

  const clearSelectedLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

  return (
    <div className="grid gap-6">
      <Card className="border-border/60 bg-card/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle>{locale === "fr" ? "Etablissements" : "Establishments"}</CardTitle>
              <CardDescription>
                {locale === "fr"
                  ? "Gérez les fiches d'établissements, puis ouvrez le détail pour consulter ou modifier les informations."
                  : "Manage establishment records, then open the detail view to review or edit information."}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 p-1.5">
              <AppTooltip content={locale === "fr" ? "Afficher/masquer les filtres" : "Show/hide filters"}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 w-9 rounded-xl text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground ${showFilters ? "bg-background/80 text-foreground" : ""}`}
                  onClick={() => setShowFilters((current) => !current)}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </AppTooltip>

              <AppTooltip content={locale === "fr" ? "Actualiser" : "Refresh"}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
                  onClick={() => void query.refetch()}
                  disabled={query.isFetching}
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </AppTooltip>

              <Button size="sm" className="h-9 rounded-xl px-3" onClick={openCreateDialog} disabled={!canCreateEstablishment || !canCreateMultiple}>
                <Plus className="mr-1.5 h-4 w-4" />
                {locale === "fr" ? "Créer" : "Create"}
              </Button>
            </div>
          </div>

          {showFilters ? (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-muted-foreground">{locale === "fr" ? "Recherche" : "Search"}</label>
                <Input
                  value={searchQuery}
                  onChange={(event) => {
                    setPage(0);
                    setSearchQuery(event.target.value);
                  }}
                  placeholder={locale === "fr" ? "Code, nom, nom court..." : "Code, name, short name..."}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{locale === "fr" ? "Statut" : "Status"}</label>
                <SearchableSelect
                  options={[
                    {
                      value: "ALL",
                      label: locale === "fr" ? "Tous" : "All",
                      keywords: ["all", "tous"],
                    },
                    {
                      value: "ACTIVE",
                      label: locale === "fr" ? "Actif" : "Active",
                      keywords: ["active", "actif"],
                    },
                    {
                      value: "INACTIVE",
                      label: locale === "fr" ? "Inactif" : "Inactive",
                      keywords: ["inactive", "inactif"],
                    },
                  ]}
                  value={statusFilter}
                  onValueChange={(value) => {
                    setPage(0);
                    setStatusFilter(value as "ALL" | "ACTIVE" | "INACTIVE");
                  }}
                  placeholder={locale === "fr" ? "Tous" : "All"}
                  searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                />
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{locale === "fr" ? "Total" : "Total"}</p>
              <p className="mt-2 text-2xl font-semibold">{items.length}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{locale === "fr" ? "Fiche active" : "Active record"}</p>
              <p className="mt-2 text-sm font-medium text-foreground">{selectedEstablishment?.code ?? (locale === "fr" ? "Aucun" : "None")}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{locale === "fr" ? "Actions" : "Actions"}</p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {canCreateEstablishment ? (locale === "fr" ? "Création active" : "Create enabled") : (locale === "fr" ? "Lecture seule" : "Read-only")}
              </p>
            </div>
          </div>

        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:hidden">
            {query.isFetching && pageItems.length === 0 ? (
              <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-8 text-center text-sm text-muted-foreground">
                {locale === "fr" ? "Chargement..." : "Loading..."}
              </div>
            ) : query.isError ? (
              <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-8 text-center text-sm text-destructive">
                {locale === "fr" ? "Erreur lors du chargement des etablissements." : "Error loading establishments."}
              </div>
            ) : pageItems.length === 0 ? (
              <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-8 text-center text-sm text-muted-foreground">
                {locale === "fr" ? "Aucun etablissement." : "No establishments."}
              </div>
            ) : (
              pageItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border border-border/70 bg-background/70 p-3 ${selectedIds.has(item.id) ? "ring-1 ring-primary/50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-mono text-xs text-muted-foreground">{item.code}</p>
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.shortName ?? "—"}</p>
                    </div>
                    <Badge variant={statusVariant(item.status)}>{statusLabel(item.status, locale)}</Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelectOne(item.id)}
                        aria-label={locale === "fr" ? `Sélectionner ${item.code}` : `Select ${item.code}`}
                      />
                      {locale === "fr" ? "Sélectionner" : "Select"}
                    </label>

                    <DropdownMenu
                      triggerTooltip={locale === "fr" ? "Actions établissement" : "Establishment actions"}
                      triggerClassName="h-8 w-8 rounded-lg"
                      items={[
                        {
                          label: locale === "fr" ? "Consulter" : "View",
                          icon: Eye,
                          onClick: () => openViewPage(item.id),
                        },
                        {
                          label: locale === "fr" ? "Modifier" : "Edit",
                          icon: Pencil,
                          onClick: () => openEditDialogFor(item.id),
                          disabled: !canUpdateEstablishment,
                        },
                        {
                          label: locale === "fr" ? "Supprimer" : "Delete",
                          icon: Trash2,
                          onClick: () => deleteEstablishmentMutation.mutate(item.id),
                          disabled: !canDeleteEstablishment || deleteEstablishmentMutation.isPending,
                          className: "text-destructive",
                        },
                        item.status === "ACTIVE" ? {
                          label: locale === "fr" ? "Désactiver" : "Deactivate",
                          icon: Power,
                          onClick: () => deactivateEstablishmentMutation.mutate(item.id),
                          disabled: !canChangeStatus || deactivateEstablishmentMutation.isPending,
                        } : {
                          label: locale === "fr" ? "Activer" : "Activate",
                          icon: Power,
                          onClick: () => activateEstablishmentMutation.mutate(item.id),
                          disabled: !canChangeStatus || activateEstablishmentMutation.isPending,
                        },
                      ]}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-border/80 bg-background/70 [overflow-clip-margin:visible] md:block">
            <table className="w-full min-w-3xl text-left text-sm">
              <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelectedOnPage}
                      onChange={toggleSelectAllOnPage}
                      aria-label={locale === "fr" ? "Tout sélectionner" : "Select all"}
                    />
                  </th>
                  <th className="px-3 py-3">{locale === "fr" ? "Code" : "Code"}</th>
                  <th className="px-3 py-3">{locale === "fr" ? "Nom" : "Name"}</th>
                  <th className="px-3 py-3">{locale === "fr" ? "Nom court" : "Short name"}</th>
                  <th className="px-3 py-3">{locale === "fr" ? "Créé par" : "Created by"}</th>
                  <th className="px-3 py-3">{locale === "fr" ? "Modifié par" : "Updated by"}</th>
                  <th className="px-3 py-3">{locale === "fr" ? "Statut" : "Status"}</th>
                  <th className="px-3 py-3">{locale === "fr" ? "Actions" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {query.isFetching && pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                      {locale === "fr" ? "Chargement..." : "Loading..."}
                    </td>
                  </tr>
                ) : query.isError ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-destructive">
                      {locale === "fr" ? "Erreur lors du chargement des etablissements." : "Error loading establishments."}
                    </td>
                  </tr>
                ) : pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                      {locale === "fr" ? "Aucun etablissement." : "No establishments."}
                    </td>
                  </tr>
                ) : (
                  pageItems.map((item) => (
                    <tr key={item.id} className={`border-t border-border/60 ${selectedIds.has(item.id) ? "bg-muted/20" : ""}`}>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelectOne(item.id)}
                          aria-label={locale === "fr" ? `Sélectionner ${item.code}` : `Select ${item.code}`}
                        />
                      </td>
                      <td className="px-3 py-3"><span className="font-mono text-xs">{item.code}</span></td>
                      <td className="px-3 py-3">{item.name}</td>
                      <td className="px-3 py-3">{item.shortName ?? "—"}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{item.createdByLabel ?? "—"}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{item.updatedByLabel ?? "—"}</td>
                      <td className="px-3 py-3"><Badge variant={statusVariant(item.status)}>{statusLabel(item.status, locale)}</Badge></td>
                      <td className="px-3 py-3">
                        <DropdownMenu
                          triggerTooltip={locale === "fr" ? "Actions établissement" : "Establishment actions"}
                          items={[
                            {
                              label: locale === "fr" ? "Consulter" : "View",
                              icon: Eye,
                              onClick: () => openViewPage(item.id),
                            },
                            {
                              label: locale === "fr" ? "Modifier" : "Edit",
                              icon: Pencil,
                              onClick: () => openEditDialogFor(item.id),
                              disabled: !canUpdateEstablishment,
                            },
                            {
                              label: locale === "fr" ? "Supprimer" : "Delete",
                              icon: Trash2,
                              onClick: () => deleteEstablishmentMutation.mutate(item.id),
                              disabled: !canDeleteEstablishment || deleteEstablishmentMutation.isPending,
                              className: "text-destructive",
                            },
                            item.status === "ACTIVE" ? {
                              label: locale === "fr" ? "Désactiver" : "Deactivate",
                              icon: Power,
                              onClick: () => deactivateEstablishmentMutation.mutate(item.id),
                              disabled: !canChangeStatus || deactivateEstablishmentMutation.isPending,
                            } : {
                              label: locale === "fr" ? "Activer" : "Activate",
                              icon: Power,
                              onClick: () => activateEstablishmentMutation.mutate(item.id),
                              disabled: !canChangeStatus || activateEstablishmentMutation.isPending,
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-4 border-t border-border/60 pt-4 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-muted-foreground">
              {selectedIds.size > 0
                ? `${selectedIds.size} ${locale === "fr" ? "ligne(s) sélectionnée(s)" : "row(s) selected"}`
                : `${filteredItems.length} ${locale === "fr" ? "établissement(s)" : "establishment(s)"}`}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{locale === "fr" ? "Lignes par page:" : "Rows per page:"}</span>
              <select
                className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(0);
                }}
              >
                {[10, 20, 50].map((sizeOption) => (
                  <option key={`establishments-page-size-${sizeOption}`} value={sizeOption}>{sizeOption}</option>
                ))}
              </select>

              <span className="mx-1 text-xs text-muted-foreground">
                {locale === "fr" ? "Page" : "Page"} {totalPages === 0 ? 0 : page + 1} / {Math.max(totalPages, 1)}
              </span>

              <Button size="sm" variant="outline" className="h-8 w-8" onClick={() => setPage(0)} disabled={page === 0} aria-label={locale === "fr" ? "Première page" : "First page"}>
                «
              </Button>
              <Button size="sm" variant="outline" className="h-8 w-8" onClick={() => setPage((current) => Math.max(current - 1, 0))} disabled={page === 0} aria-label={locale === "fr" ? "Page précédente" : "Previous page"}>
                ‹
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8"
                onClick={() => setPage((current) => Math.min(current + 1, Math.max(totalPages - 1, 0)))}
                disabled={totalPages === 0 || page >= totalPages - 1}
                aria-label={locale === "fr" ? "Page suivante" : "Next page"}
              >
                ›
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8"
                onClick={() => setPage(Math.max(totalPages - 1, 0))}
                disabled={totalPages === 0 || page >= totalPages - 1}
                aria-label={locale === "fr" ? "Dernière page" : "Last page"}
              >
                »
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>



      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create"
                ? (locale === "fr" ? "Créer un établissement" : "Create establishment")
                : (locale === "fr" ? "Modifier l'établissement" : "Edit establishment")}
            </DialogTitle>
            <DialogDescription>
              {locale === "fr"
                ? "Le code est auto-généré. Complétez les informations obligatoires et optionnelles de l'établissement."
                : "Code is auto-generated. Fill in the required and optional establishment information."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Code" : "Code"}</label>
              <Input disabled value={formState.code} className="bg-muted/50 text-muted-foreground" title={locale === "fr" ? "Auto-généré" : "Auto-generated"} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Nom court" : "Short name"}</label>
              <Input
                value={formState.shortName}
                onChange={(event) => setFormState((current) => ({ ...current, shortName: event.target.value }))}
                placeholder={locale === "fr" ? "Nom lisible court" : "Short readable name"}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Nom" : "Name"}</label>
              <Input
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                placeholder={locale === "fr" ? "Nom complet de l'établissement" : "Full establishment name"}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Email" : "Email"}</label>
              <Input
                type="email"
                value={formState.email}
                onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                placeholder={locale === "fr" ? "contact@etablissement.com" : "contact@establishment.com"}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Adresse ligne 1" : "Address line 1"}</label>
              <Input
                value={formState.addressLine1}
                onChange={(event) => setFormState((current) => ({ ...current, addressLine1: event.target.value }))}
                placeholder={locale === "fr" ? "Rue, numéro" : "Street, number"}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Adresse ligne 2" : "Address line 2"}</label>
              <Input
                value={formState.addressLine2}
                onChange={(event) => setFormState((current) => ({ ...current, addressLine2: event.target.value }))}
                placeholder={locale === "fr" ? "Quartier, immeuble (optionnel)" : "District, building (optional)"}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Pays" : "Country"}</label>
              <SearchableSelect
                options={COUNTRIES_BY_CODE.map((c) => ({
                  value: c.code,
                  label: c.name,
                  keywords: [c.code, c.name],
                }))}
                value={formState.country}
                onValueChange={(value) => setFormState((current) => ({ ...current, country: value, city: "" }))}
                placeholder={locale === "fr" ? "Sélectionner un pays" : "Select a country"}
                searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Ville" : "City"}</label>
              <SearchableSelect
                options={(CITIES_BY_COUNTRY[formState.country] ?? []).map((c) => ({
                  value: c,
                  label: c,
                  keywords: [c],
                }))}
                value={formState.city}
                onValueChange={(value) => setFormState((current) => ({ ...current, city: value }))}
                placeholder={locale === "fr" ? "Sélectionner une ville" : "Select a city"}
                searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                disabled={!formState.country}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">{locale === "fr" ? "WhatsApp" : "WhatsApp"}</label>
              <div className="flex gap-2">
                <SearchableSelect
                  options={phonePrefixes.map((p) => ({
                    value: p.value,
                    label: p.label,
                    keywords: p.keywords,
                  }))}
                  value={formState.whatsappPhonePrefix}
                  onValueChange={(value) => setFormState((current) => ({ ...current, whatsappPhonePrefix: value }))}
                  placeholder={locale === "fr" ? "Indicatif" : "Prefix"}
                  searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                  className="w-40"
                />
                <Input
                  value={formState.whatsappPhone}
                  onChange={(event) => setFormState((current) => ({ ...current, whatsappPhone: event.target.value }))}
                  placeholder={locale === "fr" ? "Numéro" : "Number"}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Autre contact" : "Other contact"}</label>
              <div className="flex gap-2">
                <SearchableSelect
                  options={phonePrefixes.map((p) => ({
                    value: p.value,
                    label: p.label,
                    keywords: p.keywords,
                  }))}
                  value={formState.otherPhonePrefix}
                  onValueChange={(value) => setFormState((current) => ({ ...current, otherPhonePrefix: value }))}
                  placeholder={locale === "fr" ? "Indicatif" : "Prefix"}
                  searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                  className="w-40"
                />
                <Input
                  value={formState.otherPhone}
                  onChange={(event) => setFormState((current) => ({ ...current, otherPhone: event.target.value }))}
                  placeholder={locale === "fr" ? "Numéro" : "Number"}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Logo" : "Logo"}</label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onLogoFileChange}
              />

              <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectLogoFile}>
                    <ImagePlus className="mr-1.5 h-4 w-4" />
                    {logoFile
                      ? (locale === "fr" ? "Remplacer le fichier" : "Replace file")
                      : (locale === "fr" ? "Choisir un fichier" : "Choose a file")}
                  </Button>

                  {logoFile ? (
                    <Button type="button" variant="ghost" size="sm" onClick={clearSelectedLogo}>
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      {locale === "fr" ? "Retirer" : "Remove"}
                    </Button>
                  ) : null}

                  {!logoFile && dialogMode === "edit" && selectedEstablishment?.logoUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteLogoMutation.mutate()}
                      disabled={deleteLogoMutation.isPending}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      {deleteLogoMutation.isPending
                        ? (locale === "fr" ? "Suppression..." : "Deleting...")
                        : (locale === "fr" ? "Supprimer le logo" : "Delete logo")}
                    </Button>
                  ) : null}
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  {locale === "fr"
                    ? "PNG, JPG ou WEBP. Taille maximale: 5 Mo."
                    : "PNG, JPG or WEBP. Max file size: 5 MB."}
                </p>

                {logoFile ? (
                  <p className="mt-2 text-xs text-foreground">{logoFile.name}</p>
                ) : null}

                {logoPreview ? (
                  <div className="mt-3">
                    <img
                      src={logoPreview}
                      alt={locale === "fr" ? "Apercu du logo" : "Logo preview"}
                      className="h-20 w-20 rounded-md border border-border/70 bg-background object-cover"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            {dialogMode === "edit" ? (
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">{locale === "fr" ? "Statut" : "Status"}</label>
                <select
                  value={formState.status}
                  onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value as EstablishmentFormState["status"] }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="ACTIVE">{locale === "fr" ? "Actif" : "Active"}</option>
                  <option value="INACTIVE">{locale === "fr" ? "Inactif" : "Inactive"}</option>
                </select>
              </div>
            ) : null}
          </div>

          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {locale === "fr" ? "Annuler" : "Cancel"}
            </Button>
            <Button
              onClick={submitDialog}
              disabled={saveMutation.isPending || formState.name.trim().length === 0}
            >
              {saveMutation.isPending ? (locale === "fr" ? "Enregistrement..." : "Saving...") : (locale === "fr" ? "Enregistrer" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────── Academic Levels ──────────────────────── */

export function AcademicLevelsPanel({ accessToken, locale }: ConfigSectionPanelProps) {
  const { selectedId, setSelectedId, effectiveId, options, isError: estError } = useEstablishmentSelector(accessToken);
  const query = useQuery({
    queryKey: ["config", "academic-levels", accessToken, effectiveId],
    queryFn: () => api.configuration.academicLevels.list(accessToken, effectiveId),
    enabled: Boolean(accessToken && effectiveId),
  });
  const items = query.data ?? [];
  const rows = items.map((item) => [
    <span key="code" className="font-mono text-xs">{item.code}</span>,
    item.label,
    item.rankOrder ?? "—",
    <Badge key="status" variant={item.active ? "success" : "outline"}>{item.active ? (locale === "fr" ? "Actif" : "Active") : (locale === "fr" ? "Inactif" : "Inactive")}</Badge>,
  ]);

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{locale === "fr" ? "Niveaux academiques" : "Academic levels"}</CardTitle>
          <CardDescription>
            {locale === "fr"
              ? "Niveaux d'etude definis par etablissement."
              : "Study levels defined per establishment."}
          </CardDescription>
        </div>
        <Button size="sm" className="shrink-0" disabled>
          <Plus className="mr-1.5 h-4 w-4" />
          {locale === "fr" ? "Ajouter" : "Add"}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ScopedSelectorBar locale={locale} options={options} value={effectiveId} onChange={setSelectedId} isError={estError} />
        <SectionTable
          locale={locale}
          headers={locale === "fr" ? ["Code", "Libelle", "Ordre", "Statut"] : ["Code", "Label", "Order", "Status"]}
          rows={rows}
          isLoading={query.isLoading}
          isError={query.isError}
          emptyFr="Aucun niveau academique."
          emptyEn="No academic levels."
          errorFr="Erreur lors du chargement."
          errorEn="Error loading data."
        />
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── Program Tracks ───────────────────────── */

export function ProgramTracksPanel({ accessToken, locale }: ConfigSectionPanelProps) {
  const { selectedId, setSelectedId, effectiveId, options, isError: estError } = useEstablishmentSelector(accessToken);
  const query = useQuery({
    queryKey: ["config", "program-tracks", accessToken, effectiveId],
    queryFn: () => api.configuration.programTracks.list(accessToken, effectiveId),
    enabled: Boolean(accessToken && effectiveId),
  });
  const items = query.data ?? [];
  const rows = items.map((item) => [
    <span key="code" className="font-mono text-xs">{item.code}</span>,
    item.name,
    item.description ?? "—",
    <Badge key="status" variant={item.active ? "success" : "outline"}>{item.active ? (locale === "fr" ? "Actif" : "Active") : (locale === "fr" ? "Inactif" : "Inactive")}</Badge>,
  ]);

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{locale === "fr" ? "Filieres" : "Program tracks"}</CardTitle>
          <CardDescription>
            {locale === "fr"
              ? "Filieres de formation disponibles par etablissement."
              : "Training program tracks available per establishment."}
          </CardDescription>
        </div>
        <Button size="sm" className="shrink-0" disabled>
          <Plus className="mr-1.5 h-4 w-4" />
          {locale === "fr" ? "Ajouter" : "Add"}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ScopedSelectorBar locale={locale} options={options} value={effectiveId} onChange={setSelectedId} isError={estError} />
        <SectionTable
          locale={locale}
          headers={locale === "fr" ? ["Code", "Nom", "Description", "Statut"] : ["Code", "Name", "Description", "Status"]}
          rows={rows}
          isLoading={query.isLoading}
          isError={query.isError}
          emptyFr="Aucune filiere."
          emptyEn="No program tracks."
          errorFr="Erreur lors du chargement."
          errorEn="Error loading data."
        />
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── Program Track Levels ─────────────────── */

export function ProgramTrackLevelsPanel({ accessToken, locale }: ConfigSectionPanelProps) {
  const { selectedId, setSelectedId, effectiveId, options, isError: estError } = useEstablishmentSelector(accessToken);
  const tracksQuery = useQuery({
    queryKey: ["config", "program-tracks", accessToken, effectiveId],
    queryFn: () => api.configuration.programTracks.list(accessToken, effectiveId),
    enabled: Boolean(accessToken && effectiveId),
  });
  const levelsQuery = useQuery({
    queryKey: ["config", "academic-levels", accessToken, effectiveId],
    queryFn: () => api.configuration.academicLevels.list(accessToken, effectiveId),
    enabled: Boolean(accessToken && effectiveId),
  });
  const query = useQuery({
    queryKey: ["config", "program-track-levels", accessToken, effectiveId],
    queryFn: () => api.configuration.programTrackLevels.list(accessToken, effectiveId),
    enabled: Boolean(accessToken && effectiveId),
  });

  const tracksMap = useMemo(
    () => Object.fromEntries((tracksQuery.data ?? []).map((t) => [t.id, t.name])),
    [tracksQuery.data],
  );
  const levelsMap = useMemo(
    () => Object.fromEntries((levelsQuery.data ?? []).map((l) => [l.id, l.label])),
    [levelsQuery.data],
  );

  const items = query.data ?? [];
  const rows = items.map((item) => [
    tracksMap[item.programTrackId] ?? <span key="track" className="font-mono text-xs text-muted-foreground">{item.programTrackId.slice(0, 8)}…</span>,
    levelsMap[item.academicLevelId] ?? <span key="level" className="font-mono text-xs text-muted-foreground">{item.academicLevelId.slice(0, 8)}…</span>,
    <Badge key="status" variant={item.openForApplication ? "success" : "outline"}>
      {item.openForApplication ? (locale === "fr" ? "Ouvert" : "Open") : (locale === "fr" ? "Ferme" : "Closed")}
    </Badge>,
  ]);

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{locale === "fr" ? "Niveaux de filiere" : "Program track levels"}</CardTitle>
          <CardDescription>
            {locale === "fr"
              ? "Associations filiere × niveau academique avec statut de candidature."
              : "Program track × academic level associations with application status."}
          </CardDescription>
        </div>
        <Button size="sm" className="shrink-0" disabled>
          <Plus className="mr-1.5 h-4 w-4" />
          {locale === "fr" ? "Ajouter" : "Add"}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ScopedSelectorBar locale={locale} options={options} value={effectiveId} onChange={setSelectedId} isError={estError} />
        <SectionTable
          locale={locale}
          headers={locale === "fr" ? ["Filiere", "Niveau", "Candidature"] : ["Track", "Level", "Application"]}
          rows={rows}
          isLoading={query.isLoading}
          isError={query.isError}
          emptyFr="Aucun niveau de filiere."
          emptyEn="No program track levels."
          errorFr="Erreur lors du chargement."
          errorEn="Error loading data."
        />
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── Acquisition Channels ─────────────────── */

export function AcquisitionChannelsPanel({ accessToken, locale }: ConfigSectionPanelProps) {
  const { selectedId, setSelectedId, effectiveId, options, isError: estError } = useEstablishmentSelector(accessToken);
  const query = useQuery({
    queryKey: ["config", "acquisition-channels", accessToken, effectiveId],
    queryFn: () => api.configuration.acquisitionChannels.list(accessToken, effectiveId),
    enabled: Boolean(accessToken && effectiveId),
  });
  const items = query.data ?? [];
  const rows = items.map((item) => [
    <span key="code" className="font-mono text-xs">{item.code}</span>,
    item.name,
    item.type ?? "—",
    <Badge key="status" variant={item.active ? "success" : "outline"}>{item.active ? (locale === "fr" ? "Actif" : "Active") : (locale === "fr" ? "Inactif" : "Inactive")}</Badge>,
  ]);

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{locale === "fr" ? "Canaux d'acquisition" : "Acquisition channels"}</CardTitle>
          <CardDescription>
            {locale === "fr"
              ? "Canaux par lesquels les candidats sont recrutes."
              : "Channels through which candidates are recruited."}
          </CardDescription>
        </div>
        <Button size="sm" className="shrink-0" disabled>
          <Plus className="mr-1.5 h-4 w-4" />
          {locale === "fr" ? "Ajouter" : "Add"}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ScopedSelectorBar locale={locale} options={options} value={effectiveId} onChange={setSelectedId} isError={estError} />
        <SectionTable
          locale={locale}
          headers={locale === "fr" ? ["Code", "Nom", "Type", "Statut"] : ["Code", "Name", "Type", "Status"]}
          rows={rows}
          isLoading={query.isLoading}
          isError={query.isError}
          emptyFr="Aucun canal d'acquisition."
          emptyEn="No acquisition channels."
          errorFr="Erreur lors du chargement."
          errorEn="Error loading data."
        />
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── Funnel Stages ────────────────────────── */

export function FunnelStagesPanel({ accessToken, locale }: ConfigSectionPanelProps) {
  const { selectedId, setSelectedId, effectiveId, options, isError: estError } = useEstablishmentSelector(accessToken);
  const query = useQuery({
    queryKey: ["config", "funnel-stages", accessToken, effectiveId],
    queryFn: () => api.configuration.funnelStages.list(accessToken, effectiveId),
    enabled: Boolean(accessToken && effectiveId),
  });
  const items = query.data ?? [];
  const rows = items.map((item) => [
    <span key="code" className="font-mono text-xs">{item.code}</span>,
    item.name,
    item.stageType ?? "—",
    item.positionOrder ?? "—",
    <Badge key="status" variant={item.active ? "success" : "outline"}>{item.active ? (locale === "fr" ? "Actif" : "Active") : (locale === "fr" ? "Inactif" : "Inactive")}</Badge>,
  ]);

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{locale === "fr" ? "Etapes du funnel" : "Funnel stages"}</CardTitle>
          <CardDescription>
            {locale === "fr"
              ? "Etapes du processus de recrutement par etablissement."
              : "Recruitment pipeline stages per establishment."}
          </CardDescription>
        </div>
        <Button size="sm" className="shrink-0" disabled>
          <Plus className="mr-1.5 h-4 w-4" />
          {locale === "fr" ? "Ajouter" : "Add"}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ScopedSelectorBar locale={locale} options={options} value={effectiveId} onChange={setSelectedId} isError={estError} />
        <SectionTable
          locale={locale}
          headers={locale === "fr" ? ["Code", "Nom", "Type", "Ordre", "Statut"] : ["Code", "Name", "Type", "Order", "Status"]}
          rows={rows}
          isLoading={query.isLoading}
          isError={query.isError}
          emptyFr="Aucune etape de funnel."
          emptyEn="No funnel stages."
          errorFr="Erreur lors du chargement."
          errorEn="Error loading data."
        />
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── Funnel Stage Transitions ─────────────── */

export function FunnelStageTransitionsPanel({ accessToken, locale }: ConfigSectionPanelProps) {
  const { selectedId, setSelectedId, effectiveId, options, isError: estError } = useEstablishmentSelector(accessToken);
  const stagesQuery = useQuery({
    queryKey: ["config", "funnel-stages", accessToken, effectiveId],
    queryFn: () => api.configuration.funnelStages.list(accessToken, effectiveId),
    enabled: Boolean(accessToken && effectiveId),
  });
  const query = useQuery({
    queryKey: ["config", "funnel-stage-transitions", accessToken, effectiveId],
    queryFn: () => api.configuration.funnelStageTransitions.list(accessToken, effectiveId),
    enabled: Boolean(accessToken && effectiveId),
  });

  const stagesMap = useMemo(
    () => Object.fromEntries((stagesQuery.data ?? []).map((s) => [s.id, s.name])),
    [stagesQuery.data],
  );

  const items = query.data ?? [];
  const rows = items.map((item) => [
    stagesMap[item.fromStageId] ?? <span key="from" className="font-mono text-xs text-muted-foreground">{item.fromStageId.slice(0, 8)}…</span>,
    "→",
    stagesMap[item.toStageId] ?? <span key="to" className="font-mono text-xs text-muted-foreground">{item.toStageId.slice(0, 8)}…</span>,
    <Badge key="status" variant={item.active ? "success" : "outline"}>{item.active ? (locale === "fr" ? "Actif" : "Active") : (locale === "fr" ? "Inactif" : "Inactive")}</Badge>,
  ]);

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{locale === "fr" ? "Transitions du funnel" : "Funnel stage transitions"}</CardTitle>
          <CardDescription>
            {locale === "fr"
              ? "Regles de transition entre les etapes du funnel de recrutement."
              : "Transition rules between recruitment funnel stages."}
          </CardDescription>
        </div>
        <Button size="sm" className="shrink-0" disabled>
          <Plus className="mr-1.5 h-4 w-4" />
          {locale === "fr" ? "Ajouter" : "Add"}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ScopedSelectorBar locale={locale} options={options} value={effectiveId} onChange={setSelectedId} isError={estError} />
        <SectionTable
          locale={locale}
          headers={locale === "fr" ? ["Etape source", "", "Etape destination", "Statut"] : ["From stage", "", "To stage", "Status"]}
          rows={rows}
          isLoading={query.isLoading}
          isError={query.isError}
          emptyFr="Aucune transition."
          emptyEn="No transitions."
          errorFr="Erreur lors du chargement."
          errorEn="Error loading data."
        />
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── Entry Diplomas ───────────────────────── */

type EntryDiplomaFormState = {
  code: string;
  label: string;
  rankOrder: string;
  active: boolean;
};

const EMPTY_DIPLOMA_FORM: EntryDiplomaFormState = {
  code: "",
  label: "",
  rankOrder: "",
  active: true,
};

export function EntryDiplomasPanel({ accessToken, locale }: ConfigSectionPanelProps) {
  const { selectedId, setSelectedId, effectiveId, options, isError: estError } = useEstablishmentSelector(accessToken);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [dialogMode, setDialogMode] = useState<"view" | "create" | "edit">("create");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EntryDiplomaResponse | null>(null);
  const [formState, setFormState] = useState<EntryDiplomaFormState>(EMPTY_DIPLOMA_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [focusedItem, setFocusedItem] = useState<EntryDiplomaResponse | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<DiplomaImportFieldKey, string>>({ code: "", label: "", rankOrder: "", active: "" });
  const [deleteMode, setDeleteMode] = useState<"soft" | "hard">("soft");
  const [importDragOver, setImportDragOver] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const { toast } = useToast();

  const currentUserQuery = useQuery({
    queryKey: ["config", "entry-diplomas", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });
  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);
  const canCreate = hasPermission(permissionSet, "entry_diplomas:create");
  const canUpdate = hasPermission(permissionSet, "entry_diplomas:update");
  const canDelete = hasPermission(permissionSet, "entry_diplomas:delete");
  const canHardDelete = hasPermission(permissionSet, "entry_diplomas:hard_delete");
  const canExport = hasPermission(permissionSet, "entry_diplomas:list");
  const canImport = hasPermission(permissionSet, "entry_diplomas:create");
  const canToggleStatus = hasPermission(permissionSet, "entry_diplomas:activate") || hasPermission(permissionSet, "entry_diplomas:deactivate");

  const query = useQuery({
    queryKey: ["config", "entry-diplomas", accessToken, effectiveId],
    queryFn: () => api.configuration.entryDiplomas.list(accessToken, effectiveId),
    enabled: Boolean(accessToken && effectiveId),
  });

  const items = useMemo(() => query.data ?? [], [query.data]);

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
  }, [effectiveId, page]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateEntryDiplomaRequest) => api.configuration.entryDiplomas.create(accessToken, payload),
    onSuccess: async () => { await query.refetch(); setDialogOpen(false); setFormError(null); },
    onError: (err) => setFormError((err as Error).message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEntryDiplomaRequest }) =>
      api.configuration.entryDiplomas.update(accessToken, id, effectiveId, payload),
    onSuccess: async () => { await query.refetch(); setDialogOpen(false); setFormError(null); },
    onError: (err) => setFormError((err as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.configuration.entryDiplomas.delete(accessToken, id, effectiveId),
    onSuccess: async () => { await query.refetch(); setDeleteTarget(null); setDeleteMode("soft"); },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.configuration.entryDiplomas.activate(accessToken, id, effectiveId),
    onSuccess: () => query.refetch(),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.configuration.entryDiplomas.deactivate(accessToken, id, effectiveId),
    onSuccess: () => query.refetch(),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => api.configuration.entryDiplomas.hardDelete(accessToken, id, effectiveId),
    onSuccess: async () => { await query.refetch(); setDeleteTarget(null); setDeleteMode("soft"); },
  });

  const exportMutation = useMutation({
    mutationFn: () => api.configuration.entryDiplomas.exportExcel(accessToken, effectiveId),
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
    mutationFn: (file: File) => api.configuration.entryDiplomas.importExcel(accessToken, effectiveId, file),
    onSuccess: async (result: EntryDiplomaImportResultResponse) => {
      await query.refetch();
      toast({
        variant: result.failed > 0 ? "error" : "success",
        title: locale === "fr" ? "Import terminé" : "Import complete",
        description: `${result.created} ${locale === "fr" ? "créé(s)" : "created"}, ${result.failed} ${locale === "fr" ? "échec(s)" : "failed"}`,
      });
      setImportDialogOpen(false);
      setImportFileName("");
      setImportHeaders([]);
      setImportRows([]);
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur d'import" : "Import failed", description: (err as Error).message }),
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
    setColumnMapping(buildDiplomaDefaultMapping(headers));
  };

  const submitMappedImport = () => {
    const missingRequired = DIPLOMA_IMPORT_FIELD_ORDER.filter((k) => diplomaImportFieldMeta[k].required && !columnMapping[k]);
    if (missingRequired.length > 0) {
      toast({ variant: "error", title: locale === "fr" ? "Champs requis manquants" : "Missing required fields", description: missingRequired.map((k) => diplomaImportFieldMeta[k].label).join(", ") });
      return;
    }
    const file = buildDiplomaMappedFile(importRows, columnMapping);
    importMutation.mutate(file);
  };

  const openCreateDialog = () => {
    setFormState(EMPTY_DIPLOMA_FORM);
    setFormError(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const openEditDialog = (item: EntryDiplomaResponse) => {
    setFocusedItem(item);
    setFormState({
      code: item.code,
      label: item.label,
      rankOrder: item.rankOrder != null ? String(item.rankOrder) : "",
      active: item.active,
    });
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
      createMutation.mutate({
        establishmentId: effectiveId,
        label: formState.label.trim(),
        rankOrder,
        active: formState.active,
      });
    } else {
      updateMutation.mutate({
        id: focusedItem!.id,
        payload: { label: formState.label.trim(), rankOrder, active: formState.active },
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
    title: locale === "fr" ? "Diplômes d'entrée" : "Entry diplomas",
    subtitle: locale === "fr"
      ? "Gérez les diplômes requis pour accéder aux formations de cet établissement."
      : "Manage the entry diplomas required to access this establishment's programs.",
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
    colCreatedBy: locale === "fr" ? "Créé par" : "Created by",
    colStatus: locale === "fr" ? "Statut" : "Status",
    colActions: locale === "fr" ? "Actions" : "Actions",
    noData: locale === "fr" ? "Aucun diplôme d'entrée." : "No entry diplomas.",
    loadError: locale === "fr" ? "Erreur lors du chargement." : "Error loading data.",
    createTitle: locale === "fr" ? "Nouveau diplôme d'entrée" : "New entry diploma",
    editTitle: locale === "fr" ? "Modifier le diplôme" : "Edit diploma",
    viewTitle: locale === "fr" ? "Détail du diplôme" : "Diploma details",
    fieldCode: "Code",
    fieldLabel: locale === "fr" ? "Libellé" : "Label",
    fieldRank: locale === "fr" ? "Rang (ordre d'élévation)" : "Rank (elevation order)",
    fieldActive: locale === "fr" ? "Actif" : "Active",
    cancel: locale === "fr" ? "Annuler" : "Cancel",
    save: locale === "fr" ? "Enregistrer" : "Save",
    saving: locale === "fr" ? "Enregistrement..." : "Saving...",
    deleteTitle: locale === "fr" ? "Supprimer le diplôme ?" : "Delete diploma?",
    deleteDesc: locale === "fr"
      ? "Cette action est irréversible. Le diplôme sera définitivement supprimé."
      : "This action is irreversible. The diploma will be permanently deleted.",
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
    page: (current: number, total: number) => locale === "fr" ? `Page ${current} / ${total}` : `Page ${current} / ${total}`,
  };


  return (
    <div className="grid gap-6">
      {/* Main table card */}
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
                  onClick={() => void query.refetch()}
                  disabled={query.isFetching}
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </AppTooltip>
              <AppTooltip content={locale === "fr" ? "Télécharger le template" : "Download template"}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
                  onClick={() => templateMutation.mutate()}
                  disabled={templateMutation.isPending}
                >
                  <FileDown className="h-4 w-4" />
                </Button>
              </AppTooltip>
              {canExport && (
                <AppTooltip content={locale === "fr" ? "Exporter en Excel" : "Export to Excel"}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
                    onClick={() => exportMutation.mutate()}
                    disabled={exportMutation.isPending || !effectiveId}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </AppTooltip>
              )}
              {canImport && (
                <AppTooltip content={locale === "fr" ? "Importer depuis Excel" : "Import from Excel"}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
                    onClick={() => setImportDialogOpen(true)}
                    disabled={!effectiveId}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </AppTooltip>
              )}
              {canCreate && (
                <Button size="sm" className="h-9 rounded-xl px-3" onClick={openCreateDialog} disabled={!effectiveId}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  {t.add}
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{locale === "fr" ? "Total" : "Total"}</p>
              <p className="mt-2 text-2xl font-semibold">{filtered.length}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{locale === "fr" ? "Actifs" : "Active"}</p>
              <p className="mt-2 text-2xl font-semibold">{filtered.filter((x) => x.active).length}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{locale === "fr" ? "Inactifs" : "Inactive"}</p>
              <p className="mt-2 text-2xl font-semibold">{filtered.filter((x) => !x.active).length}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4">
          <ScopedSelectorBar
            locale={locale}
            options={options}
            value={effectiveId}
            onChange={(v) => { setSelectedId(v); setPage(0); }}
            isError={estError}
          />

          {showFilters && (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{locale === "fr" ? "Recherche" : "Search"}</label>
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  placeholder={t.searchPlaceholder}
                />
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
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAllOnPage}
                      className="h-4 w-4 rounded border-border accent-primary"
                      aria-label="select all"
                    />
                  </th>
                  <th className="px-3 py-3">{t.colCode}</th>
                  <th className="px-3 py-3">{t.colLabel}</th>
                  <th className="px-3 py-3">{t.colRank}</th>
                  <th className="px-3 py-3">{t.colCreatedBy}</th>
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
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelection(item.id)}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-xs">{item.code}</span>
                    </td>
                    <td className="px-3 py-2.5">{item.label}</td>
                    <td className="px-3 py-2.5">
                      {item.rankOrder != null
                        ? <span className="font-mono text-xs">{item.rankOrder}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{item.createdByLabel ?? "—"}</td>
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
              <p className="text-xs text-muted-foreground">{t.page(page + 1, totalPages)}</p>
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
            <DialogDescription>
              {dialogMode === "create"
                ? (locale === "fr" ? "Renseignez les informations du nouveau diplôme d'entrée." : "Fill in the new entry diploma details.")
                : (locale === "fr" ? "Modifiez les informations du diplôme." : "Update the diploma details.")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {dialogMode === "edit" && focusedItem && (
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">{t.fieldCode}</p>
                <p className="mt-0.5 font-mono text-sm font-medium">{focusedItem.code}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.fieldLabel} *</label>
              <Input
                value={formState.label}
                onChange={(e) => setFormState((s) => ({ ...s, label: e.target.value }))}
                placeholder={locale === "fr" ? "Baccalauréat, BTS, Licence..." : "Bachelor, Associate, Master..."}
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
              <p className="text-xs text-muted-foreground">
                {locale === "fr"
                  ? "Plusieurs diplômes peuvent partager le même rang (ex : GCE et Baccalauréat sont équivalents)."
                  : "Multiple diplomas can share the same rank (e.g. GCE and Baccalauréat are equivalent)."}
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
              <input
                type="checkbox"
                id="diploma-active-chk"
                checked={formState.active}
                onChange={(e) => setFormState((s) => ({ ...s, active: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <label htmlFor="diploma-active-chk" className="cursor-pointer text-sm font-medium">
                {t.fieldActive}
              </label>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isMutating}>{t.cancel}</Button>
            <Button onClick={submitDialog} disabled={isMutating}>
              {isMutating ? t.saving : t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={dialogOpen && dialogMode === "view"} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.viewTitle}</DialogTitle>
            <DialogDescription>
              {locale === "fr" ? "Informations complètes du diplôme d'entrée." : "Full entry diploma details."}
            </DialogDescription>
          </DialogHeader>
          {focusedItem && (
            <div className="grid gap-3 text-sm">
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">{t.fieldCode}</p>
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
                  <div className="mt-1">
                    <Badge variant={focusedItem.active ? "success" : "outline"}>
                      {focusedItem.active ? t.active : t.inactive}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{t.createdAt}</p>
                  <p className="mt-1 text-xs">{new Date(focusedItem.createdAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}</p>
                  {focusedItem.createdByLabel && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{focusedItem.createdByLabel}</p>
                  )}
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                  <p className="text-xs text-muted-foreground">{t.updatedAt}</p>
                  <p className="mt-1 text-xs">{new Date(focusedItem.updatedAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}</p>
                  {focusedItem.updatedByLabel && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{focusedItem.updatedByLabel}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.cancel}</Button>
            {canUpdate && focusedItem && (
              <Button onClick={() => { setDialogOpen(false); setTimeout(() => openEditDialog(focusedItem), 50); }}>
                <Pencil className="mr-1.5 h-4 w-4" />
                {t.tooltipEdit}
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
                <span className="mt-1 block font-mono font-medium text-foreground">
                  {deleteTarget.code} — {deleteTarget.label}
                </span>
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
            setColumnMapping({ code: "", label: "", rankOrder: "", active: "" });
          }
        }}
      >
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{locale === "fr" ? "Importer des diplômes d'entrée" : "Import entry diplomas"}</DialogTitle>
            <DialogDescription>
              {locale === "fr"
                ? "Chargez un fichier Excel et mappez les colonnes aux champs du diplôme."
                : "Upload an Excel file and map the columns to diploma fields."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto pr-1 max-h-[72vh]">
            {/* Drag-and-drop zone */}
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
              className={`rounded-xl border border-dashed p-8 text-center transition-colors ${
                importDragOver ? "border-primary bg-primary/5" : "border-border/70 bg-background/60"
              }`}
            >
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <p className="font-medium">
                {locale === "fr" ? "Glissez-déposez votre fichier ici" : "Drag and drop your file here"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {locale === "fr" ? "Formats acceptés : .xlsx, .xls, .csv" : "Accepted formats: .xlsx, .xls, .csv"}
              </p>
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

            {/* Two-column layout: field status + column mapping */}
            {importHeaders.length > 0 && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                  <p className="mb-1 text-sm font-semibold">{locale === "fr" ? "Champs du modèle" : "Model fields"}</p>
                  <p className="mb-3 text-xs text-muted-foreground">
                    {importFileName} • {importRows.length} {locale === "fr" ? "lignes détectées" : "rows detected"}
                  </p>
                  <div className="max-h-72 space-y-2 overflow-auto pr-1">
                    {DIPLOMA_IMPORT_FIELD_ORDER.map((fieldKey) => {
                      const meta = diplomaImportFieldMeta[fieldKey];
                      return (
                        <div key={fieldKey} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                          <p className="text-sm font-medium">{meta.label}{meta.required ? " *" : ""}</p>
                          <p className="text-xs text-muted-foreground">
                            {columnMapping[fieldKey]
                              ? `${locale === "fr" ? "Mappé sur" : "Mapped to"}: ${importHeaders[Number(columnMapping[fieldKey])] ?? "—"}`
                              : (locale === "fr" ? "Non mappé" : "Not mapped")}
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
                      <Button size="sm" variant="outline" onClick={() => setColumnMapping(buildDiplomaDefaultMapping(importHeaders))}>Auto-map</Button>
                      <Button size="sm" variant="outline" onClick={() => setColumnMapping({ code: "", label: "", rankOrder: "", active: "" })}>Reset</Button>
                    </div>
                  </div>
                  <div className="max-h-72 space-y-3 overflow-auto pr-1">
                    {DIPLOMA_IMPORT_FIELD_ORDER.map((fieldKey) => {
                      const meta = diplomaImportFieldMeta[fieldKey];
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

            {/* Preview table */}
            {importRows.length > 0 && columnMapping.label && (
              <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                <p className="mb-3 text-sm font-semibold">{locale === "fr" ? "Aperçu (5 premières lignes)" : "Preview (first 5 rows)"}</p>
                <div className="max-h-60 overflow-auto rounded-lg border border-border/60">
                  <table className="w-full min-w-max text-left text-xs">
                    <thead className="bg-muted/60 text-muted-foreground">
                      <tr>
                        {DIPLOMA_IMPORT_FIELD_ORDER.map((k) => (
                          <th key={k} className="px-2 py-2 font-medium">{diplomaImportFieldMeta[k].label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0, 5).map((row, ri) => (
                        <tr key={ri} className="border-t border-border/50">
                          {DIPLOMA_IMPORT_FIELD_ORDER.map((k) => {
                            const idx = columnMapping[k];
                            return <td key={k} className="px-2 py-2 text-foreground/90">{idx ? (row[Number(idx)] || "—") : "—"}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false);
                setImportFileName("");
                setImportHeaders([]);
                setImportRows([]);
                setColumnMapping({ code: "", label: "", rankOrder: "", active: "" });
              }}
            >
              {locale === "fr" ? "Annuler" : "Cancel"}
            </Button>
            <Button
              onClick={submitMappedImport}
              disabled={importRows.length === 0 || importMutation.isPending}
            >
              {importMutation.isPending
                ? (locale === "fr" ? "Import en cours..." : "Importing...")
                : (locale === "fr" ? "Importer" : "Import")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
