"use client";

import { useMemo, useRef, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { dictionaries } from "@/lib/i18n";
import { api } from "@/lib/api";
import { buildPermissionSet, canAccessTab, type TabKey } from "@/lib/permissions";
import { tabToPath } from "@/lib/dashboard-routes";
import { AppTooltip } from "@/components/ui/tooltip";
import { useDashboardStore } from "@/store/dashboard-store";

type SidebarItem = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  tab?: string;
  subItems: Array<{ id: string; label: string; tab: string; icon?: ComponentType<{ className?: string }> }>;
};

const menusByLocale = {
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
    ] satisfies SidebarItem[],
} as const;

export function AppSidebar() {
  const router = useRouter();
  const { locale, theme, activeTab, clearTokens, accessToken } = useDashboardStore();
  const [hovered, setHovered] = useState<string | null>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const items = menusByLocale[locale];
  const t = dictionaries[locale];

  const currentUserQuery = useQuery({
    queryKey: ["settings-profile", "sidebar"],
    enabled: Boolean(accessToken),
    queryFn: () => api.users.getMe(accessToken),
  });

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);

  const filteredItems = useMemo(
    () =>
      items
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
    [items, permissionSet],
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

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-18.5 border-r border-border/60 bg-sidebar/90 md:flex md:flex-col md:items-center md:gap-4 md:py-4">
      <Image
        src={theme === "dark" ? "/img/min-logo-dark.png" : "/img/min-logo-light.png"}
        alt="AERIXA"
        width={36}
        height={36}
        className="h-9 w-9 object-contain"
        priority
      />

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
  );
}
