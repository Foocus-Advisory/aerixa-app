"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Download,
  FileSpreadsheet,
  Filter,
  KeyRound,
  Mail,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  ShieldX,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  UserX,
} from "lucide-react";
import * as XLSX from "xlsx";
import { api, ApiError } from "@/lib/api";
import type { CreateUserRequest, UpdateUserRequest, UserResponse } from "@/lib/types";
import { dictionaries, type Locale } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/components/ui/toast-provider";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { AppTooltip } from "@/components/ui/tooltip";
import { getGradientButtonClass } from "@/lib/button-gradients";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type UsersStatusFilter = "ALL" | "ACTIVE" | "DISABLED" | "PENDING_VERIFICATION" | "DELETED";

type UsersManagementPanelProps = {
  accessToken: string;
  locale: Locale;
  onLog: (entry: string) => void;
};

type UserCreationRole = "ADMIN" | "OPERATOR";
type UserEditRole = "SUPER_ADMIN" | "ADMIN" | "SUPERVISOR" | "OPERATOR";

type CreateUserFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phonePrefix: string;
  phoneNumber: string;
  role: UserCreationRole;
  parentAdminId: string;
};

type EditUserFormState = {
  firstName: string;
  lastName: string;
  username: string;
  phoneNumber: string;
  role: UserEditRole;
};

type DeleteConfirmationMode = "soft" | "hard";

type ImportFieldKey = "email" | "password" | "firstName" | "lastName" | "username" | "phoneNumber" | "roles" | "status";

const PAGE_SIZE = 10;

const IMPORT_FIELD_ORDER: ImportFieldKey[] = [
  "email",
  "password",
  "firstName",
  "lastName",
  "username",
  "phoneNumber",
  "roles",
  "status",
];

const phonePrefixes = [
  { label: "🇨🇲 +237", value: "+237", keywords: ["cameroun", "cameroon", "cm", "+237"] },
  { label: "🇫🇷 +33", value: "+33", keywords: ["france", "fr", "+33"] },
  { label: "🇧🇪 +32", value: "+32", keywords: ["belgique", "belgium", "be", "+32"] },
  { label: "🇨🇦 +1", value: "+1", keywords: ["canada", "ca", "+1"] },
  { label: "🇬🇧 +44", value: "+44", keywords: ["royaume-uni", "uk", "gb", "+44"] },
  { label: "🇨🇮 +225", value: "+225", keywords: ["cote d'ivoire", "ci", "+225"] },
  { label: "🇸🇳 +221", value: "+221", keywords: ["senegal", "sn", "+221"] },
  { label: "🇩🇿 +213", value: "+213", keywords: ["algerie", "algeria", "dz", "+213"] },
  { label: "🇲🇦 +212", value: "+212", keywords: ["maroc", "morocco", "ma", "+212"] },
] as const;

const importFieldMeta: Record<ImportFieldKey, { required: boolean; labelKey: string }> = {
  email: { required: true, labelKey: "usersFieldEmail" },
  password: { required: false, labelKey: "usersFieldPassword" },
  firstName: { required: false, labelKey: "usersFieldFirstName" },
  lastName: { required: false, labelKey: "usersFieldLastName" },
  username: { required: false, labelKey: "usersFieldUsername" },
  phoneNumber: { required: false, labelKey: "usersFieldPhone" },
  roles: { required: false, labelKey: "usersFieldRoles" },
  status: { required: false, labelKey: "usersFieldStatus" },
};

const importHeaderAliases: Record<ImportFieldKey, string[]> = {
  email: ["email", "mail", "e-mail"],
  password: ["password", "motdepasse", "mot_de_passe"],
  firstName: ["firstname", "first_name", "prenom", "givenname"],
  lastName: ["lastname", "last_name", "nom", "surname", "familyname"],
  username: ["username", "login", "identifiant"],
  phoneNumber: ["phonenumber", "phone", "telephone", "tel", "mobile"],
  roles: ["roles", "role", "profil"],
  status: ["status", "statut", "etat"],
};

function buildTemporaryPassword() {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = `${uppercase}${lowercase}${digits}${symbols}`;

  const pick = (pool: string) => pool[Math.floor(Math.random() * pool.length)];
  const chars = [pick(uppercase), pick(lowercase), pick(digits), pick(symbols)];

  for (let i = chars.length; i < 14; i += 1) {
    chars.push(pick(all));
  }

  return chars.sort(() => Math.random() - 0.5).join("");
}

