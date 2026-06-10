import type { UserResponse } from "@/lib/types";

export type AppPermission =
  | "users:hard_delete"
  | "users:read_all"
  | "users:read_children"
  | "users:create"
  | "users:edit"
  | "users:toggle_active"
  | "users:revoke_sessions"
  | "users:delete"
  | "users:reset_password"
  | "users:assign_parent"
  | "sessions:read_own"
  | "sessions:revoke_own"
  | "sessions:revoke_others"
  | "roles:read"
  | "roles:manage_permissions"
  | "permissions:read"
  | "sessions:read_all"
  | "sessions:read_children"
  | "sessions:revoke"
  | "audit_logs:read"
  | "email_templates:read"
  | "email_templates:create"
  | "email_templates:edit"
  | "email_templates:delete"
  | "email_templates:test"
  | "notifications:read"
  | "notifications:edit"
  | "notifications:delete"
  | "business_configuration:access"
  | "establishments:create"
  | "establishments:read"
  | "establishments:list"
  | "establishments:update"
  | "establishments:activate"
  | "establishments:deactivate"
  | "entry_diplomas:list"
  | "entry_diplomas:read"
  | "entry_diplomas:create"
  | "entry_diplomas:update"
  | "entry_diplomas:delete"
  | "entry_diplomas:hard_delete"
  | "entry_diplomas:activate"
  | "entry_diplomas:deactivate"
  | "entry_diplomas:export"
  | "entry_diplomas:import"
  | "academic_levels:list"
  | "academic_levels:read"
  | "academic_levels:create"
  | "academic_levels:update"
  | "academic_levels:delete"
  | "academic_levels:hard_delete"
  | "academic_levels:activate"
  | "academic_levels:deactivate"
  | "academic_levels:export"
  | "academic_levels:import"
  | "academic_levels:attach_entry_diploma"
  | "academic_levels:detach_entry_diploma"
  | "program_tracks:list"
  | "program_tracks:read"
  | "program_tracks:create"
  | "program_tracks:update"
  | "program_tracks:delete"
  | "program_tracks:hard_delete"
  | "program_tracks:activate"
  | "program_tracks:deactivate"
  | "program_tracks:export"
  | "program_tracks:import"
  | "program_track_levels:list"
  | "program_track_levels:read"
  | "program_track_levels:create"
  | "program_track_levels:update"
  | "program_track_levels:delete"
  | "program_track_levels:activate"
  | "program_track_levels:deactivate"
  | "acquisition_channels:list"
  | "acquisition_channels:read"
  | "acquisition_channels:create"
  | "acquisition_channels:update"
  | "acquisition_channels:delete"
  | "acquisition_channels:hard_delete"
  | "acquisition_channels:activate"
  | "acquisition_channels:deactivate"
  | "acquisition_channels:export"
  | "acquisition_channels:import"
  | "funnel_stages:list"
  | "funnel_stages:read"
  | "funnel_stages:create"
  | "funnel_stages:update"
  | "funnel_stages:delete"
  | "funnel_stages:hard_delete"
  | "funnel_stages:activate"
  | "funnel_stages:deactivate"
  | "funnel_stages:export"
  | "funnel_stages:import"
  | "funnel_stage_transitions:list"
  | "funnel_stage_transitions:read"
  | "funnel_stage_transitions:create"
  | "funnel_stage_transitions:update"
  | "funnel_stage_transitions:delete"
  | "funnel_stage_transitions:hard_delete"
  | "funnel_stage_transitions:activate"
  | "funnel_stage_transitions:deactivate"
  | "pipeline_view_preference:read"
  | "pipeline_view_preference:update";

