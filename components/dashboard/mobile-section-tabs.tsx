"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { menusByLocale } from "@/components/app-sidebar";
import { api } from "@/lib/api";
import { canAccessTab, type TabKey } from "@/lib/permissions";
import { tabToPath } from "@/lib/dashboard-routes";
import { useDashboardStore } from "@/store/dashboard-store";

type Props = {
  permissionSet: Set<string>;
};

export function MobileSectionTabs({ permissionSet }: Props) {
  const router = useRouter();
  const { locale, activeTab, accessToken } = useDashboardStore();

  const currentUserQuery = useQuery({
    queryKey: ["mobile-section-tabs", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });

  const normalizedRoles = useMemo(
    () => (currentUserQuery.data?.roles ?? []).map((role) => role.replace(/^ROLE_/, "").toUpperCase()),
    [currentUserQuery.data?.roles],
  );
  const isSuperAdmin = normalizedRoles.includes("SUPER_ADMIN");
  const isOperator = normalizedRoles.includes("OPERATOR");

  const items = menusByLocale[locale];

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
          return { ...item, subItems: nextSubItems };
        })
        .filter(Boolean) as typeof items,
    [items, permissionSet, isSuperAdmin, isOperator],
  );

  const activeGroup = useMemo(
    () =>
      filteredItems.find(
        (item) => item.tab === activeTab || item.subItems.some((subItem) => subItem.tab === activeTab),
      ),
    [activeTab, filteredItems],
  );

  if (!activeGroup || activeGroup.subItems.length < 2) {
    return null;
  }

  return (
    <section className="min-w-0 md:hidden">
      <Tabs value={activeTab} onValueChange={(tab) => router.push(tabToPath(tab as TabKey))} className="min-w-0">
        <TabsList className="min-w-0 w-full justify-start gap-1 overflow-x-auto rounded-2xl border border-border/60 bg-card/70 p-1.5">
          {activeGroup.subItems.map((subItem) => {
            const SubIcon = subItem.icon;
            return (
              <TabsTrigger key={subItem.id} value={subItem.tab} className="shrink-0 justify-center rounded-xl px-3 py-1.5">
                {SubIcon ? <SubIcon className="h-3.5 w-3.5" /> : null}
                <span>{subItem.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </section>
  );
}
