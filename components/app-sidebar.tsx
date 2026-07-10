"use client";

import { useMemo, useRef, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Shield,
  Mail,
  Settings,
  LogOut,
  UserRound,
  Bell,
  FileText,
  Lock,
  KeyRound,
  Clock3,
  Building2,
  GraduationCap,
  Award,
  BookOpen,
  Layers,
  Megaphone,
  GitBranch,
  Filter,
  Contact,
  ClipboardList,
  MessageCircle,
  MoreHorizontal,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { dictionaries } from "@/lib/i18n";
import { api } from "@/lib/api";
import { buildPermissionSet, canAccessTab, type TabKey } from "@/lib/permissions";
import { tabToPath } from "@/lib/dashboard-routes";
import { AppTooltip } from "@/components/ui/tooltip";
import { useDashboardStore } from "@/store/dashboard-store";

export type SidebarItem = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  tab?: string;
  subItems: Array<{ id: string; label: string; tab: string; icon?: ComponentType<{ className?: string }> }>;
};

export const menusByLocale = {
  fr: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      tab: "dashboard",
      subItems: [],
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
      icon: Shield,
      subItems: [
        { id: "roles", label: "Roles", tab: "security-roles", icon: KeyRound },
        { id: "permissions", label: "Permissions", tab: "security-permissions", icon: Lock },
      ],
    },
    {
      id: "mail-template",
      label: "Template de mail",
      icon: Mail,
      tab: "mail-template",
      subItems: [],
    },
    {
      id: "settings",
      label: "Parametre",
      icon: Settings,
      subItems: [
        { id: "profile", label: "Profile", tab: "settings-profile", icon: UserRound },
        { id: "settings-configuration", label: "Configuration metier", tab: "settings-configuration", icon: Settings },
        { id: "notifications", label: "Notifications", tab: "settings-notifications", icon: Bell },
        { id: "audit-log", label: "Journal d'audit", tab: "settings-audit", icon: FileText },
      ],
    },
    {
      id: "config-establishment",
      label: "Configuration",
      icon: Building2,
      subItems: [
        { id: "config-establishments", label: "Etablissements", tab: "config-establishments", icon: Building2 },
        { id: "config-entry-diplomas", label: "Diplomes d'entree", tab: "config-entry-diplomas", icon: Award },
        { id: "config-academic-levels", label: "Niveaux academiques", tab: "config-academic-levels", icon: GraduationCap },
        { id: "config-program-tracks", label: "Filieres", tab: "config-program-tracks", icon: BookOpen },
        { id: "config-program-track-levels", label: "Niveaux filiere", tab: "config-program-track-levels", icon: Layers },
        { id: "config-acquisition-channels", label: "Canaux d'acquisition", tab: "config-acquisition-channels", icon: Megaphone },
        { id: "config-funnel-stages", label: "Etapes du funnel", tab: "config-funnel-stages", icon: Filter },
        { id: "config-funnel-stage-transitions", label: "Transitions du funnel", tab: "config-funnel-stage-transitions", icon: GitBranch },
      ],
    },
    {
      id: "candidates",
      label: "Candidats",
      icon: Contact,
      subItems: [
        { id: "candidates-list", label: "Candidats", tab: "candidates", icon: Contact },
        { id: "candidates-applications", label: "Candidatures", tab: "candidate-applications", icon: ClipboardList },
        { id: "candidates-conversations", label: "Conversations WhatsApp", tab: "candidate-conversations", icon: MessageCircle },
      ],
    },
    {
      id: "guides",
      label: "Guides",
      icon: BookOpen,
      subItems: [
        { id: "guides-configuration", label: "Guide de configuration", tab: "guides-configuration", icon: Settings },
        { id: "guides-whatsapp-configuration", label: "Guide configuration WhatsApp", tab: "guides-whatsapp-configuration", icon: MessageCircle },
        { id: "guides-candidates-usage", label: "Guide utilisation candidats", tab: "guides-candidates-usage", icon: Contact },
      ],
    },
  ] satisfies SidebarItem[],
  en: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      tab: "dashboard",
      subItems: [],
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
      icon: Shield,
      subItems: [
        { id: "roles", label: "Roles", tab: "security-roles", icon: KeyRound },
        { id: "permissions", label: "Permissions", tab: "security-permissions", icon: Lock },
      ],
    },
    {
      id: "mail-template",
      label: "Mail template",
      icon: Mail,
      tab: "mail-template",
      subItems: [],
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      subItems: [
        { id: "profile", label: "Profile", tab: "settings-profile", icon: UserRound },
          { id: "settings-configuration", label: "Business configuration", tab: "settings-configuration", icon: Settings },
          { id: "notifications", label: "Notifications", tab: "settings-notifications", icon: Bell },
          { id: "audit-log", label: "Audit log", tab: "settings-audit", icon: FileText },
        ],
      },
      {
        id: "config-establishment",
        label: "Configuration",
        icon: Building2,
        subItems: [
          { id: "config-establishments", label: "Establishments", tab: "config-establishments", icon: Building2 },
          { id: "config-entry-diplomas", label: "Entry diplomas", tab: "config-entry-diplomas", icon: Award },
          { id: "config-academic-levels", label: "Academic levels", tab: "config-academic-levels", icon: GraduationCap },
          { id: "config-program-tracks", label: "Program tracks", tab: "config-program-tracks", icon: BookOpen },
          { id: "config-program-track-levels", label: "Track levels", tab: "config-program-track-levels", icon: Layers },
          { id: "config-acquisition-channels", label: "Acquisition channels", tab: "config-acquisition-channels", icon: Megaphone },
          { id: "config-funnel-stages", label: "Funnel stages", tab: "config-funnel-stages", icon: Filter },
          { id: "config-funnel-stage-transitions", label: "Funnel transitions", tab: "config-funnel-stage-transitions", icon: GitBranch },
        ],
      },
      {
        id: "candidates",
        label: "Candidates",
        icon: Contact,
        subItems: [
          { id: "candidates-list", label: "Candidates", tab: "candidates", icon: Contact },
          { id: "candidates-applications", label: "Applications", tab: "candidate-applications", icon: ClipboardList },
          { id: "candidates-conversations", label: "WhatsApp conversations", tab: "candidate-conversations", icon: MessageCircle },
        ],
      },
      {
        id: "guides",
        label: "Guides",
        icon: BookOpen,
        subItems: [
          { id: "guides-configuration", label: "Configuration guide", tab: "guides-configuration", icon: Settings },
          { id: "guides-whatsapp-configuration", label: "WhatsApp configuration guide", tab: "guides-whatsapp-configuration", icon: MessageCircle },
          { id: "guides-candidates-usage", label: "Candidates usage guide", tab: "guides-candidates-usage", icon: Contact },
        ],
      },
    ] satisfies SidebarItem[],
} as const;