const ROLE_FALLBACK_PERMISSIONS: Record<string, AppPermission[]> = {
  SUPER_ADMIN: [
    "users:read_all",
    "users:read_children",
    "users:create",
    "users:edit",
    "users:toggle_active",
    "users:revoke_sessions",
    "users:delete",
    "users:hard_delete",
    "users:reset_password",
    "users:assign_parent",
    "sessions:read_own",
    "sessions:revoke_own",
    "sessions:revoke_others",
    "roles:read",
    "roles:manage_permissions",
    "permissions:read",
    "sessions:read_all",
    "sessions:read_children",
    "sessions:revoke",
    "audit_logs:read",
    "email_templates:read",
    "email_templates:create",
    "email_templates:edit",
    "email_templates:delete",
    "email_templates:test",
    "notifications:read",
    "notifications:edit",
    "notifications:delete",
    "business_configuration:access",
    "establishments:create",
    "establishments:read",
    "establishments:list",
    "establishments:update",
    "establishments:activate",
    "establishments:deactivate",
    "entry_diplomas:list",
    "entry_diplomas:read",
    "entry_diplomas:create",
    "entry_diplomas:update",
    "entry_diplomas:delete",
    "entry_diplomas:hard_delete",
    "entry_diplomas:activate",
    "entry_diplomas:deactivate",
    "entry_diplomas:export",
    "entry_diplomas:import",
    "academic_levels:list",
    "academic_levels:read",
    "academic_levels:create",
    "academic_levels:update",
    "academic_levels:delete",
    "academic_levels:hard_delete",
    "academic_levels:activate",
    "academic_levels:deactivate",
    "academic_levels:export",
    "academic_levels:import",
    "academic_levels:attach_entry_diploma",
    "academic_levels:detach_entry_diploma",
    "program_tracks:list",
    "program_tracks:read",
    "program_tracks:create",
    "program_tracks:update",
    "program_tracks:delete",
    "program_tracks:hard_delete",
    "program_tracks:activate",
    "program_tracks:deactivate",
    "program_tracks:export",
    "program_tracks:import",
    "program_track_levels:list",
    "program_track_levels:read",
    "program_track_levels:create",
    "program_track_levels:update",
    "program_track_levels:delete",
    "program_track_levels:activate",
    "program_track_levels:deactivate",
    "acquisition_channels:list",
    "acquisition_channels:read",
    "acquisition_channels:create",
    "acquisition_channels:update",
    "acquisition_channels:delete",
    "acquisition_channels:hard_delete",
    "acquisition_channels:activate",
    "acquisition_channels:deactivate",
    "acquisition_channels:export",
    "acquisition_channels:import",
    "funnel_stages:list",
    "funnel_stages:read",
    "funnel_stages:create",
    "funnel_stages:update",
    "funnel_stages:delete",
    "funnel_stages:hard_delete",
    "funnel_stages:activate",
    "funnel_stages:deactivate",
    "funnel_stages:export",
    "funnel_stages:import",
    "funnel_stage_transitions:list",
    "funnel_stage_transitions:read",
    "funnel_stage_transitions:create",
    "funnel_stage_transitions:update",
    "funnel_stage_transitions:delete",
    "funnel_stage_transitions:hard_delete",
    "funnel_stage_transitions:activate",
    "funnel_stage_transitions:deactivate",
    "pipeline_view_preference:read",
    "pipeline_view_preference:update",
  ],
  ADMIN: [
    "users:read_children",
    "users:create",
    "users:edit",
    "users:toggle_active",
    "users:revoke_sessions",
    "users:delete",
    "users:reset_password",
    "sessions:read_own",
    "sessions:revoke_own",
    "sessions:revoke_others",
    "roles:read",
    "roles:manage_permissions",
    "permissions:read",
    "sessions:read_children",
    "sessions:revoke",
    "audit_logs:read",
    "email_templates:read",
    "email_templates:create",
    "email_templates:edit",
    "email_templates:delete",
    "email_templates:test",
    "notifications:read",
    "notifications:edit",
    "notifications:delete",
    "business_configuration:access",
    "establishments:create",
    "establishments:read",
    "establishments:list",
    "establishments:update",
    "establishments:activate",
    "establishments:deactivate",
    "entry_diplomas:list",
    "entry_diplomas:read",
    "entry_diplomas:create",
    "entry_diplomas:update",
    "entry_diplomas:delete",
    "entry_diplomas:hard_delete",
    "entry_diplomas:activate",
    "entry_diplomas:deactivate",
    "entry_diplomas:export",
    "entry_diplomas:import",
    "academic_levels:list",
    "academic_levels:read",
    "academic_levels:create",
    "academic_levels:update",
    "academic_levels:delete",
    "academic_levels:hard_delete",
    "academic_levels:activate",
    "academic_levels:deactivate",
    "academic_levels:export",
    "academic_levels:import",
    "academic_levels:attach_entry_diploma",
    "academic_levels:detach_entry_diploma",
    "program_tracks:list",
    "program_tracks:read",
    "program_tracks:create",
    "program_tracks:update",
    "program_tracks:delete",
    "program_tracks:hard_delete",
    "program_tracks:activate",
    "program_tracks:deactivate",
    "program_tracks:export",
    "program_tracks:import",
    "program_track_levels:list",
    "program_track_levels:read",
    "program_track_levels:create",
    "program_track_levels:update",
    "program_track_levels:delete",
    "program_track_levels:activate",
    "program_track_levels:deactivate",
    "acquisition_channels:list",
    "acquisition_channels:read",
    "acquisition_channels:create",
    "acquisition_channels:update",
    "acquisition_channels:delete",
    "acquisition_channels:hard_delete",
    "acquisition_channels:activate",
    "acquisition_channels:deactivate",
    "acquisition_channels:export",
    "acquisition_channels:import",
    "funnel_stages:list",
    "funnel_stages:read",
    "funnel_stages:create",
    "funnel_stages:update",
    "funnel_stages:delete",
    "funnel_stages:hard_delete",
    "funnel_stages:activate",
    "funnel_stages:deactivate",
    "funnel_stages:export",
    "funnel_stages:import",
    "funnel_stage_transitions:list",
    "funnel_stage_transitions:read",
    "funnel_stage_transitions:create",
    "funnel_stage_transitions:update",
    "funnel_stage_transitions:delete",
    "funnel_stage_transitions:hard_delete",
    "funnel_stage_transitions:activate",
    "funnel_stage_transitions:deactivate",
    "pipeline_view_preference:read",
    "pipeline_view_preference:update",
  ],
  OPERATOR: [
    "sessions:read_own",
    "sessions:revoke_own",
    "sessions:revoke_others",
    "notifications:read",
    "notifications:edit",
    "email_templates:read",
  ],
};