function formatDate(value: string | undefined, locale: Locale, emptyLabel: string) {
  if (!value) {
    return emptyLabel;
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

function fullName(user: UserResponse, fallbackLabel: string) {
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  if (name) {
    return name;
  }
  return fallbackLabel;
}

function initials(user: UserResponse) {
  const source = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "U";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function statusLabel(status: UserResponse["status"], t: Record<string, string>) {
  if (status === "ACTIVE") return t.usersStatusActive;
  if (status === "DISABLED") return t.usersStatusDisabled;
  if (status === "DELETED") return t.usersStatusDeleted;
  return t.usersStatusPending;
}

function roleBadgeClass() {
  return "rounded-md border-border px-2 py-1 text-xs text-muted-foreground h-auto";
}

function statusBadgeClass(user: UserResponse) {
  if (user.deletedAt) {
    return "border border-zinc-300 bg-zinc-100 !text-zinc-900 dark:border-zinc-500/45 dark:bg-zinc-500/20 dark:!text-zinc-50";
  }
  if (user.status === "ACTIVE") {
    return "border border-emerald-200 bg-emerald-100 !text-emerald-900 dark:border-emerald-500/45 dark:bg-emerald-500/20 dark:!text-emerald-50";
  }
  if (user.status === "PENDING_VERIFICATION") {
    return "border border-amber-200 bg-amber-100 !text-amber-900 dark:border-amber-500/45 dark:bg-amber-500/20 dark:!text-amber-50";
  }
  return "border border-rose-200 bg-rose-100 !text-rose-900 dark:border-rose-500/45 dark:bg-rose-500/20 dark:!text-rose-50";
}

function statusDotClass(user: UserResponse) {
  if (user.deletedAt) {
    return "bg-zinc-500 dark:bg-zinc-300";
  }
  if (user.status === "ACTIVE") {
    return "bg-emerald-500 dark:bg-emerald-300";
  }
  if (user.status === "PENDING_VERIFICATION") {
    return "bg-amber-500 dark:bg-amber-300";
  }
  return "bg-rose-500 dark:bg-rose-300";
}

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

function normalizeHeader(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\*/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function buildDefaultMapping(headers: string[]) {
  const normalized = headers.map((header) => normalizeHeader(header));
  const mapping: Record<ImportFieldKey, string> = {
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    username: "",
    phoneNumber: "",
    roles: "",
    status: "",
  };

  IMPORT_FIELD_ORDER.forEach((fieldKey) => {
    const aliases = importHeaderAliases[fieldKey];
    const matchedIndex = normalized.findIndex((value) => aliases.includes(value));
    if (matchedIndex >= 0) {
      mapping[fieldKey] = String(matchedIndex);
    }
  });

  return mapping;
}

function buildMappedImportFile(
  sourceRows: string[][],
  sourceHeaders: string[],
  mapping: Record<ImportFieldKey, string>,
): File {
  const outputRows: string[][] = [];
  outputRows.push(["email", "password", "firstName", "lastName", "username", "phoneNumber", "roles", "status"]);

  sourceRows.forEach((row) => {
    const mappedRow = IMPORT_FIELD_ORDER.map((field) => {
      const mappedIndexRaw = mapping[field];
      if (!mappedIndexRaw) {
        return "";
      }

      const index = Number(mappedIndexRaw);
      if (!Number.isInteger(index) || index < 0 || index >= sourceHeaders.length) {
        return "";
      }

      return `${row[index] ?? ""}`.trim();
    });

    if (mappedRow.some((value) => value.length > 0)) {
      outputRows.push(mappedRow);
    }
  });

  const worksheet = XLSX.utils.aoa_to_sheet(outputRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "import-users-template");
  const outputArray = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new File([outputArray], "users-import-mapped.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function UsersManagementPanel({ accessToken, locale, onLog }: UsersManagementPanelProps) {
  const t = dictionaries[locale];
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [createUserForm, setCreateUserForm] = useState<CreateUserFormState>({
    firstName: "",
    lastName: "",
    email: "",
    phonePrefix: "+237",
    phoneNumber: "",
    role: "ADMIN",
    parentAdminId: "",
  });
  const [editUserForm, setEditUserForm] = useState<EditUserFormState>({
    firstName: "",
    lastName: "",
    username: "",
    phoneNumber: "",
    role: "OPERATOR",
  });
  const [statusFilter, setStatusFilter] = useState<UsersStatusFilter>("ALL");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<DeleteConfirmationMode>("soft");
  const [deleteTargetId, setDeleteTargetId] = useState<string>("");
  const [deleteTargetEmail, setDeleteTargetEmail] = useState<string>("");

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importDragOver, setImportDragOver] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<ImportFieldKey, string>>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    username: "",
    phoneNumber: "",
    roles: "",
    status: "",
  });

  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordTargetId, setResetPasswordTargetId] = useState<string>("");
  const [resetPasswordTargetEmail, setResetPasswordTargetEmail] = useState<string>("");
  const [resetPasswordMode, setResetPasswordMode] = useState<"auto" | "manual">("auto");
  const [resetPasswordManual, setResetPasswordManual] = useState("");
  const [assignRoleDialogOpen, setAssignRoleDialogOpen] = useState(false);
  const [assignRoleTargetId, setAssignRoleTargetId] = useState("");
  const [assignRoleTargetEmail, setAssignRoleTargetEmail] = useState("");
  const [assignRoleValue, setAssignRoleValue] = useState("");

  const importInputRef = useRef<HTMLInputElement | null>(null);

  const usersQuery = useQuery({
    queryKey: ["users", accessToken, page, pageSize, statusFilter],
    queryFn: () => api.users.list(accessToken, page, pageSize, statusFilter),
    enabled: Boolean(accessToken),
  });

  const statsQuery = useQuery({
    queryKey: ["users", "stats", accessToken],
    queryFn: () => api.users.stats(accessToken),
    enabled: Boolean(accessToken),
  });

  const adminsQuery = useQuery({
    queryKey: ["users", "admins", accessToken],
    queryFn: () => api.users.list(accessToken, 0, 200, "ALL"),
    enabled: Boolean(accessToken) && createDialogOpen,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => api.users.toggleStatus(accessToken, id),
    onSuccess: async (user) => {
      onLog(`TOGGLE USER STATUS OK: ${user.email}`);
      await Promise.all([usersQuery.refetch(), statsQuery.refetch()]);
    },
    onError: (error) => {
      onLog(`TOGGLE USER STATUS ERROR: ${(error as Error).message}`);
      toast({
        variant: "error",
        title: t.usersActionFailedTitle,
        description: (error as Error).message,
      });
    },
  });

  const revokeSessionsMutation = useMutation({
    mutationFn: (id: string) => api.users.revokeSessions(accessToken, id),
    onSuccess: (_, id) => {
      const user = usersQuery.data?.content.find((item) => item.id === id);
      onLog(`REVOKE USER SESSIONS OK: ${user?.email ?? id}`);
      toast({
        variant: "success",
        title: t.usersActionRevokeSessions,
        description: user?.email,
      });
    },
    onError: (error) => {
      onLog(`REVOKE USER SESSIONS ERROR: ${(error as Error).message}`);
      toast({
        variant: "error",
        title: t.usersActionFailedTitle,
        description: (error as Error).message,
      });
    },
  });

  const softDeleteMutation = useMutation({
    mutationFn: (id: string) => api.users.softDelete(accessToken, id),
    onSuccess: async () => {
      await Promise.all([usersQuery.refetch(), statsQuery.refetch()]);
      toast({
        variant: "success",
        title: t.usersDeleteSuccess,
      });
    },
    onError: (error) => {
      toast({
        variant: "error",
        title: t.usersDeleteFailed,
        description: (error as Error).message,
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.users.restore(accessToken, id),
    onSuccess: async () => {
      await Promise.all([usersQuery.refetch(), statsQuery.refetch()]);
      toast({
        variant: "success",
        title: t.usersRestoreSuccess,
      });
    },
    onError: (error) => {
      toast({
        variant: "error",
        title: t.usersRestoreFailed,
        description: (error as Error).message,
      });
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => api.users.hardDelete(accessToken, id),
    onSuccess: async () => {
      await Promise.all([usersQuery.refetch(), statsQuery.refetch()]);
      toast({
        variant: "success",
        title: t.usersHardDeleteSuccess,
      });
    },
    onError: (error) => {
      toast({
        variant: "error",
        title: t.usersHardDeleteFailed,
        description: (error as Error).message,
      });
    },
  });

  const resendInitialPasswordMutation = useMutation({
    mutationFn: (id: string) => api.users.resendInitialPassword(accessToken, id),
    onSuccess: (_, id) => {
      const user = usersQuery.data?.content.find((item) => item.id === id);
      toast({
        variant: "success",
        title: t.usersResendSuccess,
        description: user?.email,
      });
    },
    onError: (error) => {
      toast({
        variant: "error",
        title: t.usersResendFailed,
        description: (error as Error).message,
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (vars: { id: string; password?: string }) =>
      api.users.resetPassword(accessToken, vars.id, vars.password),
    onSuccess: (_, { id }) => {
      const user = usersQuery.data?.content.find((item) => item.id === id);
      toast({
        variant: "success",
        title: t.usersResetPasswordSuccess || "Mot de passe réinitialisé",
        description: user?.email,
      });
      setResetPasswordDialogOpen(false);
      setResetPasswordTargetId("");
      setResetPasswordTargetEmail("");
      setResetPasswordMode("auto");
      setResetPasswordManual("");
    },
    onError: (error) => {
      toast({
        variant: "error",
        title: t.usersResetPasswordFailed || "Erreur",
        description: (error as Error).message,
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserRequest }) => api.users.update(accessToken, id, payload),
    onSuccess: async (user) => {
      await Promise.all([usersQuery.refetch(), statsQuery.refetch()]);
      onLog(`UPDATE USER OK: ${user.email}`);
      toast({ variant: "success", title: t.usersUpdateSuccess });
      setEditDialogOpen(false);
      setEditUserId("");
    },
    onError: (error) => {
      toast({
        variant: "error",
        title: t.usersUpdateFailed,
        description: (error as Error).message,
      });
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.users.update(accessToken, id, { roles: [role] }),
    onSuccess: async (user) => {
      await Promise.all([usersQuery.refetch(), statsQuery.refetch()]);
      onLog(`ASSIGN ROLE OK: ${user.email} -> ${user.roles.join(",")}`);
      toast({
        variant: "success",
        title: locale === "fr" ? "Role affecte" : "Role assigned",
        description: user.email,
      });
      setAssignRoleDialogOpen(false);
      setAssignRoleTargetId("");
      setAssignRoleTargetEmail("");
      setAssignRoleValue("");
    },
    onError: (error) => {
      toast({
        variant: "error",
        title: locale === "fr" ? "Affectation impossible" : "Unable to assign role",
        description: (error as Error).message,
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => api.users.exportExcel(accessToken, statusFilter),
    onSuccess: (payload) => {
      triggerDownload(payload.blob, payload.fileName);
      onLog(`EXPORT USERS OK (${statusFilter})`);
      toast({
        variant: "success",
        title: t.usersExportSuccess,
        description: payload.fileName,
      });
    },
    onError: (error) => {
      onLog(`EXPORT USERS ERROR: ${(error as Error).message}`);
      toast({
        variant: "error",
        title: t.usersExportFailed,
        description: (error as Error).message,
      });
    },
  });

  const templateMutation = useMutation({
    mutationFn: () => api.users.importTemplate(accessToken),
    onSuccess: (payload) => {
      triggerDownload(payload.blob, payload.fileName);
      onLog("DOWNLOAD USERS TEMPLATE OK");
    },
    onError: (error) => {
      onLog(`DOWNLOAD USERS TEMPLATE ERROR: ${(error as Error).message}`);
      toast({
        variant: "error",
        title: t.usersDownloadFailed,
        description: (error as Error).message,
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => api.users.importExcel(accessToken, file),
    onSuccess: async (result) => {
      await Promise.all([usersQuery.refetch(), statsQuery.refetch()]);
      onLog(`IMPORT USERS OK: ${result.created}/${result.totalRows}`);
      toast({
        variant: result.failed > 0 ? "error" : "success",
        title: t.usersImportSuccess,
        description: `${result.created} ${t.usersImportCreatedLabel}, ${result.failed} ${t.usersImportFailedLabel}`,
      });

      if (result.errors.length > 0) {
        const details = result.errors.slice(0, 2).join(" | ");
        toast({
          variant: "error",
          title: t.usersImportDetails,
          description: details,
        });
      }

      setImportDialogOpen(false);
      setImportFileName("");
      setImportHeaders([]);
      setImportRows([]);
    },
    onError: (error) => {
      const description =
        error instanceof ApiError
          ? error.message
          : t.usersImportFailed;

      onLog(`IMPORT USERS ERROR: ${description}`);
      toast({
        variant: "error",
        title: t.usersImportFailed,
        description,
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (payload: CreateUserRequest) => {
      const created = await api.users.create(accessToken, payload);
      let invitationError: string | null = null;

      try {
        await api.auth.passwordResetRequest(payload.email);
      } catch (error) {
        invitationError = (error as Error).message;
      }

      return { created, invitationError };
    },
    onSuccess: async ({ created: user, invitationError }) => {
      await Promise.all([usersQuery.refetch(), statsQuery.refetch(), adminsQuery.refetch()]);
      onLog(`CREATE USER OK: ${user.email}`);

      if (invitationError) {
        onLog(`CREATE USER WARNING: invitation email failed - ${invitationError}`);
        toast({
          variant: "error",
          title: t.usersCreatedWithMailPending,
          description: t.usersCreatedWithMailPendingDescription,
        });
      } else {
        toast({
          variant: "success",
          title: t.usersCreatedSuccess,
          description: t.usersCreatedSuccessDescription,
        });
      }

      setCreateDialogOpen(false);
      setCreateUserForm({
        firstName: "",
        lastName: "",
        email: "",
        phonePrefix: "+237",
        phoneNumber: "",
        role: "ADMIN",
        parentAdminId: "",
      });
    },
    onError: (error) => {
      const description =
        error instanceof ApiError
          ? error.message
          : t.usersCreateFailed;
      onLog(`CREATE USER ERROR: ${description}`);
      toast({
        variant: "error",
        title: t.usersCreateFailed,
        description,
      });
    },
  });

  const users = useMemo(() => usersQuery.data?.content ?? [], [usersQuery.data?.content]);
  const assignableRoleOptions = useMemo(() => {
    const defaults = ["SUPER_ADMIN", "ADMIN", "SUPERVISOR", "OPERATOR"];
    const fromUsers = users.flatMap((user) => user.roles ?? []);
    return Array.from(new Set([...defaults, ...fromUsers]));
  }, [users]);
  const adminOptions = useMemo(
    () =>
      (adminsQuery.data?.content ?? [])
        .filter((user) => user.roles.includes("ADMIN") || user.roles.includes("SUPER_ADMIN"))
        .map((user) => ({
          value: user.id,
          label: `${fullName(user, locale)} - ${user.email}`,
          keywords: [user.email, ...(user.roles ?? [])],
        })),
    [adminsQuery.data?.content, locale],
  );

  const createUserFormReady =
    createUserForm.firstName.trim().length > 0
    && createUserForm.lastName.trim().length > 0
    && createUserForm.email.trim().length > 0
    && createUserForm.phoneNumber.trim().length > 0
    && (createUserForm.role !== "OPERATOR" || createUserForm.parentAdminId.trim().length > 0);

  const totalPages = usersQuery.data?.totalPages ?? 0;
  const totalElements = usersQuery.data?.totalElements ?? 0;

  const allSelected = useMemo(
    () => users.length > 0 && users.every((user) => selectedIds.has(user.id)),
    [selectedIds, users],
  );

  const selectedCount = selectedIds.size;

  const stats = statsQuery.data;

  const toggleSelection = (id: string) => {
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

  const toggleSelectAllOnPage = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allSelected) {
        users.forEach((user) => next.delete(user.id));
      } else {
        users.forEach((user) => next.add(user.id));
      }
      return next;
    });
  };

  const submitCreateUser = () => {
    if (!createUserFormReady) {
      toast({
        variant: "error",
        title: t.usersFormIncompleteTitle,
        description: t.usersFormIncompleteDescription,
      });
      return;
    }

    const sanitizedPhoneNumber = createUserForm.phoneNumber.replace(/\s+/g, "").trim();

    const payload: CreateUserRequest = {
      email: createUserForm.email.trim(),
      firstName: createUserForm.firstName.trim(),
      lastName: createUserForm.lastName.trim(),
      phoneNumber: `${createUserForm.phonePrefix}${sanitizedPhoneNumber}`,
      roles: [createUserForm.role],
      password: buildTemporaryPassword(),
      parentAdminId:
        createUserForm.role === "OPERATOR" && createUserForm.parentAdminId.trim().length > 0
          ? createUserForm.parentAdminId
          : undefined,
    };

    createUserMutation.mutate(payload);
  };

  const openEditDialog = (user: UserResponse) => {
    setEditUserId(user.id);
    setEditUserForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      username: user.username ?? "",
      phoneNumber: user.phoneNumber ?? "",
      role: (user.roles[0] as UserEditRole | undefined) ?? "OPERATOR",
    });
    setEditDialogOpen(true);
  };

  const submitEditUser = () => {
    if (!editUserId) {
      return;
    }

    const payload: UpdateUserRequest = {
      firstName: editUserForm.firstName.trim(),
      lastName: editUserForm.lastName.trim(),
      username: editUserForm.username.trim() || undefined,
      phoneNumber: editUserForm.phoneNumber.trim() || undefined,
      roles: [editUserForm.role],
    };

    updateUserMutation.mutate({ id: editUserId, payload });
  };

  const parseImportFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error(t.usersExcelSheetNotFound);
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    if (rows.length < 1) {
      throw new Error(t.usersEmptyFile);
    }

    const headers = rows[0].map((cell) => `${cell ?? ""}`.trim()).filter((header) => header.length > 0);
    if (headers.length === 0) {
      throw new Error(t.usersHeadersNotDetected);
    }

    const dataRows = rows
      .slice(1)
      .map((line) => line.map((cell) => `${cell ?? ""}`.trim()))
      .filter((line) => line.some((cell) => cell.length > 0));

    setImportFileName(file.name);
    setImportHeaders(headers);
    setImportRows(dataRows);
    setColumnMapping(buildDefaultMapping(headers));
  };

  const onImportFilePicked = async (file: File | null) => {
    if (!file) {
      return;
    }

    try {
      await parseImportFile(file);
    } catch (error) {
      toast({
        variant: "error",
        title: t.usersInvalidFile,
        description: (error as Error).message,
      });
    }
  };

  const submitMappedImport = () => {
    const missingRequired = IMPORT_FIELD_ORDER.filter((fieldKey) => importFieldMeta[fieldKey].required && !columnMapping[fieldKey]);
    if (missingRequired.length > 0) {
      toast({
        variant: "error",
        title: t.usersMissingColumns,
        description: t.usersMissingColumnsDescription,
      });
      return;
    }

    const file = buildMappedImportFile(importRows, importHeaders, columnMapping);
    importMutation.mutate(file);
  };

  const mappedPreviewRows = useMemo(() => {
    if (importRows.length === 0) {
      return [] as string[][];
    }

    return importRows.slice(0, 10).map((row) =>
      IMPORT_FIELD_ORDER.map((field) => {
        const mappedIndexRaw = columnMapping[field];
        if (!mappedIndexRaw) {
          return "";
        }

        const index = Number(mappedIndexRaw);
        if (!Number.isInteger(index) || index < 0 || index >= importHeaders.length) {
          return "";
        }

        return `${row[index] ?? ""}`.trim();
      }),
    );
  }, [columnMapping, importHeaders, importRows]);

  const getMappedHeaderLabel = (mappedIndexRaw: string) => {
    if (!mappedIndexRaw) {
      return "";
    }

    const index = Number(mappedIndexRaw);
    if (!Number.isInteger(index) || index < 0 || index >= importHeaders.length) {
      return "";
    }

    return importHeaders[index] || "";
  };

  const openDeleteConfirmation = (id: string, email: string, mode: DeleteConfirmationMode) => {
    setDeleteTargetId(id);
    setDeleteTargetEmail(email);
    setDeleteMode(mode);
    setDeleteConfirmOpen(true);
  };

  const openResetPasswordDialog = (id: string, email: string) => {
    setResetPasswordTargetId(id);
    setResetPasswordTargetEmail(email);
    setResetPasswordMode("auto");
    setResetPasswordManual("");
    setResetPasswordDialogOpen(true);
  };

  const openAssignRoleDialog = (user: UserResponse) => {
    setAssignRoleTargetId(user.id);
    setAssignRoleTargetEmail(user.email);
    setAssignRoleValue(user.roles[0] ?? "OPERATOR");
    setAssignRoleDialogOpen(true);
  };

  const confirmAssignRole = () => {
    if (!assignRoleTargetId || !assignRoleValue) {
      return;
    }

    assignRoleMutation.mutate({
      id: assignRoleTargetId,
      role: assignRoleValue,
    });
  };

  const confirmResetPassword = () => {
    if (!resetPasswordTargetId) {
      return;
    }

    const password = resetPasswordMode === "auto" ? undefined : resetPasswordManual.trim();
    if (resetPasswordMode === "manual" && !password) {
      toast({
        variant: "error",
        title: "Erreur",
        description: "Veuillez entrer un mot de passe temporaire",
      });
      return;
    }

    resetPasswordMutation.mutate({ id: resetPasswordTargetId, password });
  };

  const confirmDelete = () => {
    if (!deleteTargetId) {
      return;
    }

    if (deleteMode === "hard") {
      hardDeleteMutation.mutate(deleteTargetId);
    } else {
      softDeleteMutation.mutate(deleteTargetId);
    }

    setDeleteConfirmOpen(false);
    setDeleteTargetId("");
    setDeleteTargetEmail("");
  };

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>{t.usersPanelTitle}</CardTitle>
            <CardDescription>{t.usersPanelSubtitle}</CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 p-1.5">
            <AppTooltip content={t.usersFiltersToggle}>
              <Button
                variant="ghost"
                size="sm"
                className={`h-9 w-9 rounded-xl text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground ${showFilters ? "bg-background/80 text-foreground" : ""}`}
                onClick={() => setShowFilters((value) => !value)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </AppTooltip>

            <AppTooltip content={t.usersActionRefresh}>
              <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground" onClick={() => usersQuery.refetch()}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </AppTooltip>

            <AppTooltip content={t.usersActionTemplate}>
              <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground" onClick={() => templateMutation.mutate()} disabled={templateMutation.isPending}>
                <FileSpreadsheet className="h-4 w-4" />
              </Button>
            </AppTooltip>

            <AppTooltip content={t.usersActionExport}>
              <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
                <Download className="h-4 w-4" />
              </Button>
            </AppTooltip>

            <AppTooltip content={t.usersActionImport}>
              <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground" onClick={() => setImportDialogOpen(true)} disabled={importMutation.isPending}>
                <Upload className="h-4 w-4" />
              </Button>
            </AppTooltip>

            <AppTooltip content={t.usersActionAddUser}>
              <Button className={getGradientButtonClass("primary")} onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                {t.usersActionAdd}
              </Button>
            </AppTooltip>
          </div>
        </div>

        {showFilters ? (
          <Tabs
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as UsersStatusFilter);
              setPage(0);
            }}
          >
            <TabsList className="h-auto rounded-xl border border-border/80 bg-background/70 p-1.5">
              <TabsTrigger className="min-h-9 px-3.5 text-sm" value="ALL" badge={stats?.total ?? 0}>{t.usersFilterAll}</TabsTrigger>
              <TabsTrigger className="min-h-9 px-3.5 text-sm" value="ACTIVE" badge={stats?.active ?? 0}>{t.usersFilterActive}</TabsTrigger>
              <TabsTrigger className="min-h-9 px-3.5 text-sm" value="DISABLED" badge={stats?.disabled ?? 0}>{t.usersFilterDisabled}</TabsTrigger>
              <TabsTrigger className="min-h-9 px-3.5 text-sm" value="PENDING_VERIFICATION" badge={stats?.pendingVerification ?? 0}>
                {t.usersFilterPending}
              </TabsTrigger>
              <TabsTrigger className="min-h-9 px-3.5 text-sm" value="DELETED" badge={stats?.deleted ?? 0}>
                {t.usersFilterDeleted}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.usersCreateTitle}</DialogTitle>
              <DialogDescription>{t.usersCreateDescription}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-foreground">{t.usersLabelLastName}</label>
                <Input
                  value={createUserForm.lastName}
                  onChange={(event) => setCreateUserForm((current) => ({ ...current, lastName: event.target.value }))}
                  placeholder={t.usersPlaceholderLastName}
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-foreground">{t.usersLabelFirstName}</label>
                <Input
                  value={createUserForm.firstName}
                  onChange={(event) => setCreateUserForm((current) => ({ ...current, firstName: event.target.value }))}
                  placeholder={t.usersPlaceholderFirstName}
                />
              </div>

              <div className="grid gap-1.5 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  value={createUserForm.email}
                  onChange={(event) => setCreateUserForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="name@aerixa.com"
                />
              </div>

              <div className="grid gap-1.5 md:col-span-2">
                <label className="text-sm font-medium text-foreground">{t.usersLabelPhone}</label>
                <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr]">
                  <SearchableSelect
                    options={phonePrefixes.map((item) => ({ label: item.label, value: item.value, keywords: [...item.keywords] }))}
                    value={createUserForm.phonePrefix}
                    onValueChange={(value) => setCreateUserForm((current) => ({ ...current, phonePrefix: value }))}
                    placeholder={t.authCountryCodePlaceholder}
                    searchPlaceholder={t.authCountrySearchPlaceholder}
                  />
                  <Input
                    value={createUserForm.phoneNumber}
                    onChange={(event) => setCreateUserForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                    placeholder={t.usersPlaceholderPhone}
                  />
                </div>
              </div>

              <div className="grid gap-1.5 md:col-span-2">
                <label className="text-sm font-medium text-foreground">{t.usersLabelRole}</label>
                <SearchableSelect
                  value={createUserForm.role}
                  onValueChange={(value) => {
                    const role = value as UserCreationRole;
                    setCreateUserForm((current) => ({
                      ...current,
                      role,
                      parentAdminId: role === "OPERATOR" ? current.parentAdminId : "",
                    }));
                  }}
                  options={[
                    { value: "ADMIN", label: "ADMIN" },
                    { value: "OPERATOR", label: "OPERATOR" },
                  ]}
                  placeholder={t.usersPlaceholderSelectRole}
                />
              </div>

              {createUserForm.role === "OPERATOR" ? (
                <div className="grid gap-1.5 md:col-span-2">
                  <label className="text-sm font-medium text-foreground">{t.usersLabelParentAdmin}</label>
                  <SearchableSelect
                    value={createUserForm.parentAdminId}
                    onValueChange={(value) => setCreateUserForm((current) => ({ ...current, parentAdminId: value }))}
                    options={adminOptions}
                    placeholder={t.usersPlaceholderSelectParentAdmin}
                    searchPlaceholder={t.usersPlaceholderSearchAdmin}
                  />
                </div>
              ) : null}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={createUserMutation.isPending}>
                {t.usersCancel}
              </Button>
              <Button className={getGradientButtonClass("primary")} onClick={submitCreateUser} disabled={!createUserFormReady || createUserMutation.isPending}>
                <UserPlus className="h-4 w-4" />
                {createUserMutation.isPending
                  ? t.usersCreating
                  : t.usersCreate}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.usersEditTitle}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-foreground">{t.usersLabelLastName}</label>
                <Input value={editUserForm.lastName} onChange={(event) => setEditUserForm((current) => ({ ...current, lastName: event.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-foreground">{t.usersLabelFirstName}</label>
                <Input value={editUserForm.firstName} onChange={(event) => setEditUserForm((current) => ({ ...current, firstName: event.target.value }))} />
              </div>
              <div className="grid gap-1.5 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Username</label>
                <Input value={editUserForm.username} onChange={(event) => setEditUserForm((current) => ({ ...current, username: event.target.value }))} />
              </div>
              <div className="grid gap-1.5 md:col-span-2">
                <label className="text-sm font-medium text-foreground">{t.usersFieldPhone}</label>
                <Input value={editUserForm.phoneNumber} onChange={(event) => setEditUserForm((current) => ({ ...current, phoneNumber: event.target.value }))} />
              </div>
              <div className="grid gap-1.5 md:col-span-2">
                <label className="text-sm font-medium text-foreground">{t.usersLabelRole}</label>
                <SearchableSelect
                  value={editUserForm.role}
                  onValueChange={(value) => setEditUserForm((current) => ({ ...current, role: value as UserEditRole }))}
                  options={[
                    { value: "SUPER_ADMIN", label: "SUPER_ADMIN" },
                    { value: "ADMIN", label: "ADMIN" },
                    { value: "SUPERVISOR", label: "SUPERVISOR" },
                    { value: "OPERATOR", label: "OPERATOR" },
                  ]}
                  placeholder="Role"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={updateUserMutation.isPending}>
                {t.usersCancel}
              </Button>
              <Button className={getGradientButtonClass("primary")} onClick={submitEditUser} disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? t.usersSaving : t.usersSave}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {deleteMode === "hard" ? t.usersConfirmHardDeleteTitle : t.usersConfirmSoftDeleteTitle}
              </DialogTitle>
              <DialogDescription>
                {deleteMode === "hard" ? t.usersConfirmHardDeleteDescription : t.usersConfirmSoftDeleteDescription}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              {deleteTargetEmail}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                {t.usersCancel}
              </Button>
              <Button
                className={getGradientButtonClass("destructive")}
                onClick={confirmDelete}
                disabled={softDeleteMutation.isPending || hardDeleteMutation.isPending}
              >
                {deleteMode === "hard" ? t.usersConfirmHardDeleteAction : t.usersConfirmSoftDeleteAction}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={assignRoleDialogOpen} onOpenChange={setAssignRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{locale === "fr" ? "Affecter un role" : "Assign role"}</DialogTitle>
              <DialogDescription>
                {locale === "fr"
                  ? "Selectionnez le role principal a attribuer a cet utilisateur."
                  : "Select the primary role to assign to this user."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3">
              <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                {assignRoleTargetEmail}
              </div>
              <SearchableSelect
                value={assignRoleValue}
                onValueChange={(value) => setAssignRoleValue(value)}
                options={assignableRoleOptions.map((role) => ({
                  value: role,
                  label: role,
                  keywords: [role],
                }))}
                placeholder={locale === "fr" ? "Selectionner un role" : "Select a role"}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignRoleDialogOpen(false)}>
                {t.usersCancel}
              </Button>
              <Button
                className={getGradientButtonClass("primary")}
                onClick={confirmAssignRole}
                disabled={!assignRoleValue || assignRoleMutation.isPending}
              >
                <KeyRound className="h-4 w-4" />
                {assignRoleMutation.isPending
                  ? (locale === "fr" ? "Affectation..." : "Assigning...")
                  : (locale === "fr" ? "Affecter" : "Assign")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>{t.usersImportTitle}</DialogTitle>
              <DialogDescription>{t.usersImportDescription}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 overflow-y-auto pr-1 max-h-[72vh]">
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setImportDragOver(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setImportDragOver(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setImportDragOver(false);
                  const file = event.dataTransfer.files?.[0] ?? null;
                  onImportFilePicked(file);
                }}
                className={`rounded-xl border border-dashed p-8 text-center transition-colors ${
                  importDragOver ? "border-primary bg-primary/5" : "border-border/70 bg-background/60"
                }`}
              >
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="font-medium">{t.usersImportDropTitle}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t.usersImportDropSubtitle}</p>
                <Button variant="outline" className="mt-4" onClick={() => importInputRef.current?.click()}>
                  {t.usersChooseFile}
                </Button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(event) => {
                    void onImportFilePicked(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                />
              </div>

              {importHeaders.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                    <p className="mb-1 text-sm font-semibold">{t.usersModelFields}</p>
                    <p className="mb-3 text-xs text-muted-foreground">{importFileName} • {importRows.length} {t.usersRowsDetected}</p>
                    <div className="space-y-2 max-h-90 overflow-auto pr-1">
                      {IMPORT_FIELD_ORDER.map((fieldKey) => {
                        const meta = importFieldMeta[fieldKey];
                        return (
                          <div key={fieldKey} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                            <p className="text-sm font-medium">{t[meta.labelKey]}{meta.required ? " *" : ""}</p>
                            <p className="text-xs text-muted-foreground">
                              {columnMapping[fieldKey]
                                ? `${t.usersMapped}: ${getMappedHeaderLabel(columnMapping[fieldKey])}`
                                : t.usersNotMapped}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{t.usersColumnMapping}</p>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setColumnMapping(buildDefaultMapping(importHeaders))}
                        >
                          Auto-map
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setColumnMapping({
                              email: "",
                              password: "",
                              firstName: "",
                              lastName: "",
                              username: "",
                              phoneNumber: "",
                              roles: "",
                              status: "",
                            })
                          }
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-3 max-h-90 overflow-auto pr-1">
                      {IMPORT_FIELD_ORDER.map((fieldKey) => {
                        const meta = importFieldMeta[fieldKey];
                        return (
                          <div key={fieldKey} className="space-y-1">
                            <label className="text-sm font-medium">
                              {t[meta.labelKey]}{meta.required ? " *" : ""}
                            </label>
                            <select
                              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                              value={columnMapping[fieldKey] || ""}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                setColumnMapping((current) => ({ ...current, [fieldKey]: nextValue }));
                              }}
                            >
                              <option value="">{t.usersDoNotImport}</option>
                              {importHeaders.map((header, headerIndex) => (
                                <option key={`${fieldKey}-${headerIndex}`} value={String(headerIndex)}>
                                  {header}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              {mappedPreviewRows.length > 0 ? (
                <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                  <p className="mb-3 text-sm font-semibold">{t.usersPreviewTitle}</p>
                  <div className="overflow-auto max-h-70 rounded-lg border border-border/60">
                    <table className="w-full min-w-4xl text-left text-xs">
                      <thead className="bg-muted/60 text-muted-foreground">
                        <tr>
                          {IMPORT_FIELD_ORDER.map((fieldKey) => {
                            const meta = importFieldMeta[fieldKey];
                            return (
                              <th key={`preview-header-${fieldKey}`} className="px-2 py-2 font-medium">
                                {t[meta.labelKey]}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {mappedPreviewRows.map((row, rowIndex) => (
                          <tr key={`preview-row-${rowIndex}`} className="border-t border-border/50">
                            {row.map((cell, cellIndex) => (
                              <td key={`preview-cell-${rowIndex}-${cellIndex}`} className="px-2 py-2 text-foreground/90">
                                {cell || "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                {t.usersClose}
              </Button>
              <Button
                className={getGradientButtonClass("primary")}
                onClick={submitMappedImport}
                disabled={importRows.length === 0 || importMutation.isPending}
              >
                {importMutation.isPending ? t.usersImporting : t.usersActionImport}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
              <DialogDescription>
                L&apos;utilisateur recevra un email avec ses identifiants de connexion et un mot de passe temporaire. À la connexion, il sera invité à définir un nouveau mot de passe.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              {resetPasswordTargetEmail}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="reset-auto"
                  name="reset-mode"
                  value="auto"
                  checked={resetPasswordMode === "auto"}
                  onChange={() => setResetPasswordMode("auto")}
                />
                <label htmlFor="reset-auto" className="text-sm font-medium cursor-pointer">
                  Générer automatiquement un mot de passe temporaire
                </label>
              </div>
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  id="reset-manual"
                  name="reset-mode"
                  value="manual"
                  checked={resetPasswordMode === "manual"}
                  onChange={() => setResetPasswordMode("manual")}
                  className="mt-2"
                />
                <div className="flex-1">
                  <label htmlFor="reset-manual" className="text-sm font-medium cursor-pointer">
                    Définir un mot de passe temporaire personnalisé
                  </label>
                  {resetPasswordMode === "manual" && (
                    <Input
                      type="password"
                      placeholder="Mot de passe temporaire"
                      value={resetPasswordManual}
                      onChange={(e) => setResetPasswordManual(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
                {t.usersCancel}
              </Button>
              <Button
                className={getGradientButtonClass("primary")}
                onClick={confirmResetPassword}
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? "Réinitialisation..." : "Réinitialiser"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="overflow-x-auto rounded-xl border border-border/80 bg-background/70 [overflow-clip-margin:visible]">
          <table className="w-full min-w-5xl text-left text-sm">
            <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-3">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAllOnPage} aria-label="select all" />
                </th>
                <th className="px-3 py-3">{t.usersTableName}</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">{t.usersTableStatus}</th>
                <th className="px-3 py-3">{t.usersTableRole}</th>
                <th className="px-3 py-3">{t.usersTableParentAdmin}</th>
                <th className="px-3 py-3">{t.usersTableLastLogin}</th>
                <th className="px-3 py-3">{t.usersTableCreatedAt}</th>
                <th className="px-3 py-3">{t.usersTableActions}</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.isFetching && users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                    {t.usersLoading}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                    {t.usersNoData}
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isDeleted = Boolean(user.deletedAt);
                  const canResendInitialPassword = !isDeleted && !user.lastLoginAt && user.mustChangePassword;

                  return (
                    <tr key={user.id} className="border-t border-border/60 align-top">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(user.id)}
                          onChange={() => toggleSelection(user.id)}
                          aria-label={`select ${user.email}`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {initials(user)}
                          </span>
                          <span className="font-medium">{fullName(user, t.usersNameMissing)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-3 py-3">
                        <Badge
                          variant="outline"
                          className={`h-7 gap-1.5 rounded-full px-3 py-0 text-[12px] font-medium leading-none ${statusBadgeClass(user)}`}
                        >
                          <span className={`h-1.75 w-1.75 rounded-full ${statusDotClass(user)}`} />
                          {isDeleted ? t.usersStatusDeleted : statusLabel(user.status, t)}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Badge key={`${user.id}-${role}`} variant="outline" className={`${roleBadgeClass()}`}>
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {user.parentAdminDisplayName || user.parentAdminEmail || t.usersNoParentAdmin}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{formatDate(user.lastLoginAt, locale, t.usersNever)}</td>
                      <td className="px-3 py-3 text-muted-foreground">{formatDate(user.createdAt, locale, t.usersNever)}</td>
                      <td className="px-3 py-3">
                        <DropdownMenu
                          triggerTooltip={t.usersActionsMenu}
                          items={isDeleted
                            ? [
                                {
                                  label: t.usersActionRestore,
                                  icon: RotateCcw,
                                  onClick: () => restoreMutation.mutate(user.id),
                                  disabled: restoreMutation.isPending,
                                },
                                {
                                  label: t.usersActionHardDelete,
                                  icon: Trash2,
                                  variant: "destructive",
                                  onClick: () => openDeleteConfirmation(user.id, user.email, "hard"),
                                  disabled: hardDeleteMutation.isPending,
                                },
                              ]
                            : [
                                {
                                  label: t.usersActionEdit,
                                  icon: Pencil,
                                  onClick: () => openEditDialog(user),
                                  disabled: updateUserMutation.isPending,
                                },
                                {
                                  label: locale === "fr" ? "Affecter role" : "Assign role",
                                  icon: KeyRound,
                                  onClick: () => openAssignRoleDialog(user),
                                  disabled: assignRoleMutation.isPending,
                                },
                                {
                                  label: t.usersActionDelete,
                                  icon: Trash2,
                                  variant: "destructive",
                                  onClick: () => openDeleteConfirmation(user.id, user.email, "soft"),
                                  disabled: softDeleteMutation.isPending,
                                },
                                {
                                  label:
                                    user.status === "DISABLED"
                                      ? t.usersActionEnable
                                      : t.usersActionDisable,
                                  icon: user.status === "DISABLED" ? UserCheck : UserX,
                                  onClick: () => toggleStatusMutation.mutate(user.id),
                                  disabled: toggleStatusMutation.isPending,
                                },
                                {
                                  label: t.usersActionRevokeSessions,
                                  icon: ShieldX,
                                  onClick: () => revokeSessionsMutation.mutate(user.id),
                                  disabled: revokeSessionsMutation.isPending,
                                },
                                {
                                  label: t.usersActionResendInitialMail,
                                  icon: Mail,
                                  onClick: () => resendInitialPasswordMutation.mutate(user.id),
                                  disabled: resendInitialPasswordMutation.isPending || !canResendInitialPassword,
                                },
                                {
                                  label: t.usersActionResetPassword || "Réinitialiser mot de passe",
                                  icon: RotateCcw,
                                  onClick: () => openResetPasswordDialog(user.id, user.email),
                                  disabled: resetPasswordMutation.isPending,
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
            {selectedCount} / {totalElements} {t.usersSelectedRows}
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="rows-per-page" className="text-xs font-medium text-muted-foreground">
                {t.usersRowsPerPage}
              </label>
              <select
                id="rows-per-page"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                className="rounded border border-border bg-background px-2 py-1 text-xs font-medium text-foreground"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <p className="text-xs font-medium text-muted-foreground">
              {`${t.usersPageLabel} ${Math.min(page + 1, Math.max(totalPages, 1))} / ${Math.max(totalPages, 1)}`}
            </p>

            <div className="flex gap-1">
              <AppTooltip content={t.usersFirstPage}>
                <Button variant="outline" size="sm" onClick={() => setPage(0)} disabled={page <= 0} className="px-2">
                  «
                </Button>
              </AppTooltip>
              <AppTooltip content={t.usersPreviousPage}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(current - 1, 0))}
                  disabled={page <= 0}
                  className="px-2"
                >
                  ‹
                </Button>
              </AppTooltip>
              <AppTooltip content={t.usersNextPage}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={totalPages === 0 || page >= totalPages - 1}
                  className="px-2"
                >
                  ›
                </Button>
              </AppTooltip>
              <AppTooltip content={t.usersLastPage}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(totalPages - 1, 0))}
                  disabled={totalPages === 0 || page >= totalPages - 1}
                  className="px-2"
                >
                  »
                </Button>
              </AppTooltip>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