export function AppSidebar() {
  const router = useRouter();
  const { locale, activeTab, clearTokens, accessToken } = useDashboardStore();
  const [hovered, setHovered] = useState<string | null>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [mobileOverflowOpen, setMobileOverflowOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const items = menusByLocale[locale];
  const t = dictionaries[locale];

  const currentUserQuery = useQuery({
    queryKey: ["settings-profile", "sidebar"],
    enabled: Boolean(accessToken),
    queryFn: () => api.users.getMe(accessToken),
  });

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);
  const normalizedRoles = useMemo(
    () => (currentUserQuery.data?.roles ?? []).map((role) => role.replace(/^ROLE_/, "").toUpperCase()),
    [currentUserQuery.data?.roles],
  );
  const isSuperAdmin = normalizedRoles.includes("SUPER_ADMIN");
  const isOperator = normalizedRoles.includes("OPERATOR");

  const filteredItems = useMemo(
    () =>
      items
        .filter((item) => !((isSuperAdmin || isOperator) && item.id === "config-establishment"))
        .map((item) => {
          const nextSubItems = item.subItems.filter((subItem) => canAccessTab(permissionSet, subItem.tab as TabKey));
          const canOpenRootTab = item.tab ? canAccessTab(permissionSet, item.tab as TabKey) : false;
          if (!canOpenRootTab && nextSubItems.length === 0) {
            return null;
          }

          return {
            ...item,
            subItems: nextSubItems,
          };
        })
        .filter(Boolean) as SidebarItem[],
    [items, permissionSet, isSuperAdmin, isOperator],
  );

  const openMenu = (id: string) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setHovered(id);
  };

  const scheduleClose = (id: string) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setHovered((current) => (current === id ? null : current));
    }, 180);
  };

  const activeGroup = useMemo(
    () =>
      filteredItems.find(
        (item) => item.tab === activeTab || item.subItems.some((subItem) => subItem.tab === activeTab),
      ),
    [activeTab, filteredItems],
  );

  const MOBILE_PRIMARY_COUNT = 3;
  const primaryMobileItems = filteredItems.slice(0, MOBILE_PRIMARY_COUNT);
  const overflowMobileItems = filteredItems.slice(MOBILE_PRIMARY_COUNT);
  const isOverflowActive = overflowMobileItems.some((item) => item.id === activeGroup?.id);

  const navigateToItem = (item: SidebarItem) => {
    if (item.subItems.length === 0) {
      if (item.tab) router.push(tabToPath(item.tab as TabKey));
      return;
    }
    router.push(tabToPath(item.subItems[0].tab as TabKey));
  };

  return (
    <>
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-18.5 border-r border-border/60 bg-sidebar/90 md:flex md:flex-col md:items-center md:gap-4 md:py-4">
      <BrandLogo variant="admin" className="h-9 w-9" priority />

      <nav className="relative mt-3 flex w-full flex-1 flex-col items-center gap-2 overflow-visible">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeGroup?.id === item.id;
          const hasSubItems = item.subItems.length > 0;
          const isHovered = hovered === item.id;

          return (
            <div
              key={item.id}
              className="group relative"
              onMouseEnter={() => (hasSubItems ? openMenu(item.id) : undefined)}
              onMouseLeave={() => (hasSubItems ? scheduleClose(item.id) : undefined)}
            >
              <AppTooltip content={item.label} side="right">
                <button
                  type="button"
                  onClick={() => {
                    if (!hasSubItems && item.tab) {
                      router.push(tabToPath(item.tab as TabKey));
                    }
                  }}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border text-muted-foreground transition hover:text-foreground ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/70 bg-card/40 hover:border-border"
                  }`}
                  aria-label={item.label}
                >
                  <Icon className="h-5 w-5" />
                </button>
              </AppTooltip>

              {hasSubItems && isHovered ? (
                <div
                  className="absolute left-11 top-0 w-56 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur"
                  onMouseEnter={() => openMenu(item.id)}
                  onMouseLeave={() => scheduleClose(item.id)}
                >
                  <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <div className="grid gap-1">
                    {item.subItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      return (
                        <button
                          key={subItem.id}
                          type="button"
                          onClick={() => router.push(tabToPath(subItem.tab as TabKey))}
                          className={`flex items-center justify-between rounded-lg px-2 py-2 text-sm transition ${
                            activeTab === subItem.tab
                              ? "bg-primary/15 text-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {SubIcon ? <SubIcon className="h-3.5 w-3.5" /> : null}
                            {subItem.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="mb-2 flex w-full flex-col items-center gap-2">
        <Badge variant="outline" className="rounded-full border-border/70 bg-card/40 px-2 py-0.5 text-[10px] text-muted-foreground">
          v1
        </Badge>
        <AppTooltip content={locale === "fr" ? "Deconnexion" : "Logout"} side="right">
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 rounded-full p-0 text-muted-foreground"
            onClick={() => setLogoutConfirmOpen(true)}
            aria-label={locale === "fr" ? "Deconnexion" : "Logout"}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </AppTooltip>
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
                clearTokens();
              }}
            >
              {t.logoutConfirmAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>

    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.35)] backdrop-blur md:hidden">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${Math.max(primaryMobileItems.length + (overflowMobileItems.length > 0 ? 1 : 0) + 1, 1)}, minmax(0, 1fr))` }}
      >
        {primaryMobileItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeGroup?.id === item.id;
          return (
            <AppTooltip key={item.id} content={item.label} side="top">
              <Button
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className="h-12 flex-col gap-1 rounded-2xl"
                onClick={() => navigateToItem(item)}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[11px]">{item.label}</span>
              </Button>
            </AppTooltip>
          );
        })}

        {overflowMobileItems.length > 0 ? (
          <AppTooltip content={locale === "fr" ? "Plus" : "More"} side="top">
            <Button
              variant={mobileOverflowOpen || isOverflowActive ? "default" : "ghost"}
              size="sm"
              className="h-12 flex-col gap-1 rounded-2xl"
              onClick={() => setMobileOverflowOpen((current) => !current)}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="text-[11px]">{locale === "fr" ? "Plus" : "More"}</span>
            </Button>
          </AppTooltip>
        ) : null}

        <AppTooltip content={locale === "fr" ? "Deconnexion" : "Logout"} side="top">
          <Button
            variant="ghost"
            size="sm"
            className="h-12 flex-col gap-1 rounded-2xl"
            onClick={() => setLogoutConfirmOpen(true)}
          >
            <LogOut className="h-4 w-4" />
            <span className="text-[11px]">{locale === "fr" ? "Logout" : "Logout"}</span>
          </Button>
        </AppTooltip>
      </div>
    </nav>

    {mobileOverflowOpen && overflowMobileItems.length > 0 ? (
      <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
        <button
          type="button"
          className="absolute inset-0 bg-black/40"
          aria-label={locale === "fr" ? "Fermer le menu" : "Close menu"}
          onClick={() => setMobileOverflowOpen(false)}
        />
        <aside className="absolute right-0 top-0 h-full w-[84vw] max-w-sm border-l border-border bg-background p-4 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {locale === "fr" ? "Navigation" : "Navigation"}
            </h3>
            <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0" onClick={() => setMobileOverflowOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2 overflow-y-auto pb-6">
            {overflowMobileItems.map((group) => {
              const GroupIcon = group.icon;
              const isGroupActive = activeGroup?.id === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-2xl border border-border/70 bg-card/60 p-3 text-left"
                  onClick={() => {
                    setMobileOverflowOpen(false);
                    navigateToItem(group);
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <GroupIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">{group.label}</span>
                  </span>
                  {isGroupActive ? <Check className="h-4 w-4 text-primary" /> : null}
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    ) : null}
    </>
  );
}
