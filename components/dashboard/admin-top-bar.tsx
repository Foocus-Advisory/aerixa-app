"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Languages, Moon, Search, Sun } from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";
import { useDashboardStore } from "@/store/dashboard-store";
import { BrandLogo } from "@/components/brand-logo";
import { buildPermissionSet, hasPermission } from "@/lib/permissions";
import { tabToPath } from "@/lib/dashboard-routes";
import { decodeJwt } from "@/lib/jwt-utils";
import { AppTooltip } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function normalizeClaim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function computeInitials(primary: string, fallback?: string): string {
  const pick = (src: string) => {
    const normalized = src.trim();
    if (!normalized) return "";
    const parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return normalized.slice(0, 2).toUpperCase();
  };
  return pick(primary) || pick(fallback ?? "") || "AU";
}

function resolveAvatarUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  if (/^(https?:\/\/|data:|blob:)/i.test(trimmed)) return trimmed;
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");
  return `${base}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

function formatNotificationDate(value: string, locale: "fr" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function AdminTopBar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { locale, theme, accessToken, setLocale, setTheme } = useDashboardStore();

  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const notificationRef = useRef<HTMLDivElement>(null);

  const tokenState = useMemo(() => (accessToken ? "CONNECTED" : "GUEST"), [accessToken]);

  const tokenPayload = useMemo(
    () => (accessToken ? decodeJwt(accessToken) : null),
    [accessToken],
  );

  const currentUserQuery = useQuery({
    queryKey: ["admin-top-bar", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });

  // Fetch profile photo blob (same logic as admin-dashboard)
  useEffect(() => {
    const path = currentUserQuery.data?.profilePhotoUrl?.trim() ?? "";
    if (!accessToken || !path) {
      setProfilePhotoUrl("");
      return;
    }
    let cancelled = false;
    let objectUrl = "";
    api.users
      .getProfilePhotoBlob(accessToken, path)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setProfilePhotoUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setProfilePhotoUrl("");
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [accessToken, currentUserQuery.data?.profilePhotoUrl]);

  const connectedUser = useMemo(() => {
    const profile = currentUserQuery.data;
    const firstName = profile?.firstName?.trim() || normalizeClaim(tokenPayload?.given_name) || normalizeClaim(tokenPayload?.firstName);
    const lastName = profile?.lastName?.trim() || normalizeClaim(tokenPayload?.family_name) || normalizeClaim(tokenPayload?.lastName);
    const email = profile?.email?.trim() || normalizeClaim(tokenPayload?.email) || normalizeClaim(tokenPayload?.sub);
    const fullName = `${firstName} ${lastName}`.trim() || normalizeClaim(tokenPayload?.name) || email || "AERIXA User";
    const rawAvatar =
      normalizeClaim(tokenPayload?.picture) ||
      normalizeClaim(tokenPayload?.avatar) ||
      normalizeClaim(tokenPayload?.profileImageUrl) ||
      normalizeClaim(tokenPayload?.photoUrl);
    return {
      fullName,
      initials: computeInitials(`${firstName} ${lastName}`.trim(), email),
      avatarUrl: profilePhotoUrl || resolveAvatarUrl(rawAvatar),
    };
  }, [profilePhotoUrl, currentUserQuery.data, tokenPayload]);

  const permissionSet = useMemo(
    () => buildPermissionSet(currentUserQuery.data ?? null),
    [currentUserQuery.data],
  );

  const canReadNotifications = hasPermission(permissionSet, "notifications:read");
  const canEditNotifications = hasPermission(permissionSet, "notifications:edit");

  const unreadCountQuery = useQuery({
    queryKey: ["notifications", "unread-count", accessToken],
    queryFn: () => api.notifications.unreadCount(accessToken),
    enabled: Boolean(accessToken),
    refetchInterval: 30000,
  });

  const dropdownQuery = useQuery({
    queryKey: ["notifications", accessToken, "dropdown"],
    queryFn: () => api.notifications.list(accessToken, 0, 8, "UNREAD"),
    enabled: Boolean(accessToken && canReadNotifications),
  });

  const invalidateNotifications = async () => {
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markReadMutation = useMutation({
    mutationFn: ({ ids, read }: { ids: string[]; read: boolean }) =>
      api.notifications.setReadStatusBulk(accessToken, ids, read),
    onSuccess: async () => {
      await invalidateNotifications();
      setSelectedIds(new Set());
    },
  });

  useEffect(() => {
    if (!notificationMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setNotificationMenuOpen(false);
        setSelectedIds(new Set());
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notificationMenuOpen]);

  const unreadCount = unreadCountQuery.data?.unreadCount ?? 0;
  const notifications = dropdownQuery.data?.content ?? [];
  const allSelected = notifications.length > 0 && notifications.every((n) => selectedIds.has(n.id));

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(notifications.map((n) => n.id)));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border/50 bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 md:px-8">
        <BrandLogo
          variant="admin"
          className="h-8 w-8 shrink-0 md:hidden"
          width={32}
          height={32}
          priority
        />

        <AppTooltip content={locale === "fr" ? "Ouvrir la recherche globale" : "Open global search"}>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="hidden h-10 min-w-70 items-center rounded-full border border-border/70 bg-card/50 px-4 text-sm text-muted-foreground transition hover:border-border md:flex"
          >
            <Search className="mr-2 h-4 w-4" />
            <span>{locale === "fr" ? "Rechercher pages, actions..." : "Search pages, actions..."}</span>
            <span className="ml-auto rounded border border-border/80 px-1.5 py-0.5 text-[11px]">Ctrl+K</span>
          </button>
        </AppTooltip>

        <div className="relative ml-auto flex items-center gap-2" ref={notificationRef}>
          {canReadNotifications && (
            <AppTooltip content={locale === "fr" ? "Voir les notifications" : "View notifications"}>
              <Button
                variant="ghost"
                size="sm"
                className="relative h-9 w-9 rounded-full p-0 hover:bg-muted"
                onClick={() => setNotificationMenuOpen((o) => { if (o) setSelectedIds(new Set()); return !o; })}
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
                )}
              </Button>
            </AppTooltip>
          )}

          {notificationMenuOpen && (
            <div className="absolute right-0 top-12 z-40 w-90 rounded-xl border border-border bg-card p-3 shadow-xl">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label={locale === "fr" ? "Tout sélectionner" : "Select all"}
                  />
                  <p className="text-sm font-semibold">{locale === "fr" ? "Non lues" : "Unread"}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => markReadMutation.mutate({ ids: Array.from(selectedIds), read: true })}
                  disabled={!canEditNotifications || selectedIds.size === 0 || markReadMutation.isPending}
                >
                  {locale === "fr" ? "Marquer lues" : "Mark as read"}
                </Button>
              </div>
              <div className="grid max-h-64 gap-2 overflow-auto">
                {notifications.length === 0 ? (
                  <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                    {locale === "fr" ? "Aucune notification non lue." : "No unread notifications."}
                  </p>
                ) : (
                  notifications.map((item) => (
                    <div key={item.id} className="rounded-md border border-border/80 px-3 py-2">
                      <div className="mb-1 flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleOne(item.id)}
                          aria-label={locale === "fr" ? "Sélectionner" : "Select"}
                          className="mt-0.5"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {formatNotificationDate(item.createdAt, locale)}
                          </p>
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
                  setNotificationMenuOpen(false);
                }}
              >
                {locale === "fr" ? "Voir toutes les notifications" : "View all notifications"}
              </Button>
            </div>
          )}

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

          <AppTooltip content={locale === "fr" ? "Changer de thème" : "Switch theme"}>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 rounded-full p-0 hover:bg-transparent"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={locale === "fr" ? "Changer de thème" : "Switch theme"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </AppTooltip>

          <AppTooltip content={locale === "fr" ? "Compte connecté" : "Connected account"}>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
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
  );
}