export type TabKey =
  | "dashboard"
  | "users"
  | "sessions"
  | "security-roles"
  | "security-permissions"
  | "mail-template"
  | "settings-profile"
  | "settings-notifications"
  | "settings-audit"
  | "settings-configuration"
  | "config-establishments"
  | "config-academic-levels"
  | "config-entry-diplomas"
  | "config-program-tracks"
  | "config-program-track-levels"
  | "config-acquisition-channels"
  | "config-funnel-stages"
  | "config-funnel-stage-transitions";

const TAB_PERMISSIONS: Partial<Record<TabKey, AppPermission[]>> = {
  users: ["users:read_all", "users:read_children"],
  sessions: ["sessions:read_all", "sessions:read_children"],
  "security-roles": ["roles:read"],
  "security-permissions": ["permissions:read"],
  "mail-template": ["email_templates:read"],
  "settings-notifications": ["notifications:read"],
  "settings-audit": ["audit_logs:read"],
  "settings-configuration": [
    "business_configuration:access",
    "establishments:list",
    "entry_diplomas:list",
    "academic_levels:list",
    "program_tracks:list",
    "program_track_levels:list",
    "acquisition_channels:list",
    "funnel_stages:list",
    "funnel_stage_transitions:list",
    "pipeline_view_preference:read",
  ],
  "config-establishments": ["establishments:list"],
  "config-academic-levels": ["academic_levels:list"],
  "config-entry-diplomas": ["entry_diplomas:list"],
  "config-program-tracks": ["program_tracks:list"],
  "config-program-track-levels": ["program_track_levels:list"],
  "config-acquisition-channels": ["acquisition_channels:list"],
  "config-funnel-stages": ["funnel_stages:list"],
  "config-funnel-stage-transitions": ["funnel_stage_transitions:list"],
};

export function buildPermissionSet(user: Pick<UserResponse, "roles" | "permissions"> | null): Set<string> {
  if (!user) {
    return new Set();
  }

  const explicit = (user.permissions ?? []).map((permission) => permission.trim()).filter(Boolean);
  if (explicit.length > 0) {
    return new Set(explicit);
  }

  const fallback = new Set<string>();
  for (const role of user.roles ?? []) {
    const fromRole = ROLE_FALLBACK_PERMISSIONS[role] ?? [];
    for (const permission of fromRole) {
      fallback.add(permission);
    }
  }

  return fallback;
}

export function hasPermission(permissionSet: Set<string>, permission: AppPermission): boolean {
  return permissionSet.has(permission);
}

export function hasAnyPermission(permissionSet: Set<string>, permissions: AppPermission[]): boolean {
  return permissions.some((permission) => permissionSet.has(permission));
}

export function canAccessTab(permissionSet: Set<string>, tab: TabKey): boolean {
  const required = TAB_PERMISSIONS[tab];
  if (!required || required.length === 0) {
    return true;
  }
  return hasAnyPermission(permissionSet, required);
}

export function firstAccessibleTab(permissionSet: Set<string>, preferredOrder: TabKey[]): TabKey {
  for (const tab of preferredOrder) {
    if (canAccessTab(permissionSet, tab)) {
      return tab;
    }
  }
  return "dashboard";
}
