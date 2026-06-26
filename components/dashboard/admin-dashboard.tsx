"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import {
  Moon,
  Sun,
  Languages,
  Check,
  KeyRound,
  FileText,
  LayoutDashboard,
  Bell,
  Search,
  Filter,
  Trash2,
  Mail,
  Settings,
  X,
  UserRound,
  Clock3,
  Lock,
} from "lucide-react";
import { api } from "@/lib/api";
import { getAuthErrorToast } from "@/lib/auth-error-toast";
import { dictionaries } from "@/lib/i18n";
import { useDashboardStore } from "@/store/dashboard-store";
import { AppSidebar } from "@/components/app-sidebar";
import { UsersManagementPanel } from "@/components/dashboard/users-management-panel";
import { SessionsManagementPanel } from "@/components/dashboard/sessions-management-panel";
import { SecurityPermissionsPanel, SecurityRolesPanel } from "@/components/dashboard/security-management-panels";
import { ProfileSettingsPanel } from "@/components/dashboard/profile-settings-panel";
import { ConfigurationManagementPanel } from "@/components/dashboard/configuration-management-panel";
import { EstablishmentsPanel, EntryDiplomasPanel } from "@/components/dashboard/establishment-config-sections";
import { NotificationsCriticalActions } from "@/components/dashboard/notifications-critical-actions";
import { DashboardOverviewPanel } from "@/components/dashboard/dashboard-overview-panel";
import { BusinessPipelineOverviewPanel } from "@/components/dashboard/business-pipeline-overview-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MailTemplatesAdminPanel } from "@/components/admin/mail-templates/mail-templates-admin-panel";
import { useToast } from "@/components/ui/toast-provider";
import { AppTooltip } from "@/components/ui/tooltip";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MobileSectionTabs } from "@/components/dashboard/mobile-section-tabs";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { decodeJwt } from "@/lib/jwt-utils";
import { buildPermissionSet, canAccessTab, firstAccessibleTab, hasPermission, type TabKey } from "@/lib/permissions";
import { tabToPath } from "@/lib/dashboard-routes";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs";
import type { AuditDashboardSummaryResponse, AuditLogResponse, LoginRequest, NotificationReadStatus, RegisterRequest } from "@/lib/types";

type GlobalSearchItem = {
  id: string;
  label: string;
  section: string;
  tab: string;
  icon: typeof LayoutDashboard;
};

type AuditStatusFilter = "ALL" | "OK" | "ERROR" | "INFO";

type AuditEntry = {
  id: string;
  time: string;
  action: string;
  message: string;
  status: Exclude<AuditStatusFilter, "ALL">;
  outcome?: string;
  correlationId?: string;
  reasonCode?: string;
  raw: string;
};

const AUDIT_ACTION_OPTIONS = [
  "LOGIN",
  "LOGOUT",
  "REFRESH",
  "REVOKED",
  "EXPIRED",
  "CONFLICT",
  "CREATE",
  "UPDATE",
  "DELETE",
  "READ",
] as const;

