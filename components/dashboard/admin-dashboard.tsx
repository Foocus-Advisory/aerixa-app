"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import {
  Moon,
  Sun,
  Languages,
  ShieldCheck,
  Users,
  KeyRound,
  FileText,
  LayoutDashboard,
  Bell,
  Search,
  Filter,
  CircleUserRound,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { MailTemplatesAdminPanel } from "@/components/admin/mail-templates/mail-templates-admin-panel";
import { useToast } from "@/components/ui/toast-provider";
import { AppTooltip } from "@/components/ui/tooltip";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { decodeJwt } from "@/lib/jwt-utils";
import type { LoginRequest, NotificationReadStatus, RegisterRequest } from "@/lib/types";

type GlobalSearchItem = {
  id: string;
  label: string;
  section: string;
  tab: string;
  icon: typeof LayoutDashboard;
};

type MobileMenuGroup = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  tab?: string;
  subItems: Array<{ id: string; label: string; tab: string; icon?: typeof LayoutDashboard }>;
};

type AuditStatusFilter = "ALL" | "OK" | "ERROR" | "INFO";

type AuditEntry = {
  id: string;
  time: string;
  action: string;
  message: string;
  status: Exclude<AuditStatusFilter, "ALL">;
  raw: string;
};

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

function computeInitials(source: string): string {
  const normalized = source.trim();
  if (!normalized) {
    return "AU";
  }

  const emailLocalPart = normalized.includes("@") ? normalized.split("@")[0] : normalized;
  const parts = emailLocalPart.split(/[\s._-]+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return emailLocalPart.slice(0, 2).toUpperCase();
}

export function AdminDashboard() {
  const { theme, setTheme, locale, setLocale, accessToken, refreshToken, setTokens, clearTokens, activeTab, setActiveTab } = useDashboardStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const t = dictionaries[locale];

  const connectedUser = useMemo(() => {
    const payload = accessToken ? decodeJwt(accessToken) : null;

    const firstName = normalizeClaim(payload?.firstName) || normalizeClaim(payload?.given_name);
    const lastName = normalizeClaim(payload?.lastName) || normalizeClaim(payload?.family_name);
    const username = normalizeClaim(payload?.username) || normalizeClaim(payload?.preferred_username);
    const email = normalizeClaim(payload?.email) || normalizeClaim(payload?.sub);
    const explicitName = normalizeClaim(payload?.name);
    const fullName = `${firstName} ${lastName}`.trim() || explicitName || username || email || "AERIXA User";
    const avatarUrl =
      normalizeClaim(payload?.picture) ||
      normalizeClaim(payload?.avatar) ||
      normalizeClaim(payload?.profileImageUrl) ||
      normalizeClaim(payload?.photoUrl);

    return {
      fullName,
      initials: computeInitials(fullName),
      avatarUrl,
    };
  }, [accessToken]);

  const [apiLog, setApiLog] = useState<string[]>([]);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [notificationPage, setNotificationPage] = useState(0);
  const [notificationPageSize, setNotificationPageSize] = useState(10);
  const [notificationReadStatus, setNotificationReadStatus] = useState<NotificationReadStatus>("ALL");
  const [notificationSearchQuery, setNotificationSearchQuery] = useState("");
  const [notificationTypeFilter, setNotificationTypeFilter] = useState("ALL");
  const [selectedDropdownNotificationIds, setSelectedDropdownNotificationIds] = useState<Set<string>>(new Set());
  const [selectedDialogNotificationIds, setSelectedDialogNotificationIds] = useState<Set<string>>(new Set());
  const [showAuditFilters, setShowAuditFilters] = useState(true);
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
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      appendLog("REFRESH OK");
    },
    onError: (error) => appendLog(`REFRESH ERROR: ${(error as Error).message}`),
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.auth.logout(accessToken),
    onSuccess: () => {
      clearTokens();
      appendLog("LOGOUT OK");
    },
    onError: (error) => appendLog(`LOGOUT ERROR: ${(error as Error).message}`),
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
    enabled: Boolean(accessToken),
  });

  const notificationsDialogQuery = useQuery({
    queryKey: ["notifications", accessToken, "dialog", notificationPage, notificationPageSize, notificationReadStatus],
    queryFn: () => api.notifications.list(accessToken, notificationPage, notificationPageSize, notificationReadStatus),
    enabled: Boolean(accessToken) && activeTab === "settings-notifications",
  });

  const unreadCountQuery = useQuery({
    queryKey: ["notifications", accessToken, "unread-count"],
    queryFn: () => api.notifications.unreadCount(accessToken),
    enabled: Boolean(accessToken),
  });

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
      apiLog.map((line, index) => {
        const separatorIndex = line.indexOf(" - ");
        const time = separatorIndex >= 0 ? line.slice(0, separatorIndex).trim() : "-";
        const payload = separatorIndex >= 0 ? line.slice(separatorIndex + 3).trim() : line.trim();
        const actionSeparatorIndex = payload.indexOf(":");
        const action = (actionSeparatorIndex >= 0 ? payload.slice(0, actionSeparatorIndex) : payload).trim();
        const message = (actionSeparatorIndex >= 0 ? payload.slice(actionSeparatorIndex + 1) : "").trim();
        const normalized = payload.toUpperCase();
        const status: Exclude<AuditStatusFilter, "ALL"> = normalized.includes("ERROR")
          ? "ERROR"
          : normalized.includes("OK")
            ? "OK"
            : "INFO";

        return {
          id: `${index}-${line}`,
          time,
          action: action || (locale === "fr" ? "Action" : "Action"),
          message,
          status,
          raw: line,
        };
      }),
    [apiLog, locale],
  );

  const auditActionOptions = useMemo(
    () => [
      {
        value: "ALL",
        label: locale === "fr" ? "Toutes les actions" : "All actions",
        keywords: ["all", "toutes", "actions"],
      },
      ...Array.from(new Set(auditEntries.map((entry) => entry.action))).map((action) => ({
        value: action,
        label: action,
        keywords: [action.toLowerCase()],
      })),
    ],
    [auditEntries, locale],
  );

  const filteredAuditEntries = useMemo(
    () =>
      auditEntries.filter((entry) => {
        const query = auditSearchQuery.trim().toLowerCase();
        const matchesQuery =
          query.length === 0 ||
          `${entry.action} ${entry.message} ${entry.raw}`.toLowerCase().includes(query);
        const matchesAction = auditActionFilter === "ALL" || entry.action === auditActionFilter;
        const matchesStatus = auditStatusFilter === "ALL" || entry.status === auditStatusFilter;
        return matchesQuery && matchesAction && matchesStatus;
      }),
    [auditEntries, auditSearchQuery, auditActionFilter, auditStatusFilter],
  );

  const auditTotalElements = filteredAuditEntries.length;
  const auditTotalPages = Math.ceil(auditTotalElements / auditPageSize);
  const safeAuditPage = Math.min(auditPage, Math.max(auditTotalPages - 1, 0));
  const pagedAuditEntries = filteredAuditEntries.slice(
    safeAuditPage * auditPageSize,
    safeAuditPage * auditPageSize + auditPageSize,
  );
  const allAuditSelectedOnPage =
    pagedAuditEntries.length > 0 &&
    pagedAuditEntries.every((entry) => selectedAuditIds.has(entry.id));

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
            { id: "notifications", label: "Notifications", section: "Settings", tab: "settings-notifications", icon: Bell },
            { id: "audit", label: "Audit log", section: "Settings", tab: "settings-audit", icon: FileText },
          ],
    [locale],
  );

  const filteredSearchItems = useMemo(
    () => globalSearchItems.filter((item) => `${item.label} ${item.section}`.toLowerCase().includes(searchQuery.toLowerCase())),
    [globalSearchItems, searchQuery],
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

  const mobileMenuGroups = useMemo<MobileMenuGroup[]>(
    () =>
      locale === "fr"
        ? [
            {
              id: "dashboard",
              label: "Dashboard",
              icon: LayoutDashboard,
              tab: "dashboard",
              subItems: [{ id: "dashboard-main", label: "Dashboard", tab: "dashboard", icon: LayoutDashboard }],
            },
            {
              id: "users",
              label: "Users",
              icon: Users,
              subItems: [
                { id: "users-list", label: "Utilisateurs", tab: "users", icon: UserRound },
                { id: "users-sessions", label: "Sessions", tab: "sessions", icon: Clock3 },
              ],
            },
            {
              id: "security",
              label: "Securite",
              icon: ShieldCheck,
              subItems: [
                { id: "security-roles", label: "Roles", tab: "security-roles", icon: KeyRound },
                { id: "security-permissions", label: "Permissions", tab: "security-permissions", icon: Lock },
              ],
            },
            {
              id: "mail-template",
              label: "Mail",
              icon: Mail,
              tab: "mail-template",
              subItems: [{ id: "mail-template-main", label: "Template de mail", tab: "mail-template", icon: Mail }],
            },
            {
              id: "settings",
              label: "Parametres",
              icon: Settings,
              subItems: [
                { id: "settings-profile", label: "Profile", tab: "settings-profile", icon: UserRound },
                { id: "settings-notifications", label: "Notifications", tab: "settings-notifications", icon: Bell },
                { id: "settings-audit", label: "Journal d'audit", tab: "settings-audit", icon: FileText },
              ],
            },
          ]
        : [
            {
              id: "dashboard",
              label: "Dashboard",
              icon: LayoutDashboard,
              tab: "dashboard",
              subItems: [{ id: "dashboard-main", label: "Dashboard", tab: "dashboard", icon: LayoutDashboard }],
            },
            {
              id: "users",
              label: "Users",
              icon: Users,
              subItems: [
                { id: "users-list", label: "Users", tab: "users", icon: UserRound },
                { id: "users-sessions", label: "Sessions", tab: "sessions", icon: Clock3 },
              ],
            },
            {
              id: "security",
              label: "Security",
              icon: ShieldCheck,
              subItems: [
                { id: "security-roles", label: "Roles", tab: "security-roles", icon: KeyRound },
                { id: "security-permissions", label: "Permissions", tab: "security-permissions", icon: Lock },
              ],
            },
            {
              id: "mail-template",
              label: "Mail",
              icon: Mail,
              tab: "mail-template",
              subItems: [{ id: "mail-template-main", label: "Mail template", tab: "mail-template", icon: Mail }],
            },
            {
              id: "settings",
              label: "Settings",
              icon: Settings,
              subItems: [
                { id: "settings-profile", label: "Profile", tab: "settings-profile", icon: UserRound },
                { id: "settings-notifications", label: "Notifications", tab: "settings-notifications", icon: Bell },
                { id: "settings-audit", label: "Audit log", tab: "settings-audit", icon: FileText },
              ],
            },
          ],
    [locale],
  );

  const activeMobileGroup = useMemo(
    () =>
      mobileMenuGroups.find(
        (item) => item.tab === activeTab || item.subItems.some((subItem) => subItem.tab === activeTab),
      ) ?? mobileMenuGroups[0],
    [activeTab, mobileMenuGroups],
  );

  const selectMobileGroup = (group: MobileMenuGroup) => {
    if (group.subItems.length > 0) {
      setActiveTab(group.subItems[0].tab);
      return;
    }
    if (group.tab) {
      setActiveTab(group.tab);
    }
  };

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

  useEffect(() => {
    if (auditPage > 0 && auditPage > Math.max(auditTotalPages - 1, 0)) {
      setAuditPage(Math.max(auditTotalPages - 1, 0));
    }
  }, [auditPage, auditTotalPages]);

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
                      disabled={selectedDropdownNotificationIds.size === 0 || updateBulkNotificationReadStatusMutation.isPending}
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
                      setActiveTab("settings-notifications");
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

        <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
          <section className="md:hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                {activeMobileGroup.subItems.map((subItem) => {
                  const SubIcon = subItem.icon;
                  return (
                    <TabsTrigger key={subItem.id} value={subItem.tab} className="justify-center">
                      {SubIcon ? <SubIcon className="h-3.5 w-3.5" /> : null}
                      <span>{subItem.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </section>

          <Card className="border-border/60 bg-card/70 shadow-sm">
            <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-3xl">{t.title}</CardTitle>
                <CardDescription>{t.subtitle}</CardDescription>
              </div>
              <Badge className="w-fit" variant="outline">
                <LayoutDashboard className="h-3.5 w-3.5" />
                {t.section}: {activeTab}
              </Badge>
            </CardHeader>
          </Card>

          {activeTab === "dashboard" ? (
            <section className="grid gap-6 lg:grid-cols-3">
              <Card className="border-border/60 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> {t.users}</CardTitle>
                  <CardDescription>{locale === "fr" ? "Acces rapide aux utilisateurs" : "Quick access to users"}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2">
                  <Button variant="outline" onClick={() => setActiveTab("users")}>{locale === "fr" ? "Ouvrir utilisateurs" : "Open users"}</Button>
                  <Button variant="outline" onClick={() => setActiveTab("sessions")}>{locale === "fr" ? "Ouvrir sessions" : "Open sessions"}</Button>
                </CardContent>
              </Card>
              <Card className="border-border/60 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> {locale === "fr" ? "Securite" : "Security"}</CardTitle>
                  <CardDescription>{locale === "fr" ? "Roles et permissions" : "Roles and permissions"}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2">
                  <Button variant="outline" onClick={() => setActiveTab("security-roles")}>{locale === "fr" ? "Gerer les roles" : "Manage roles"}</Button>
                  <Button variant="outline" onClick={() => setActiveTab("security-permissions")}>{locale === "fr" ? "Gerer les permissions" : "Manage permissions"}</Button>
                </CardContent>
              </Card>
              <Card className="border-border/60 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> {locale === "fr" ? "Notifications" : "Notifications"}</CardTitle>
                  <CardDescription>{locale === "fr" ? "Etat des alertes" : "Alerts status"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {locale === "fr" ? `Vous avez ${unreadNotificationsCount} notification(s) non lue(s).` : `You have ${unreadNotificationsCount} unread notification(s).`}
                  </p>
                </CardContent>
              </Card>
            </section>
          ) : null}

          {activeTab === "security-roles" ? (
            <SecurityRolesPanel locale={locale} onLog={appendLog} accessToken={accessToken} />
          ) : null}

          {activeTab === "security-permissions" ? (
            <SecurityPermissionsPanel locale={locale} />
          ) : null}

          {activeTab === "sessions" ? (
            <SessionsManagementPanel accessToken={accessToken} locale={locale} onLog={appendLog} />
          ) : null}

          {activeTab === "users" ? (
            <UsersManagementPanel accessToken={accessToken} locale={locale} onLog={appendLog} />
          ) : null}

          {activeTab === "mail-template" ? (
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

          {activeTab === "settings-notifications" ? (
            <Card className="border-border/60 bg-card/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> {locale === "fr" ? "Notifications" : "Notifications"}</CardTitle>
                <CardDescription>{locale === "fr" ? "Filtres avancés et actions bulk directement dans la page" : "Advanced filters and bulk actions directly in page"}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
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

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    {locale === "fr"
                      ? `Vous avez actuellement ${unreadNotificationsCount} notification(s) non lue(s).`
                      : `You currently have ${unreadNotificationsCount} unread notification(s).`}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateBulkNotificationReadStatusMutation.mutate({
                        ids: Array.from(selectedDialogNotificationIds),
                        read: true,
                      })}
                      disabled={selectedDialogNotificationIds.size === 0 || updateBulkNotificationReadStatusMutation.isPending}
                    >
                      {locale === "fr" ? "Marquer lu" : "Mark read"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateBulkNotificationReadStatusMutation.mutate({
                        ids: Array.from(selectedDialogNotificationIds),
                        read: false,
                      })}
                      disabled={selectedDialogNotificationIds.size === 0 || updateBulkNotificationReadStatusMutation.isPending}
                    >
                      {locale === "fr" ? "Marquer non lu" : "Mark unread"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteBulkNotificationsMutation.mutate(Array.from(selectedDialogNotificationIds))}
                      disabled={selectedDialogNotificationIds.size === 0 || deleteBulkNotificationsMutation.isPending}
                    >
                      {locale === "fr" ? "Supprimer sélection" : "Delete selected"}
                    </Button>
                  </div>
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
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateNotificationReadStatusMutation.mutate({
                                    id: notification.id,
                                    read: !notification.read,
                                  })}
                                  disabled={updateNotificationReadStatusMutation.isPending}
                                >
                                  {notification.read
                                    ? (locale === "fr" ? "Non lu" : "Unread")
                                    : (locale === "fr" ? "Lu" : "Read")}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteNotificationMutation.mutate(notification.id)}
                                  disabled={deleteNotificationMutation.isPending}
                                >
                                  {locale === "fr" ? "Supprimer" : "Delete"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

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

          {activeTab === "settings-audit" ? (
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
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">{t.authLogHistory}</p>
                  <Button variant="outline" size="sm" onClick={() => setShowAuditFilters((current) => !current)}>
                    <Filter className="mr-2 h-4 w-4" />
                    {showAuditFilters
                      ? (locale === "fr" ? "Masquer les filtres" : "Hide filters")
                      : (locale === "fr" ? "Afficher les filtres" : "Show filters")}
                  </Button>
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
                      {pagedAuditEntries.length === 0 ? (
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

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 py-2 backdrop-blur md:hidden">
          <div className="grid grid-cols-5 gap-2">
            {mobileMenuGroups.map((item) => {
              const Icon = item.icon;
              const isActive = activeMobileGroup.id === item.id;
              return (
                <AppTooltip key={item.id} content={item.label} side="top">
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className="h-12 flex-col gap-1"
                    onClick={() => selectMobileGroup(item)}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[11px]">{item.label}</span>
                  </Button>
                </AppTooltip>
              );
            })}
          </div>
        </nav>
      </div>

      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.logoutConfirmTitle}</DialogTitle>
            <DialogDescription>{t.logoutConfirmDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutConfirmOpen(false)}>
              {t.logoutConfirmCancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setLogoutConfirmOpen(false);
                logoutMutation.mutate();
              }}
              disabled={!accessToken || logoutMutation.isPending}
            >
              {t.logoutConfirmAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <p className="text-xs text-muted-foreground">{locale === "fr" ? "Message" : "Message"}</p>
                <p>{currentAuditDetail.message || "-"}</p>
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
