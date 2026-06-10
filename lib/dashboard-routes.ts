import type { TabKey } from "@/lib/permissions";

export const TAB_TO_PATH: Record<TabKey, string> = {
  dashboard: "/dashboard",
  users: "/dashboard/users",
  sessions: "/dashboard/sessions",
  "security-roles": "/dashboard/security/roles",
  "security-permissions": "/dashboard/security/permissions",
  "mail-template": "/dashboard/mail-templates",
  "settings-profile": "/dashboard/settings/profile",
  "settings-notifications": "/dashboard/settings/notifications",
  "settings-audit": "/dashboard/settings/audit",
  "settings-configuration": "/dashboard/settings/configuration",
  "config-establishments": "/dashboard/establishments",
  "config-academic-levels": "/dashboard/academic-levels",
  "config-entry-diplomas": "/dashboard/entry-diplomas",
  "config-program-tracks": "/dashboard/program-tracks",
  "config-program-track-levels": "/dashboard/program-track-levels",
  "config-acquisition-channels": "/dashboard/acquisition-channels",
  "config-funnel-stages": "/dashboard/funnel-stages",
  "config-funnel-stage-transitions": "/dashboard/funnel-stage-transitions",
};

const SLUG_TO_TAB: Record<string, TabKey> = {
  users: "users",
  sessions: "sessions",
  "security/roles": "security-roles",
  "security/permissions": "security-permissions",
  "mail-templates": "mail-template",
  "settings/profile": "settings-profile",
  "settings/notifications": "settings-notifications",
  "settings/audit": "settings-audit",
  "settings/configuration": "settings-configuration",
  establishments: "config-establishments",
  "academic-levels": "config-academic-levels",
  "entry-diplomas": "config-entry-diplomas",
  "program-tracks": "config-program-tracks",
  "program-track-levels": "config-program-track-levels",
  "acquisition-channels": "config-acquisition-channels",
  "funnel-stages": "config-funnel-stages",
  "funnel-stage-transitions": "config-funnel-stage-transitions",
};

export function slugToTab(slug: string[]): TabKey | null {
  return SLUG_TO_TAB[slug.join("/")] ?? null;
}

export function tabToPath(tab: TabKey): string {
  return TAB_TO_PATH[tab] ?? "/dashboard";
}