function formatNotificationDate(value: string | undefined, locale: "fr" | "en") {
  if (!value) {
    return locale === "fr" ? "Date inconnue" : "Unknown date";
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

function normalizeClaim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function computeInitials(primary: string, fallback?: string): string {
  const pickInitialsFromSource = (source: string) => {
    const normalized = source.trim();
    if (!normalized) {
      return "";
    }

    const localPart = normalized.includes("@") ? normalized.split("@")[0] : normalized;
    const tokens = localPart
      .split(/[\s._-]+/)
      .filter(Boolean)
      .map((token) => token.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, ""))
      .filter(Boolean);

    if (tokens.length >= 2) {
      return `${tokens[0][0]}${tokens[1][0]}`.toUpperCase();
    }

    if (tokens.length === 1) {
      return tokens[0].slice(0, 2).toUpperCase();
    }

    return "";
  };

  return pickInitialsFromSource(primary) || pickInitialsFromSource(fallback ?? "") || "AU";
}

function resolveAvatarUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return "";
  }

  if (/^(https?:\/\/|data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }

  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");
  return `${apiBaseUrl}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

export function AdminDashboard() {
  const router = useRouter();
  const { theme, setTheme, locale, setLocale, accessToken, refreshToken, setTokens, activeTab, setActiveTab } = useDashboardStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const t = dictionaries[locale];

  const connectedUserTokenPayload = useMemo(
    () => (accessToken ? decodeJwt(accessToken) : null),
    [accessToken],
  );

  const connectedUserId = normalizeClaim(connectedUserTokenPayload?.sub);
  const connectedUserEmail = normalizeClaim(connectedUserTokenPayload?.email) || normalizeClaim(connectedUserTokenPayload?.preferred_username);

  const connectedUserProfileQuery = useQuery({
    queryKey: ["settings-profile", connectedUserId || connectedUserEmail],
    enabled: Boolean(accessToken && (connectedUserId || connectedUserEmail)),
    queryFn: () => api.users.getMe(accessToken),
  });

  const [connectedUserProfilePhotoUrl, setConnectedUserProfilePhotoUrl] = useState("");

  useEffect(() => {
    const profilePhotoPath = connectedUserProfileQuery.data?.profilePhotoUrl?.trim() ?? "";
    if (!accessToken || !profilePhotoPath) {
      setConnectedUserProfilePhotoUrl("");
      return;
    }

    let cancelled = false;
    let localObjectUrl = "";

    api.users
      .getProfilePhotoBlob(accessToken, profilePhotoPath)
      .then((blob) => {
        if (cancelled) {
          return;
        }
        localObjectUrl = URL.createObjectURL(blob);
        setConnectedUserProfilePhotoUrl(localObjectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setConnectedUserProfilePhotoUrl("");
        }
      });

    return () => {
      cancelled = true;
      if (localObjectUrl) {
        URL.revokeObjectURL(localObjectUrl);
      }
    };
  }, [accessToken, connectedUserProfileQuery.data?.profilePhotoUrl]);

  const connectedUser = useMemo(() => {
    const profile = connectedUserProfileQuery.data;

    const profileFirstName = profile?.firstName?.trim() ?? "";
    const profileLastName = profile?.lastName?.trim() ?? "";
    const profileUsername = profile?.username?.trim() ?? "";
    const profileEmail = profile?.email?.trim() ?? "";

    const tokenFirstName = normalizeClaim(connectedUserTokenPayload?.firstName) || normalizeClaim(connectedUserTokenPayload?.given_name);
    const tokenLastName = normalizeClaim(connectedUserTokenPayload?.lastName) || normalizeClaim(connectedUserTokenPayload?.family_name);
    const tokenUsername = normalizeClaim(connectedUserTokenPayload?.username) || normalizeClaim(connectedUserTokenPayload?.preferred_username);
    const tokenEmail = normalizeClaim(connectedUserTokenPayload?.email) || normalizeClaim(connectedUserTokenPayload?.sub);
    const tokenName = normalizeClaim(connectedUserTokenPayload?.name);

    const firstName = profileFirstName || tokenFirstName;
    const lastName = profileLastName || tokenLastName;
    const username = profileUsername || tokenUsername;
    const email = profileEmail || tokenEmail;

    const fullName = `${firstName} ${lastName}`.trim() || tokenName || username || email || "AERIXA User";
    const rawAvatarUrl =
      normalizeClaim(connectedUserTokenPayload?.picture) ||
      normalizeClaim(connectedUserTokenPayload?.avatar) ||
      normalizeClaim(connectedUserTokenPayload?.profileImageUrl) ||
      normalizeClaim(connectedUserTokenPayload?.photoUrl);

    return {
      fullName,
      initials: computeInitials(`${firstName} ${lastName}`.trim(), username || email),
      avatarUrl: connectedUserProfilePhotoUrl || resolveAvatarUrl(rawAvatarUrl),
    };
  }, [connectedUserProfilePhotoUrl, connectedUserProfileQuery.data, connectedUserTokenPayload]);

  const permissionSet = useMemo(() => buildPermissionSet(connectedUserProfileQuery.data ?? null), [connectedUserProfileQuery.data]);
  const tokenRoles = useMemo(() => {
    const fromArray = connectedUserTokenPayload?.roles;
    if (Array.isArray(fromArray)) {
      return fromArray
        .map((role) => (typeof role === "string" ? role : ""))
        .filter(Boolean);
    }

    const single = normalizeClaim(connectedUserTokenPayload?.role);
    return single ? [single] : [];
  }, [connectedUserTokenPayload]);

  const canReadUsers = hasPermission(permissionSet, "users:read_all") || hasPermission(permissionSet, "users:read_children");
  const canReadSessions = hasPermission(permissionSet, "sessions:read_all") || hasPermission(permissionSet, "sessions:read_children");
  const canReadRoles = hasPermission(permissionSet, "roles:read");
  const canReadPermissions = hasPermission(permissionSet, "permissions:read");
  const canReadMailTemplates = hasPermission(permissionSet, "email_templates:read");
  const canReadNotifications = hasPermission(permissionSet, "notifications:read");
  const canEditNotifications = hasPermission(permissionSet, "notifications:edit");
  const canDeleteNotifications = hasPermission(permissionSet, "notifications:delete");
  const canReadAudit = hasPermission(permissionSet, "audit_logs:read");
  const canReadEstablishments = hasPermission(permissionSet, "establishments:list");
  const canReadCandidates = hasPermission(permissionSet, "candidates:read");
  const canReadCandidateApplications = hasPermission(permissionSet, "candidate_applications:read");
  const canReadFunnelStages = hasPermission(permissionSet, "funnel_stages:read");
  const canReadAcquisitionChannels = hasPermission(permissionSet, "acquisition_channels:read");
  const canReadAcademicLevels = hasPermission(permissionSet, "academic_levels:read");
  const canReadEntryDiplomas = hasPermission(permissionSet, "entry_diplomas:read");
  const canReadProgramTracks = hasPermission(permissionSet, "program_tracks:read");
  const canReadProgramTrackLevels = hasPermission(permissionSet, "program_track_levels:read");
  const canReadOperatorPerformance = hasPermission(permissionSet, "candidates:read_operator_performance");
  const isSuperAdmin = useMemo(() => {
    const profileRoles = connectedUserProfileQuery.data?.roles ?? [];
    const merged = [...profileRoles, ...tokenRoles]
      .map((role) => role.replace(/^ROLE_/, "").toUpperCase());
    return merged.includes("SUPER_ADMIN");
  }, [connectedUserProfileQuery.data?.roles, tokenRoles]);
  const canReadConfiguration = useMemo(() => {
    return hasPermission(permissionSet, "business_configuration:access");
  }, [permissionSet]);

  const [apiLog, setApiLog] = useState<string[]>([]);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [notificationPage, setNotificationPage] = useState(0);
  const [notificationPageSize, setNotificationPageSize] = useState(10);
  const [notificationReadStatus, setNotificationReadStatus] = useState<NotificationReadStatus>("ALL");
  const [notificationSearchQuery, setNotificationSearchQuery] = useState("");
  const [notificationTypeFilter, setNotificationTypeFilter] = useState("ALL");
  const [showNotificationFilters, setShowNotificationFilters] = useState(false);
  const [selectedDropdownNotificationIds, setSelectedDropdownNotificationIds] = useState<Set<string>>(new Set());
  const [selectedDialogNotificationIds, setSelectedDialogNotificationIds] = useState<Set<string>>(new Set());
  const [showAuditFilters, setShowAuditFilters] = useState(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("ALL");
  const [auditStatusFilter, setAuditStatusFilter] = useState<AuditStatusFilter>("ALL");
  const [auditPage, setAuditPage] = useState(0);
  const [auditPageSize, setAuditPageSize] = useState(10);
  const [selectedAuditIds, setSelectedAuditIds] = useState<Set<string>>(new Set());
  const [auditDetailOpen, setAuditDetailOpen] = useState(false);
  const [currentAuditDetail, setCurrentAuditDetail] = useState<AuditEntry | null>(null);
  const notificationRef = useRef<HTMLDivElement | null>(null);

  const [loginForm, setLoginForm] = useState<LoginRequest>({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState<RegisterRequest>({
    email: "",
    username: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    password: "",
  });
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const appendLog = (entry: string) => setApiLog((prev) => [`${new Date().toLocaleTimeString()} - ${entry}`, ...prev].slice(0, 40));

  const loginMutation = useMutation({
    mutationFn: () => api.auth.login(loginForm),
    onSuccess: (data) => {
      if (!data.accessToken || !data.refreshToken) {
        return;
      }
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      appendLog(`LOGIN OK: ${data.user.email}`);
    },
    onError: (error) => {
      const message = getAuthErrorToast(error, locale);
      appendLog(`LOGIN ERROR: ${message.description}`);
      toast({
        variant: "error",
        title: message.title,
        description: message.description,
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: () => api.auth.register(registerForm),
    onSuccess: (data) => appendLog(`REGISTER OK: ${data.email}`),
    onError: (error) => appendLog(`REGISTER ERROR: ${(error as Error).message}`),
  });

  const refreshMutation = useMutation({
    mutationFn: () => api.auth.refresh(refreshToken),
    onSuccess: (data) => {
      if (!data.accessToken || !data.refreshToken) {
        return;
      }
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      appendLog("REFRESH OK");
    },
    onError: (error) => appendLog(`REFRESH ERROR: ${(error as Error).message}`),
  });

  const passwordResetRequestMutation = useMutation({
    mutationFn: () => api.auth.passwordResetRequest(resetEmail),
    onSuccess: () => appendLog("PASSWORD RESET REQUEST OK"),
    onError: (error) => appendLog(`PASSWORD RESET REQUEST ERROR: ${(error as Error).message}`),
  });

  const passwordResetConfirmMutation = useMutation({
    mutationFn: () => api.auth.passwordResetConfirm(resetToken, newPassword),
    onSuccess: () => appendLog("PASSWORD RESET CONFIRM OK"),
    onError: (error) => appendLog(`PASSWORD RESET CONFIRM ERROR: ${(error as Error).message}`),
  });

  const notificationsDropdownQuery = useQuery({
    queryKey: ["notifications", accessToken, "dropdown"],
    queryFn: () => api.notifications.list(accessToken, 0, 8, "UNREAD"),
    enabled: Boolean(accessToken && canReadNotifications),
  });

  const notificationsDialogQuery = useQuery({
    queryKey: ["notifications", accessToken, "dialog", notificationPage, notificationPageSize, notificationReadStatus],
    queryFn: () => api.notifications.list(accessToken, notificationPage, notificationPageSize, notificationReadStatus),
    enabled: Boolean(accessToken && canReadNotifications) && activeTab === "settings-notifications",
  });

  const unreadCountQuery = useQuery({
    queryKey: ["notifications", accessToken, "unread-count"],
    queryFn: () => api.notifications.unreadCount(accessToken),
    enabled: Boolean(accessToken && canReadNotifications),
  });

  const auditLogsQuery = useQuery({
    queryKey: ["audit-logs", accessToken, auditPage, auditPageSize, auditSearchQuery, auditActionFilter, auditStatusFilter],
    queryFn: () =>
      api.auditLogs.listMine(accessToken, {
        page: auditPage,
        size: auditPageSize,
        search: auditSearchQuery,
        action: auditActionFilter,
        status: auditStatusFilter,
      }),
    enabled: Boolean(accessToken && canReadAudit) && activeTab === "settings-audit",
  });

    const auditSummaryQuery = useQuery({
      queryKey: ["audit-logs-summary", accessToken],
      queryFn: () => api.auditLogs.summary(accessToken),
      enabled: Boolean(accessToken && canReadAudit) && activeTab === "settings-audit",
    });

  useEffect(() => {
    // Wait for the user's permissions to be loaded before deciding whether the
    // active tab is accessible — otherwise an empty permission set would wrongly
    // redirect away from deep links like /dashboard/establishments on first load.
    if (!connectedUserProfileQuery.data) return;

    const fallbackTab = firstAccessibleTab(permissionSet, [
      "dashboard",
      "users",
      "sessions",
      "security-roles",
      "security-permissions",
      "mail-template",
      "settings-profile",
      ...(canReadConfiguration ? (["settings-configuration"] as const) : []),
      "settings-notifications",
      "settings-audit",
    ]);

    if (!canAccessTab(permissionSet, activeTab as TabKey)) {
      setActiveTab(fallbackTab);
    }
  }, [activeTab, permissionSet, setActiveTab, canReadConfiguration, connectedUserProfileQuery.data]);

  const invalidateNotifications = async () => {
    await queryClient.invalidateQueries({ queryKey: ["notifications", accessToken] });
  };

  const updateNotificationReadStatusMutation = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) => api.notifications.setReadStatus(accessToken, id, read),
    onSuccess: invalidateNotifications,
  });

  const updateBulkNotificationReadStatusMutation = useMutation({
    mutationFn: ({ ids, read }: { ids: string[]; read: boolean }) => api.notifications.setReadStatusBulk(accessToken, ids, read),
    onSuccess: async () => {
      await invalidateNotifications();
      setSelectedDropdownNotificationIds(new Set());
      setSelectedDialogNotificationIds(new Set());
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) => api.notifications.delete(accessToken, id),
    onSuccess: async () => {
      await invalidateNotifications();
      setSelectedDialogNotificationIds(new Set());
    },
  });

  const deleteBulkNotificationsMutation = useMutation({
    mutationFn: (ids: string[]) => api.notifications.deleteBulk(accessToken, ids),
    onSuccess: async () => {
      await invalidateNotifications();
      setSelectedDialogNotificationIds(new Set());
    },
  });

  const tokenState = useMemo(() => (accessToken ? "CONNECTED" : "GUEST"), [accessToken]);
  const unreadNotificationsCount = unreadCountQuery.data?.unreadCount ?? 0;
  const dropdownNotifications = notificationsDropdownQuery.data?.content ?? [];
  const dialogNotifications = notificationsDialogQuery.data?.content ?? [];
  const dialogTotalElements = notificationsDialogQuery.data?.totalElements ?? 0;
  const dialogTotalPages = notificationsDialogQuery.data?.totalPages ?? 0;
  const allDropdownSelected = dropdownNotifications.length > 0 && dropdownNotifications.every((item) => selectedDropdownNotificationIds.has(item.id));
  const notificationTypeOptions = useMemo(
    () => [
      {
        value: "ALL",
        label: locale === "fr" ? "Tous les types" : "All types",
        keywords: ["all", "tous", "types"],
      },
      ...Array.from(new Set(dialogNotifications.map((item) => item.notificationType).filter(Boolean))).map((type) => ({
        value: type,
        label: type,
        keywords: [type.toLowerCase()],
      })),
    ],
    [dialogNotifications, locale],
  );
  const filteredDialogNotifications = useMemo(
    () =>
      dialogNotifications.filter((notification) => {
        const query = notificationSearchQuery.trim().toLowerCase();
        const matchesQuery =
          query.length === 0 ||
          `${notification.title} ${notification.description} ${notification.notificationType}`
            .toLowerCase()
            .includes(query);
        const matchesType =
          notificationTypeFilter === "ALL" ||
          notification.notificationType === notificationTypeFilter;
        return matchesQuery && matchesType;
      }),
    [dialogNotifications, notificationSearchQuery, notificationTypeFilter],
  );
  const allDialogSelected =
    filteredDialogNotifications.length > 0 &&
    filteredDialogNotifications.every((item) => selectedDialogNotificationIds.has(item.id));

  const auditEntries = useMemo<AuditEntry[]>(
    () =>
      (auditLogsQuery.data?.content ?? []).map((entry: AuditLogResponse) => {
        const detailsRaw = entry.details?.trim();
        const rawDetails = detailsRaw && detailsRaw.length > 0 ? detailsRaw : "{}";
        const time = formatNotificationDate(entry.timestamp, locale);

        return {
          id: entry.id,
          time,
          action: entry.action,
          message: entry.message ?? entry.resourcePath ?? "",
          status: entry.status,
          outcome: entry.outcome,
          correlationId: entry.correlationId,
          reasonCode: entry.reasonCode,
          raw: rawDetails,
        };
      }),
    [auditLogsQuery.data?.content, locale],
  );

  const auditActionOptions = useMemo(
    () => [
      {
        value: "ALL",
        label: locale === "fr" ? "Toutes les actions" : "All actions",
        keywords: ["all", "toutes", "actions"],
      },
      ...AUDIT_ACTION_OPTIONS.map((action) => ({
        value: action,
        label: action,
        keywords: [action.toLowerCase()],
      })),
    ],
    [locale],
  );

  const auditTotalElements = auditLogsQuery.data?.totalElements ?? 0;
  const auditTotalPages = auditLogsQuery.data?.totalPages ?? 0;
  const safeAuditPage = Math.min(auditPage, Math.max(auditTotalPages - 1, 0));
  const pagedAuditEntries = auditEntries;
  const localAuditFallback = apiLog.slice(0, 12);
  const auditSummary: AuditDashboardSummaryResponse | undefined = auditSummaryQuery.data;
  const allAuditSelectedOnPage =
    pagedAuditEntries.length > 0 &&
    pagedAuditEntries.every((entry) => selectedAuditIds.has(entry.id));

  const breadcrumbItems = useMemo<BreadcrumbItem[]>(() => {
      const groupFr: Record<string, string> = {
        users: "Users",
        sessions: "Users",
        "security-roles": "Securite",
        "security-permissions": "Securite",
        "mail-template": "Communication",
        "settings-profile": "Parametres",
        "settings-notifications": "Parametres",
        "settings-audit": "Parametres",
        "settings-configuration": "Parametres",
        "config-establishments": "Configuration",
        "config-academic-levels": "Configuration",
        "config-entry-diplomas": "Configuration",
        "config-program-tracks": "Configuration",
        "config-program-track-levels": "Configuration",
        "config-acquisition-channels": "Configuration",
        "config-funnel-stages": "Configuration",
        "config-funnel-stage-transitions": "Configuration",
      };
      const groupEn: Record<string, string> = {
        users: "Users",
        sessions: "Users",
        "security-roles": "Security",
        "security-permissions": "Security",
        "mail-template": "Communication",
        "settings-profile": "Settings",
        "settings-notifications": "Settings",
        "settings-audit": "Settings",
        "settings-configuration": "Settings",
        "config-establishments": "Configuration",
        "config-academic-levels": "Configuration",
        "config-entry-diplomas": "Configuration",
        "config-program-tracks": "Configuration",
        "config-program-track-levels": "Configuration",
        "config-acquisition-channels": "Configuration",
        "config-funnel-stages": "Configuration",
        "config-funnel-stage-transitions": "Configuration",
      };
      const leafFr: Record<string, string> = {
        dashboard: "Tableau de bord",
        users: "Utilisateurs",
        sessions: "Sessions",
        "security-roles": "Roles",
        "security-permissions": "Permissions",
        "mail-template": "Template de mail",
        "settings-profile": "Profil",
        "settings-notifications": "Notifications",
        "settings-audit": "Journal d'audit",
        "settings-configuration": "Configuration metier",
        "config-establishments": "Etablissements",
        "config-academic-levels": "Niveaux academiques",
        "config-entry-diplomas": "Diplomes d'entree",
        "config-program-tracks": "Filieres",
        "config-program-track-levels": "Niveaux de filiere",
        "config-acquisition-channels": "Canaux d'acquisition",
        "config-funnel-stages": "Etapes du funnel",
        "config-funnel-stage-transitions": "Transitions du funnel",
      };
      const leafEn: Record<string, string> = {
        dashboard: "Dashboard",
        users: "Users",
        sessions: "Sessions",
        "security-roles": "Roles",
        "security-permissions": "Permissions",
        "mail-template": "Mail template",
        "settings-profile": "Profile",
        "settings-notifications": "Notifications",
        "settings-audit": "Audit log",
        "settings-configuration": "Business configuration",
        "config-establishments": "Establishments",
        "config-academic-levels": "Academic levels",
        "config-entry-diplomas": "Entry diplomas",
        "config-program-tracks": "Program tracks",
        "config-program-track-levels": "Track levels",
        "config-acquisition-channels": "Acquisition channels",
        "config-funnel-stages": "Funnel stages",
        "config-funnel-stage-transitions": "Funnel transitions",
      };
      const groupMap = locale === "fr" ? groupFr : groupEn;
      const leafMap = locale === "fr" ? leafFr : leafEn;
      const group = groupMap[activeTab];
      const leaf = leafMap[activeTab] ?? activeTab;
      if (!group) return [{ label: leaf }];
      return [{ label: group }, { label: leaf }];
    }, [activeTab, locale]);

  const globalSearchItems = useMemo<GlobalSearchItem[]>(
      () =>
        locale === "fr"
          ? [
              { id: "dashboard", label: "Tableau de bord", section: "Navigation", tab: "dashboard", icon: LayoutDashboard },
              { id: "users", label: "Utilisateurs", section: "Users", tab: "users", icon: UserRound },
              { id: "sessions", label: "Sessions", section: "Users", tab: "sessions", icon: Clock3 },
              { id: "roles", label: "Roles", section: "Securite", tab: "security-roles", icon: KeyRound },
              { id: "permissions", label: "Permissions", section: "Securite", tab: "security-permissions", icon: Lock },
              { id: "mail-template", label: "Template de mail", section: "Communication", tab: "mail-template", icon: Mail },
              { id: "profile", label: "Profile", section: "Parametre", tab: "settings-profile", icon: UserRound },
              ...(canReadConfiguration ? [{ id: "configuration", label: "Configuration metier", section: "Parametre", tab: "settings-configuration", icon: Settings }] : []),
              { id: "notifications", label: "Notifications", section: "Parametre", tab: "settings-notifications", icon: Bell },
              { id: "audit", label: "Journal d'audit", section: "Parametre", tab: "settings-audit", icon: FileText },
            ]
          : [
              { id: "dashboard", label: "Dashboard", section: "Navigation", tab: "dashboard", icon: LayoutDashboard },
              { id: "users", label: "Users", section: "Users", tab: "users", icon: UserRound },
              { id: "sessions", label: "Sessions", section: "Users", tab: "sessions", icon: Clock3 },
              { id: "roles", label: "Roles", section: "Security", tab: "security-roles", icon: KeyRound },
              { id: "permissions", label: "Permissions", section: "Security", tab: "security-permissions", icon: Lock },
              { id: "mail-template", label: "Mail template", section: "Communication", tab: "mail-template", icon: Mail },
              { id: "profile", label: "Profile", section: "Settings", tab: "settings-profile", icon: UserRound },
              ...(canReadConfiguration ? [{ id: "configuration", label: "Business configuration", section: "Settings", tab: "settings-configuration", icon: Settings }] : []),
              { id: "notifications", label: "Notifications", section: "Settings", tab: "settings-notifications", icon: Bell },
              { id: "audit", label: "Audit log", section: "Settings", tab: "settings-audit", icon: FileText },
            ],
      [locale, canReadConfiguration],
    );

  const filteredSearchItems = useMemo(
    () =>
      globalSearchItems.filter(
        (item) =>
          canAccessTab(permissionSet, item.tab as TabKey) &&
          `${item.label} ${item.section}`.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [globalSearchItems, permissionSet, searchQuery],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = typeof event.key === "string" ? event.key.toLowerCase() : "";
      if (!key) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === "k") {
        event.preventDefault();
        setSearchDialogOpen(true);
      }
      if (key === "escape") {
        setSearchDialogOpen(false);
        closeNotificationMenu();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onOutsideClick = (event: MouseEvent) => {
      if (!notificationRef.current?.contains(event.target as Node)) {
        closeNotificationMenu();
      }
    };

    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  const toggleDropdownSelection = (id: string) => {
    setSelectedDropdownNotificationIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllDropdown = () => {
    if (allDropdownSelected) {
      setSelectedDropdownNotificationIds(new Set());
      return;
    }
    setSelectedDropdownNotificationIds(new Set(dropdownNotifications.map((item) => item.id)));
  };

  const toggleDialogSelection = (id: string) => {
    setSelectedDialogNotificationIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllDialog = () => {
    if (allDialogSelected) {
      setSelectedDialogNotificationIds((current) => {
        const next = new Set(current);
        filteredDialogNotifications.forEach((item) => next.delete(item.id));
        return next;
      });
      return;
    }
    setSelectedDialogNotificationIds((current) => {
      const next = new Set(current);
      filteredDialogNotifications.forEach((item) => next.add(item.id));
      return next;
    });
  };

  function closeNotificationMenu() {
    setNotificationMenuOpen(false);
    setSelectedDropdownNotificationIds(new Set());
  }

  const setNotificationPageWithReset = (value: number | ((current: number) => number)) => {
    setNotificationPage(value);
    setSelectedDialogNotificationIds(new Set());
  };

  const setAuditPageWithReset = (value: number | ((current: number) => number)) => {
    setAuditPage(value);
    setSelectedAuditIds(new Set());
  };

  const toggleAuditSelection = (id: string) => {
    setSelectedAuditIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllAuditOnPage = () => {
    setSelectedAuditIds((current) => {
      const next = new Set(current);
      if (allAuditSelectedOnPage) {
        pagedAuditEntries.forEach((entry) => next.delete(entry.id));
      } else {
        pagedAuditEntries.forEach((entry) => next.add(entry.id));
      }
      return next;
    });
  };

  return (
    <div className="admin-typography min-h-screen bg-background text-foreground">
      <AppSidebar />

      <div className="pb-20 md:pb-0 md:pl-22.5">
        <header className="sticky top-0 z-20 border-b border-border/50 bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 md:px-8">
            <AppTooltip content={locale === "fr" ? "Ouvrir la recherche globale" : "Open global search"}>
              <button
                type="button"
                onClick={() => setSearchDialogOpen(true)}
                className="hidden h-10 min-w-70 items-center rounded-full border border-border/70 bg-card/50 px-4 text-sm text-muted-foreground transition hover:border-border md:flex"
              >
                <Search className="mr-2 h-4 w-4" />
                <span>{locale === "fr" ? "Rechercher pages, actions..." : "Search pages, actions..."}</span>
                <span className="ml-auto rounded border border-border/80 px-1.5 py-0.5 text-[11px]">Ctrl+K</span>
              </button>
            </AppTooltip>

            <div className="ml-auto flex items-center gap-2" ref={notificationRef}>
              {canReadNotifications ? (
                <AppTooltip content={locale === "fr" ? "Voir les notifications" : "View notifications"}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative h-9 w-9 rounded-full p-0 hover:bg-muted"
                    onClick={() => {
                      setNotificationMenuOpen((current) => {
                        if (current) {
                          setSelectedDropdownNotificationIds(new Set());
                        }
                        return !current;
                      });
                    }}
                    aria-label={locale === "fr" ? "Notifications" : "Notifications"}
                  >
                    <Bell className="h-4 w-4" />
                    {unreadNotificationsCount > 0 ? (
                      <span className="absolute right-1.5 top-1.5 inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
                    ) : null}
                  </Button>
                </AppTooltip>
              ) : null}

              {notificationMenuOpen ? (
                <div className="absolute right-0 top-12 z-40 w-90 rounded-xl border border-border bg-card p-3 shadow-xl">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allDropdownSelected}
                        onChange={toggleSelectAllDropdown}
                        aria-label={locale === "fr" ? "Tout selectionner" : "Select all"}
                      />
                      <p className="text-sm font-semibold">{locale === "fr" ? "Non lues" : "Unread"}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => updateBulkNotificationReadStatusMutation.mutate({
                        ids: Array.from(selectedDropdownNotificationIds),
                        read: true,
                      })}
                      disabled={!canEditNotifications || selectedDropdownNotificationIds.size === 0 || updateBulkNotificationReadStatusMutation.isPending}
                    >
                      {locale === "fr" ? "Marquer selection lue" : "Mark selected as read"}
                    </Button>
                  </div>
                  <div className="grid max-h-64 gap-2 overflow-auto">
                    {dropdownNotifications.length === 0 ? (
                      <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                        {locale === "fr" ? "Aucune notification non lue." : "No unread notifications."}
                      </p>
                    ) : (
                      dropdownNotifications.map((item) => (
                        <div key={item.id} className="rounded-md border border-border/80 px-3 py-2">
                          <div className="mb-1 flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={selectedDropdownNotificationIds.has(item.id)}
                              onChange={() => toggleDropdownSelection(item.id)}
                              aria-label={locale === "fr" ? "Selectionner notification" : "Select notification"}
                              className="mt-0.5"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{item.title}</p>
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground">{formatNotificationDate(item.createdAt, locale)}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <Button
                    variant="outline"
                    className="mt-3 w-full"
                    onClick={() => {
                      router.push(tabToPath("settings-notifications"));
                      closeNotificationMenu();
                    }}
                  >
                    {locale === "fr" ? "Voir toutes les notifications" : "View all notifications"}
                  </Button>
                </div>
              ) : null}

              <Badge variant={tokenState === "CONNECTED" ? "success" : "warning"}>{tokenState}</Badge>

              <AppTooltip content={locale === "fr" ? "Changer de langue" : "Switch language"}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-full p-0 hover:bg-transparent"
                  onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
                  aria-label={locale === "fr" ? "Changer de langue" : "Switch language"}
                >
                  <Languages className="h-4 w-4" />
                </Button>
              </AppTooltip>

              <AppTooltip content={locale === "fr" ? "Changer de theme" : "Switch theme"}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-full p-0 hover:bg-transparent"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  aria-label={locale === "fr" ? "Changer de theme" : "Switch theme"}
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </AppTooltip>

              <AppTooltip content={locale === "fr" ? "Compte connecte" : "Connected account"}>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-muted"
                  aria-label={connectedUser.fullName}
                >
                  {connectedUser.avatarUrl ? (
                    <Image
                      src={connectedUser.avatarUrl}
                      alt={connectedUser.fullName}
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xs font-semibold">{connectedUser.initials}</span>
                  )}
                </button>
              </AppTooltip>
            </div>
          </div>
        </header>

        <main className="w-full space-y-5 px-3 py-4 pb-24 md:space-y-6 md:px-8 md:py-8 md:pb-8">
          <Breadcrumbs items={breadcrumbItems} onNavigate={(_tab, stepsBack) => window.history.go(-stepsBack)} />

          <MobileSectionTabs permissionSet={permissionSet} />

          <Card className="border-border/60 bg-card/70 shadow-sm">
            <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-2xl md:text-3xl">{t.title}</CardTitle>
                <CardDescription>{t.subtitle}</CardDescription>
              </div>
              <Badge className="w-fit" variant="outline">
                <LayoutDashboard className="h-3.5 w-3.5" />
                {t.section}: {breadcrumbItems[breadcrumbItems.length - 1]?.label ?? activeTab}
              </Badge>
            </CardHeader>
          </Card>

          {activeTab === "dashboard" ? (
            <div className="grid gap-6">
              <DashboardOverviewPanel
                accessToken={accessToken}
                locale={locale}
                theme={theme}
                canReadUsers={canReadUsers}
                canReadEstablishments={canReadEstablishments}
                canReadAudit={canReadAudit}
                canReadSessions={canReadSessions}
              />
              <BusinessPipelineOverviewPanel
                accessToken={accessToken}
                locale={locale}
                theme={theme}
                canReadEstablishments={canReadEstablishments}
                canReadCandidates={canReadCandidates}
                canReadCandidateApplications={canReadCandidateApplications}
                canReadFunnelStages={canReadFunnelStages}
                canReadAcquisitionChannels={canReadAcquisitionChannels}
                canReadAcademicLevels={canReadAcademicLevels}
                canReadEntryDiplomas={canReadEntryDiplomas}
                canReadProgramTracks={canReadProgramTracks}
                canReadProgramTrackLevels={canReadProgramTrackLevels}
                canReadOperatorPerformance={canReadOperatorPerformance}
              />
            </div>
          ) : null}

          {activeTab === "security-roles" && canReadRoles ? (
            <SecurityRolesPanel locale={locale} onLog={appendLog} accessToken={accessToken} />
          ) : null}

          {activeTab === "security-permissions" && canReadPermissions ? (
            <SecurityPermissionsPanel locale={locale} />
          ) : null}

          {activeTab === "sessions" && canReadSessions ? (
            <SessionsManagementPanel accessToken={accessToken} locale={locale} onLog={appendLog} permissionSet={permissionSet} />
          ) : null}

          {activeTab === "users" && canReadUsers ? (
            <UsersManagementPanel accessToken={accessToken} locale={locale} onLog={appendLog} permissionSet={permissionSet} />
          ) : null}

          {activeTab === "mail-template" && canReadMailTemplates ? (
            <Card className="border-border/60 bg-card/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> {locale === "fr" ? "Template de mail" : "Mail template"}</CardTitle>
                <CardDescription>
                  {locale === "fr"
                    ? "Gérez les types, les versions de templates et leur activation globale."
                    : "Manage types, template versions and global activation."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MailTemplatesAdminPanel accessToken={accessToken} locale={locale} />
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "settings-profile" ? (
            <ProfileSettingsPanel accessToken={accessToken} locale={locale} onLog={appendLog} />
          ) : null}

          {activeTab === "settings-configuration" && canReadConfiguration ? (
            <ConfigurationManagementPanel accessToken={accessToken} locale={locale} onLog={appendLog} />
          ) : null}

          {activeTab === "config-establishments" && canReadEstablishments ? (
            <EstablishmentsPanel accessToken={accessToken} locale={locale} />
          ) : null}

          {activeTab === "config-entry-diplomas" ? (
            <EntryDiplomasPanel accessToken={accessToken} locale={locale} />
          ) : null}

          {activeTab === "settings-notifications" && canReadNotifications ? (
            <Card className="border-border/60 bg-card/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> {locale === "fr" ? "Notifications" : "Notifications"}</CardTitle>
                <CardDescription>{locale === "fr" ? "Filtres avancés et actions bulk directement dans la page" : "Advanced filters and bulk actions directly in page"}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    {locale === "fr"
                      ? `Vous avez actuellement ${unreadNotificationsCount} notification(s) non lue(s).`
                      : `You currently have ${unreadNotificationsCount} unread notification(s).`}
                  </p>
                  <AppTooltip content={locale === "fr" ? "Afficher/masquer les filtres" : "Show/hide filters"}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-9 w-9 rounded-xl text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground ${showNotificationFilters ? "bg-background/80 text-foreground" : ""}`}
                      onClick={() => setShowNotificationFilters((current) => !current)}
                      aria-label={locale === "fr" ? "Afficher/masquer les filtres" : "Show/hide filters"}
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </AppTooltip>
                </div>

                {showNotificationFilters ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="notifications-query-filter">
                      {locale === "fr" ? "Recherche" : "Search"}
                    </label>
                    <Input
                      id="notifications-query-filter"
                      value={notificationSearchQuery}
                      onChange={(event) => {
                        setNotificationSearchQuery(event.target.value);
                        setNotificationPageWithReset(0);
                      }}
                      placeholder={locale === "fr" ? "Titre, description, type..." : "Title, description, type..."}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{locale === "fr" ? "Statut de lecture" : "Read status"}</label>
                    <SearchableSelect
                      options={[
                        { value: "ALL", label: locale === "fr" ? "Toutes" : "All", keywords: ["all", "toutes"] },
                        { value: "UNREAD", label: locale === "fr" ? "Non lues" : "Unread", keywords: ["unread", "non lues"] },
                        { value: "READ", label: locale === "fr" ? "Lues" : "Read", keywords: ["read", "lues"] },
                      ]}
                      value={notificationReadStatus}
                      onValueChange={(value) => {
                        setNotificationReadStatus(value as NotificationReadStatus);
                        setNotificationPageWithReset(0);
                      }}
                      placeholder={locale === "fr" ? "Toutes" : "All"}
                      searchPlaceholder={locale === "fr" ? "Rechercher un statut..." : "Search status..."}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{locale === "fr" ? "Type" : "Type"}</label>
                    <SearchableSelect
                      options={notificationTypeOptions}
                      value={notificationTypeFilter}
                      onValueChange={(value) => {
                        setNotificationTypeFilter(value);
                        setNotificationPageWithReset(0);
                      }}
                      placeholder={locale === "fr" ? "Tous les types" : "All types"}
                      searchPlaceholder={locale === "fr" ? "Rechercher un type..." : "Search type..."}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{locale === "fr" ? "Lignes par page" : "Rows per page"}</label>
                    <SearchableSelect
                      options={[
                        { value: "10", label: "10", keywords: ["10"] },
                        { value: "20", label: "20", keywords: ["20"] },
                        { value: "50", label: "50", keywords: ["50"] },
                      ]}
                      value={String(notificationPageSize)}
                      onValueChange={(value) => {
                        setNotificationPageSize(Number(value));
                        setNotificationPageWithReset(0);
                      }}
                      placeholder="10"
                      searchPlaceholder={locale === "fr" ? "Rechercher une taille..." : "Search size..."}
                    />
                  </div>
                </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <NotificationsCriticalActions
                    locale={locale}
                    canEditNotifications={canEditNotifications}
                    canDeleteNotifications={canDeleteNotifications}
                    hasSelection={selectedDialogNotificationIds.size > 0}
                    bulkEditPending={updateBulkNotificationReadStatusMutation.isPending}
                    bulkDeletePending={deleteBulkNotificationsMutation.isPending}
                    onMarkRead={() => updateBulkNotificationReadStatusMutation.mutate({
                      ids: Array.from(selectedDialogNotificationIds),
                      read: true,
                    })}
                    onMarkUnread={() => updateBulkNotificationReadStatusMutation.mutate({
                      ids: Array.from(selectedDialogNotificationIds),
                      read: false,
                    })}
                    onDeleteSelected={() => deleteBulkNotificationsMutation.mutate(Array.from(selectedDialogNotificationIds))}
                  />
                </div>

                <div className="max-h-[52vh] overflow-auto rounded-xl border border-border/80 bg-background/70">
                  <table className="w-full min-w-190 text-left text-sm">
                    <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={allDialogSelected}
                            onChange={toggleSelectAllDialog}
                            aria-label={locale === "fr" ? "Tout selectionner" : "Select all"}
                          />
                        </th>
                        <th className="px-3 py-3">{locale === "fr" ? "Notification" : "Notification"}</th>
                        <th className="px-3 py-3">{locale === "fr" ? "Type" : "Type"}</th>
                        <th className="px-3 py-3">{locale === "fr" ? "Statut" : "Status"}</th>
                        <th className="px-3 py-3">{locale === "fr" ? "Date" : "Date"}</th>
                        <th className="px-3 py-3">{locale === "fr" ? "Actions" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notificationsDialogQuery.isFetching && filteredDialogNotifications.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                            {locale === "fr" ? "Chargement des notifications..." : "Loading notifications..."}
                          </td>
                        </tr>
                      ) : filteredDialogNotifications.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                            {locale === "fr" ? "Aucune notification." : "No notifications."}
                          </td>
                        </tr>
                      ) : (
                        filteredDialogNotifications.map((notification) => (
                          <tr key={notification.id} className="border-t border-border/60 align-top">
                            <td className="px-3 py-3">
                              <input
                                type="checkbox"
                                checked={selectedDialogNotificationIds.has(notification.id)}
                                onChange={() => toggleDialogSelection(notification.id)}
                                aria-label={locale === "fr" ? "Selectionner notification" : "Select notification"}
                              />
                            </td>
                            <td className="px-3 py-3">
                              <p className="font-medium">{notification.title}</p>
                              <p className="text-xs text-muted-foreground">{notification.description}</p>
                            </td>
                            <td className="px-3 py-3">
                              <Badge variant="outline">{notification.notificationType}</Badge>
                            </td>
                            <td className="px-3 py-3">
                              <Badge variant={notification.read ? "outline" : "warning"}>
                                {notification.read
                                  ? (locale === "fr" ? "Lue" : "Read")
                                  : (locale === "fr" ? "Non lue" : "Unread")}
                              </Badge>
                            </td>
                            <td className="px-3 py-3 text-muted-foreground">{formatNotificationDate(notification.createdAt, locale)}</td>
                            <td className="px-3 py-3">
                              <DropdownMenu
                                triggerTooltip={locale === "fr" ? "Actions notification" : "Notification actions"}
                                items={[
                                  {
                                    label: notification.read
                                      ? (locale === "fr" ? "Marquer non lue" : "Mark as unread")
                                      : (locale === "fr" ? "Marquer lue" : "Mark as read"),
                                    icon: notification.read ? Mail : Check,
                                    onClick: () => updateNotificationReadStatusMutation.mutate({
                                      id: notification.id,
                                      read: !notification.read,
                                    }),
                                    disabled: !canEditNotifications || updateNotificationReadStatusMutation.isPending,
                                  },
                                  {
                                    label: locale === "fr" ? "Supprimer" : "Delete",
                                    icon: Trash2,
                                    variant: "destructive",
                                    onClick: () => deleteNotificationMutation.mutate(notification.id),
                                    disabled: !canDeleteNotifications || deleteNotificationMutation.isPending,
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

                {(auditLogsQuery.isError || pagedAuditEntries.length === 0) && localAuditFallback.length > 0 ? (
                  <div className="rounded-xl border border-border/80 bg-background/60 p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      {locale === "fr"
                        ? "Dernieres activites locales (fallback UI)"
                        : "Latest local activity (UI fallback)"}
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {localAuditFallback.map((line, index) => (
                        <li key={`${line}-${index}`} className="truncate">{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {selectedDialogNotificationIds.size > 0
                      ? `${selectedDialogNotificationIds.size} ${locale === "fr" ? "ligne(s) sélectionnée(s)" : "row(s) selected"}`
                      : `${dialogTotalElements} ${locale === "fr" ? "notification(s)" : "notification(s)"}`}
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      {locale === "fr"
                        ? `Page ${Math.min(notificationPage + 1, Math.max(dialogTotalPages, 1))} sur ${Math.max(dialogTotalPages, 1)}`
                        : `Page ${Math.min(notificationPage + 1, Math.max(dialogTotalPages, 1))} of ${Math.max(dialogTotalPages, 1)}`}
                    </p>

                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => setNotificationPageWithReset(0)} disabled={notificationPage <= 0} className="px-2">
                        «
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNotificationPageWithReset((current) => Math.max(current - 1, 0))}
                        disabled={notificationPage <= 0}
                        className="px-2"
                      >
                        ‹
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNotificationPageWithReset((current) => current + 1)}
                        disabled={dialogTotalPages === 0 || notificationPage >= dialogTotalPages - 1}
                        className="px-2"
                      >
                        ›
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNotificationPageWithReset(Math.max(dialogTotalPages - 1, 0))}
                        disabled={dialogTotalPages === 0 || notificationPage >= dialogTotalPages - 1}
                        className="px-2"
                      >
                        »
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "settings-audit" && canReadAudit ? (
            <Card className="border-border/60 bg-card/70">
              <CardHeader>
                <CardTitle>{locale === "fr" ? "Journal d'audit" : "Audit log"}</CardTitle>
                <CardDescription>
                  {locale === "fr"
                    ? "Audit d'activité avec filtres, pagination, sélection et détails."
                    : "Activity audit with filters, pagination, selection and details."}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Echecs de rafraichissement" : "Refresh token failures"}</p>
                    <p className="mt-1 text-2xl font-semibold">{auditSummary?.refreshFailures.last24h ?? 0}</p>
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Fenetre 24h" : "24h window"} · {locale === "fr" ? "7j" : "7d"}: {auditSummary?.refreshFailures.last7d ?? 0} · {locale === "fr" ? "30j" : "30d"}: {auditSummary?.refreshFailures.last30d ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Tentatives de reutilisation" : "Suspicious reuse attempts"}</p>
                    <p className="mt-1 text-2xl font-semibold">{auditSummary?.reuseAttempts.last24h ?? 0}</p>
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Fenetre 24h" : "24h window"} · {locale === "fr" ? "7j" : "7d"}: {auditSummary?.reuseAttempts.last7d ?? 0} · {locale === "fr" ? "30j" : "30d"}: {auditSummary?.reuseAttempts.last30d ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Revoquer les sessions" : "Session revocations"}</p>
                    <p className="mt-1 text-2xl font-semibold">{auditSummary?.revokeSessions.last24h ?? 0}</p>
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Fenetre 24h" : "24h window"} · {locale === "fr" ? "7j" : "7d"}: {auditSummary?.revokeSessions.last7d ?? 0} · {locale === "fr" ? "30j" : "30d"}: {auditSummary?.revokeSessions.last30d ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Echecs de connexion" : "Login failures"}</p>
                    <p className="mt-1 text-2xl font-semibold">{auditSummary?.loginFailures.last24h ?? 0}</p>
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Fenetre 24h" : "24h window"} · {locale === "fr" ? "7j" : "7d"}: {auditSummary?.loginFailures.last7d ?? 0} · {locale === "fr" ? "30j" : "30d"}: {auditSummary?.loginFailures.last30d ?? 0}</p>
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{locale === "fr" ? "Echecs login par IP" : "Login failures by IP"}</p>
                    <div className="mt-2 space-y-2 text-sm">
                      {(auditSummary?.loginFailuresBySourceIp ?? []).length === 0 ? (
                        <p className="text-muted-foreground">-</p>
                      ) : (
                        auditSummary!.loginFailuresBySourceIp.map((item) => (
                          <div key={item.key} className="flex items-center justify-between gap-2">
                            <span className="truncate text-muted-foreground">{item.key}</span>
                            <Badge variant="outline">{item.count}</Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{locale === "fr" ? "Actions admin par acteur" : "Admin actions by actor"}</p>
                    <div className="mt-2 space-y-2 text-sm">
                      {(auditSummary?.adminActionsByActor ?? []).length === 0 ? (
                        <p className="text-muted-foreground">-</p>
                      ) : (
                        auditSummary!.adminActionsByActor.map((item) => (
                          <div key={item.actorId} className="flex items-center justify-between gap-2">
                            <span className="truncate text-muted-foreground">{item.actorEmail ?? item.actorId}</span>
                            <Badge variant="outline">{item.count}</Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">{t.authLogHistory}</p>
                  <AppTooltip content={locale === "fr" ? "Afficher/masquer les filtres" : "Show/hide filters"}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-9 w-9 rounded-xl text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground ${showAuditFilters ? "bg-background/80 text-foreground" : ""}`}
                      onClick={() => setShowAuditFilters((current) => !current)}
                      aria-label={locale === "fr" ? "Afficher/masquer les filtres" : "Show/hide filters"}
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </AppTooltip>
                </div>

                {showAuditFilters ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground" htmlFor="audit-search">
                        {locale === "fr" ? "Recherche" : "Search"}
                      </label>
                      <Input
                        id="audit-search"
                        value={auditSearchQuery}
                        onChange={(event) => {
                          setAuditSearchQuery(event.target.value);
                          setAuditPageWithReset(0);
                        }}
                        placeholder={locale === "fr" ? "Action, message, log..." : "Action, message, log..."}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">{locale === "fr" ? "Action" : "Action"}</label>
                      <SearchableSelect
                        options={auditActionOptions}
                        value={auditActionFilter}
                        onValueChange={(value) => {
                          setAuditActionFilter(value);
                          setAuditPageWithReset(0);
                        }}
                        placeholder={locale === "fr" ? "Toutes les actions" : "All actions"}
                        searchPlaceholder={locale === "fr" ? "Rechercher une action..." : "Search action..."}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">{locale === "fr" ? "Statut" : "Status"}</label>
                      <SearchableSelect
                        options={[
                          { value: "ALL", label: locale === "fr" ? "Tous" : "All", keywords: ["all", "tous"] },
                          { value: "OK", label: "OK", keywords: ["ok", "success"] },
                          { value: "ERROR", label: "ERROR", keywords: ["error", "erreur"] },
                          { value: "INFO", label: "INFO", keywords: ["info", "information"] },
                        ]}
                        value={auditStatusFilter}
                        onValueChange={(value) => {
                          setAuditStatusFilter(value as AuditStatusFilter);
                          setAuditPageWithReset(0);
                        }}
                        placeholder={locale === "fr" ? "Tous" : "All"}
                        searchPlaceholder={locale === "fr" ? "Rechercher un statut..." : "Search status..."}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">{locale === "fr" ? "Lignes par page" : "Rows per page"}</label>
                      <SearchableSelect
                        options={[
                          { value: "10", label: "10", keywords: ["10"] },
                          { value: "20", label: "20", keywords: ["20"] },
                          { value: "50", label: "50", keywords: ["50"] },
                        ]}
                        value={String(auditPageSize)}
                        onValueChange={(value) => {
                          setAuditPageSize(Number(value));
                          setAuditPageWithReset(0);
                        }}
                        placeholder="10"
                        searchPlaceholder={locale === "fr" ? "Rechercher une taille..." : "Search size..."}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="max-h-[52vh] overflow-auto rounded-xl border border-border/80 bg-background/70">
                  <table className="w-full min-w-190 text-left text-sm">
                    <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={allAuditSelectedOnPage}
                            onChange={toggleSelectAllAuditOnPage}
                            aria-label={locale === "fr" ? "Tout selectionner" : "Select all"}
                          />
                        </th>
                        <th className="px-3 py-3">{locale === "fr" ? "Heure" : "Time"}</th>
                        <th className="px-3 py-3">{locale === "fr" ? "Action" : "Action"}</th>
                        <th className="px-3 py-3">{locale === "fr" ? "Message" : "Message"}</th>
                        <th className="px-3 py-3">{locale === "fr" ? "Statut" : "Status"}</th>
                        <th className="px-3 py-3">{locale === "fr" ? "Actions" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogsQuery.isLoading ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                            {locale === "fr" ? "Chargement des logs d'audit..." : "Loading audit logs..."}
                          </td>
                        </tr>
                      ) : auditLogsQuery.isError ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-destructive">
                            {locale === "fr" ? "Impossible de charger les logs d'audit." : "Unable to load audit logs."}
                          </td>
                        </tr>
                      ) : pagedAuditEntries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                            {t.noLogsYet}
                          </td>
                        </tr>
                      ) : (
                        pagedAuditEntries.map((entry) => (
                          <tr key={entry.id} className="border-t border-border/60 align-top">
                            <td className="px-3 py-3">
                              <input
                                type="checkbox"
                                checked={selectedAuditIds.has(entry.id)}
                                onChange={() => toggleAuditSelection(entry.id)}
                                aria-label={locale === "fr" ? "Selectionner audit" : "Select audit"}
                              />
                            </td>
                            <td className="px-3 py-3 text-muted-foreground">{entry.time}</td>
                            <td className="px-3 py-3">
                              <Badge variant="outline">{entry.action}</Badge>
                            </td>
                            <td className="px-3 py-3 text-muted-foreground">{entry.message || "-"}</td>
                            <td className="px-3 py-3">
                              <Badge variant={entry.status === "ERROR" ? "danger" : entry.status === "OK" ? "success" : "outline"}>
                                {entry.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCurrentAuditDetail(entry);
                                  setAuditDetailOpen(true);
                                }}
                              >
                                {locale === "fr" ? "Voir détails" : "View details"}
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {selectedAuditIds.size > 0
                      ? `${selectedAuditIds.size} ${locale === "fr" ? "ligne(s) sélectionnée(s)" : "row(s) selected"}`
                      : `${auditTotalElements} ${locale === "fr" ? "audit(s)" : "audit row(s)"}`}
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      {locale === "fr"
                        ? `Page ${Math.min(safeAuditPage + 1, Math.max(auditTotalPages, 1))} sur ${Math.max(auditTotalPages, 1)}`
                        : `Page ${Math.min(safeAuditPage + 1, Math.max(auditTotalPages, 1))} of ${Math.max(auditTotalPages, 1)}`}
                    </p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => setAuditPageWithReset(0)} disabled={safeAuditPage <= 0} className="px-2">
                        «
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAuditPageWithReset((current) => Math.max(current - 1, 0))}
                        disabled={safeAuditPage <= 0}
                        className="px-2"
                      >
                        ‹
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAuditPageWithReset((current) => current + 1)}
                        disabled={auditTotalPages === 0 || safeAuditPage >= auditTotalPages - 1}
                        className="px-2"
                      >
                        ›
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAuditPageWithReset(Math.max(auditTotalPages - 1, 0))}
                        disabled={auditTotalPages === 0 || safeAuditPage >= auditTotalPages - 1}
                        className="px-2"
                      >
                        »
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </main>
      </div>

      <Dialog open={auditDetailOpen} onOpenChange={setAuditDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{locale === "fr" ? "Détail de l'audit" : "Audit detail"}</DialogTitle>
            <DialogDescription>
              {locale === "fr"
                ? "Informations détaillées de l'entrée d'audit sélectionnée."
                : "Detailed information for the selected audit entry."}
            </DialogDescription>
          </DialogHeader>

          {currentAuditDetail ? (
            <div className="grid gap-3 text-sm">
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">{locale === "fr" ? "Heure" : "Time"}</p>
                <p>{currentAuditDetail.time}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">{locale === "fr" ? "Action" : "Action"}</p>
                <p>{currentAuditDetail.action}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">{locale === "fr" ? "Statut" : "Status"}</p>
                <p>{currentAuditDetail.status}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">{locale === "fr" ? "Resultat" : "Outcome"}</p>
                <p>{currentAuditDetail.outcome || "-"}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">{locale === "fr" ? "Message" : "Message"}</p>
                <p>{currentAuditDetail.message || "-"}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">Correlation ID</p>
                <p className="break-all">{currentAuditDetail.correlationId || "-"}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">{locale === "fr" ? "Code raison" : "Reason code"}</p>
                <p>{currentAuditDetail.reasonCode || "-"}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">{locale === "fr" ? "Log brut" : "Raw log"}</p>
                <p className="break-all">{currentAuditDetail.raw}</p>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAuditDetailOpen(false)}>
              {locale === "fr" ? "Fermer" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {searchDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 px-4 pt-20 backdrop-blur-sm" onClick={() => setSearchDialogOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={locale === "fr" ? "Rechercher pages, actions..." : "Search pages, actions..."}
                className="h-8 w-full bg-transparent text-sm outline-none"
              />
              <button type="button" className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground" onClick={() => setSearchDialogOpen(false)}>
                ESC
              </button>
            </div>

            <div className="max-h-95 overflow-auto px-2 py-2">
              {filteredSearchItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.tab);
                      setSearchDialogOpen(false);
                    }}
                    className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                      activeTab === item.tab ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    <span className={`text-xs ${activeTab === item.tab ? "text-primary-foreground/85" : "text-muted-foreground"}`}>{item.section}</span>
                  </button>
                );
              })}

              {filteredSearchItems.length === 0 ? (
                <p className="px-3 py-5 text-sm text-muted-foreground">
                  {locale === "fr" ? "Aucun resultat." : "No results."}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
              <span>{locale === "fr" ? "↑↓ Naviguer • Enter Selectionner" : "↑↓ Navigate • Enter Select"}</span>
              <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSearchDialogOpen(false)}>
                <X className="h-3.5 w-3.5" />
                {locale === "fr" ? "Fermer" : "Close"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
