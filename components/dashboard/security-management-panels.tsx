"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  Filter,
  Lock,
  Pencil,
  Plus,
  RefreshCcw,
  ShieldPlus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AppTooltip } from "@/components/ui/tooltip";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { getGradientButtonClass } from "@/lib/button-gradients";
import type { Locale } from "@/lib/i18n";
import type { UserResponse } from "@/lib/types";

type SecurityRole = {
  id: string;
  name: string;
  description: string;
  scope: "PLATFORM" | "BUSINESS";
  status: "ACTIVE" | "ARCHIVED";
  usersCount: number;
  permissions: string[];
  updatedAt: string;
};

type SecurityPermission = {
  id: string;
  name: string;
  module: "users" | "roles" | "permissions" | "sessions" | "audit_logs" | "email_templates";
  description: string;
  minimumRole: "SUPER_ADMIN" | "ADMIN" | "OPERATOR";
};

type SecurityPanelProps = {
  locale: Locale;
  onLog: (entry: string) => void;
  accessToken: string;
};

const ALL_PERMISSIONS: SecurityPermission[] = [
  { id: "users-read", name: "users:read", module: "users", description: "Consulter un utilisateur ou la liste", minimumRole: "OPERATOR" },
  { id: "users-create", name: "users:create", module: "users", description: "Creer un utilisateur", minimumRole: "ADMIN" },
  { id: "users-edit", name: "users:edit", module: "users", description: "Modifier un utilisateur", minimumRole: "ADMIN" },
  { id: "users-delete", name: "users:delete", module: "users", description: "Supprimer definitivement un utilisateur", minimumRole: "SUPER_ADMIN" },
  { id: "users-toggle-active", name: "users:toggle_active", module: "users", description: "Activer ou suspendre un utilisateur", minimumRole: "ADMIN" },
  { id: "users-reset-password", name: "users:reset_password", module: "users", description: "Reinitialiser le mot de passe", minimumRole: "ADMIN" },
  { id: "users-revoke-sessions", name: "users:revoke_sessions", module: "users", description: "Revoquer toutes les sessions d'un utilisateur", minimumRole: "ADMIN" },
  { id: "users-view-audit", name: "users:view_audit_log", module: "users", description: "Consulter les audit logs utilisateur", minimumRole: "ADMIN" },
  { id: "users-manage-roles", name: "users:manage_roles", module: "users", description: "Assigner des roles a un utilisateur", minimumRole: "ADMIN" },
  { id: "roles-read", name: "roles:read", module: "roles", description: "Consulter les roles", minimumRole: "ADMIN" },
  { id: "roles-create", name: "roles:create", module: "roles", description: "Creer un role", minimumRole: "ADMIN" },
  { id: "roles-edit", name: "roles:edit", module: "roles", description: "Modifier un role", minimumRole: "ADMIN" },
  { id: "roles-delete", name: "roles:delete", module: "roles", description: "Supprimer un role", minimumRole: "SUPER_ADMIN" },
  { id: "roles-manage-perms", name: "roles:manage_permissions", module: "roles", description: "Assigner des permissions a un role", minimumRole: "ADMIN" },
  { id: "permissions-read", name: "permissions:read", module: "permissions", description: "Consulter les permissions disponibles", minimumRole: "ADMIN" },
  { id: "sessions-read", name: "sessions:read", module: "sessions", description: "Consulter les sessions", minimumRole: "ADMIN" },
  { id: "sessions-revoke", name: "sessions:revoke", module: "sessions", description: "Revoquer une session", minimumRole: "ADMIN" },
  { id: "audit-read", name: "audit_logs:read", module: "audit_logs", description: "Consulter les journaux d'audit", minimumRole: "ADMIN" },
  { id: "email-read", name: "email_templates:read", module: "email_templates", description: "Consulter les templates email", minimumRole: "OPERATOR" },
  { id: "email-create", name: "email_templates:create", module: "email_templates", description: "Creer un template email", minimumRole: "ADMIN" },
  { id: "email-edit", name: "email_templates:edit", module: "email_templates", description: "Modifier un template email", minimumRole: "ADMIN" },
  { id: "email-delete", name: "email_templates:delete", module: "email_templates", description: "Supprimer un template email", minimumRole: "SUPER_ADMIN" },
  { id: "email-test", name: "email_templates:test", module: "email_templates", description: "Tester un template email", minimumRole: "ADMIN" },
];

const INITIAL_ROLES: SecurityRole[] = [
  {
    id: "role-super-admin",
    name: "SUPER_ADMIN",
    description: "Super administrateur avec acces total a la plateforme.",
    scope: "PLATFORM",
    status: "ACTIVE",
    usersCount: 1,
    permissions: ALL_PERMISSIONS.map((permission) => permission.name),
    updatedAt: "2026-01-10T10:20:00Z",
  },
  {
    id: "role-admin",
    name: "ADMIN",
    description: "Administrateur metier avec gestion des utilisateurs et des roles.",
    scope: "BUSINESS",
    status: "ACTIVE",
    usersCount: 6,
    permissions: ALL_PERMISSIONS
      .filter((permission) => permission.minimumRole !== "SUPER_ADMIN")
      .map((permission) => permission.name),
    updatedAt: "2026-01-09T14:20:00Z",
  },
  {
    id: "role-operator",
    name: "OPERATOR",
    description: "Operateur avec droits limites de consultation.",
    scope: "BUSINESS",
    status: "ACTIVE",
    usersCount: 18,
    permissions: ["users:read", "sessions:read", "sessions:revoke", "audit_logs:read", "email_templates:read"],
    updatedAt: "2026-01-08T08:10:00Z",
  },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

function formatDate(value: string, locale: Locale) {
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

function moduleBadgeLabel(moduleName: SecurityPermission["module"]) {
  return moduleName.toUpperCase();
}

export function SecurityRolesPanel({ locale, onLog, accessToken }: SecurityPanelProps) {
  const copy = {
    title: locale === "fr" ? "Roles de securite" : "Security roles",
    subtitle:
      locale === "fr"
        ? "Table des roles avec actions de gestion et affectation des permissions."
        : "Roles table with management actions and permission assignment.",
    createRole: locale === "fr" ? "Creer un role" : "Create role",
    add: locale === "fr" ? "Ajouter" : "Add",
    filters: locale === "fr" ? "Afficher/masquer les filtres" : "Show/hide filters",
    refresh: locale === "fr" ? "Actualiser" : "Refresh",
    noData: locale === "fr" ? "Aucun role trouve." : "No role found.",
    loading: locale === "fr" ? "Chargement..." : "Loading...",
  };

  const [roles, setRoles] = useState<SecurityRole[]>(INITIAL_ROLES);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(10);

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleDialogMode, setRoleDialogMode] = useState<"create" | "edit" | "view">("create");
  const [currentRoleId, setCurrentRoleId] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState({ name: "", description: "", scope: "BUSINESS" as SecurityRole["scope"] });

  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [permissionsRoleId, setPermissionsRoleId] = useState<string | null>(null);
  const [selectedAssigned, setSelectedAssigned] = useState<Set<string>>(new Set());
  const [selectedAvailable, setSelectedAvailable] = useState<Set<string>>(new Set());

  const statusFilterOptions = useMemo(
    () => [
      { value: "ALL", label: locale === "fr" ? "Tous les statuts" : "All statuses" },
      { value: "ACTIVE", label: "ACTIVE" },
      { value: "ARCHIVED", label: "ARCHIVED" },
    ],
    [locale],
  );

  const scopeOptions = useMemo(
    () => [
      { value: "PLATFORM", label: "PLATFORM" },
      { value: "BUSINESS", label: "BUSINESS" },
    ],
    [],
  );

  const usersQuery = useQuery({
    queryKey: ["security-roles-users", accessToken],
    enabled: Boolean(accessToken),
    queryFn: async () => {
      const allUsers: UserResponse[] = [];
      const pageSize = 200;
      let page = 0;

      while (true) {
        const response = await api.users.list(accessToken, page, pageSize, "ALL");
        allUsers.push(...response.content);

        if (page >= response.totalPages - 1) {
          break;
        }
        page += 1;
      }

      return allUsers;
    },
  });

  const usersCountByRole = useMemo(() => {
    const counts = new Map<string, number>();
    const users = usersQuery.data ?? [];

    users
      .filter((user) => user.status !== "DELETED")
      .forEach((user) => {
        user.roles.forEach((roleName) => {
          counts.set(roleName, (counts.get(roleName) ?? 0) + 1);
        });
      });

    return counts;
  }, [usersQuery.data]);

  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      const matchesStatus = statusFilter === "ALL" ? true : role.status === statusFilter;
      const normalized = `${role.name} ${role.description} ${role.scope}`.toLowerCase();
      const matchesSearch = normalized.includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [roles, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = useMemo(() => {
    const start = safePage * pageSize;
    return filteredRoles.slice(start, start + pageSize);
  }, [filteredRoles, safePage, pageSize]);

  const allSelectedOnPage = pageItems.length > 0 && pageItems.every((role) => selectedIds.has(role.id));

  const permissionsRole = useMemo(
    () => roles.find((role) => role.id === permissionsRoleId) ?? null,
    [roles, permissionsRoleId],
  );

  const assignedPermissions = useMemo(() => {
    if (!permissionsRole) {
      return [] as SecurityPermission[];
    }
    const assigned = new Set(permissionsRole.permissions);
    return ALL_PERMISSIONS.filter((permission) => assigned.has(permission.name));
  }, [permissionsRole]);

  const availablePermissions = useMemo(() => {
    if (!permissionsRole) {
      return [] as SecurityPermission[];
    }
    const assigned = new Set(permissionsRole.permissions);
    return ALL_PERMISSIONS.filter((permission) => !assigned.has(permission.name));
  }, [permissionsRole]);

  const assignedPermissionIds = useMemo(() => new Set(assignedPermissions.map((permission) => permission.id)), [assignedPermissions]);

  const rolePermissionsCount = (role: SecurityRole) =>
    role.permissions.filter((permissionName) =>
      ALL_PERMISSIONS.some((permission) => permission.name === permissionName),
    ).length;

  const openCreateDialog = () => {
    setRoleDialogMode("create");
    setCurrentRoleId(null);
    setRoleForm({ name: "", description: "", scope: "BUSINESS" });
    setRoleDialogOpen(true);
  };

  const openViewDialog = (role: SecurityRole) => {
    setRoleDialogMode("view");
    setCurrentRoleId(role.id);
    setRoleForm({ name: role.name, description: role.description, scope: role.scope });
    setRoleDialogOpen(true);
  };

  const openEditDialog = (role: SecurityRole) => {
    setRoleDialogMode("edit");
    setCurrentRoleId(role.id);
    setRoleForm({ name: role.name, description: role.description, scope: role.scope });
    setRoleDialogOpen(true);
  };

  const openPermissionsDialog = (role: SecurityRole) => {
    setPermissionsRoleId(role.id);
    setSelectedAssigned(new Set());
    setSelectedAvailable(new Set());
    setPermissionsDialogOpen(true);
  };

  const saveRole = () => {
    const name = roleForm.name.trim();
    const description = roleForm.description.trim();
    if (!name || !description) {
      return;
    }

    if (roleDialogMode === "create") {
      const newRole: SecurityRole = {
        id: `role-${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
        name,
        description,
        scope: roleForm.scope,
        status: "ACTIVE",
        usersCount: 0,
        permissions: [],
        updatedAt: new Date().toISOString(),
      };
      setRoles((current) => [newRole, ...current]);
      onLog(`CREATE ROLE OK: ${name}`);
    }

    if (roleDialogMode === "edit" && currentRoleId) {
      setRoles((current) =>
        current.map((role) =>
          role.id === currentRoleId
            ? { ...role, name, description, scope: roleForm.scope, updatedAt: new Date().toISOString() }
            : role,
        ),
      );
      onLog(`UPDATE ROLE OK: ${name}`);
    }

    setRoleDialogOpen(false);
  };

  const deleteRole = (roleId: string) => {
    setRoles((current) => current.filter((role) => role.id !== roleId));
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(roleId);
      return next;
    });
    onLog(`DELETE ROLE OK: ${roleId}`);
  };

  const toggleRoleStatus = (roleId: string) => {
    setRoles((current) =>
      current.map((role) => {
        if (role.id !== roleId) {
          return role;
        }

        const nextStatus: SecurityRole["status"] = role.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
        onLog(`UPDATE ROLE STATUS OK: ${role.name} -> ${nextStatus}`);

        return {
          ...role,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  };

  const addSelectedPermissions = () => {
    if (!permissionsRoleId || selectedAvailable.size === 0) {
      return;
    }

    const selectedPermissionNames = ALL_PERMISSIONS
      .filter((permission) => selectedAvailable.has(permission.id))
      .map((permission) => permission.name);

    setRoles((current) =>
      current.map((role) => {
        if (role.id !== permissionsRoleId) {
          return role;
        }

        const merged = new Set([...role.permissions, ...selectedPermissionNames]);
        return {
          ...role,
          permissions: Array.from(merged),
          updatedAt: new Date().toISOString(),
        };
      }),
    );
    setSelectedAvailable(new Set());
    onLog(`ASSIGN PERMISSIONS OK: ${permissionsRoleId}`);
  };

  const removeSelectedPermissions = () => {
    if (!permissionsRoleId || selectedAssigned.size === 0) {
      return;
    }

    const selectedPermissionNames = ALL_PERMISSIONS
      .filter((permission) => selectedAssigned.has(permission.id))
      .map((permission) => permission.name);

    setRoles((current) =>
      current.map((role) => {
        if (role.id !== permissionsRoleId) {
          return role;
        }

        const nextPermissions = role.permissions.filter((permission) => !selectedPermissionNames.includes(permission));
        return {
          ...role,
          permissions: nextPermissions,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
    setSelectedAssigned(new Set());
    onLog(`UNASSIGN PERMISSIONS OK: ${permissionsRoleId}`);
  };

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.subtitle}</CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 p-1.5">
            <AppTooltip content={copy.filters}>
              <Button
                variant="ghost"
                size="sm"
                className={`h-9 w-9 rounded-xl text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground ${showFilters ? "bg-background/80 text-foreground" : ""}`}
                onClick={() => setShowFilters((value) => !value)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </AppTooltip>

            <AppTooltip content={copy.refresh}>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
                onClick={() => onLog("REFRESH ROLES TABLE")}
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </AppTooltip>

            <Button className={getGradientButtonClass("primary")} onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              {copy.add}
            </Button>
          </div>
        </div>

        {showFilters ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(0);
              }}
              placeholder={locale === "fr" ? "Rechercher un role..." : "Search role..."}
            />
            <SearchableSelect
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as "ALL" | "ACTIVE" | "ARCHIVED");
                setPage(0);
              }}
              options={statusFilterOptions}
              placeholder={locale === "fr" ? "Filtrer par statut" : "Filter by status"}
              searchPlaceholder={locale === "fr" ? "Rechercher un statut..." : "Search status..."}
            />
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-xl border border-border/80 bg-background/70">
          <table className="w-full min-w-4xl text-left text-sm">
            <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelectedOnPage}
                    onChange={() => {
                      setSelectedIds((current) => {
                        const next = new Set(current);
                        if (allSelectedOnPage) {
                          pageItems.forEach((role) => next.delete(role.id));
                        } else {
                          pageItems.forEach((role) => next.add(role.id));
                        }
                        return next;
                      });
                    }}
                    aria-label={locale === "fr" ? "Selectionner tous les roles" : "Select all roles"}
                  />
                </th>
                <th className="px-3 py-3">{locale === "fr" ? "Role" : "Role"}</th>
                <th className="px-3 py-3">{locale === "fr" ? "Description" : "Description"}</th>
                <th className="px-3 py-3">Scope</th>
                <th className="px-3 py-3">{locale === "fr" ? "Statut" : "Status"}</th>
                <th className="px-3 py-3">{locale === "fr" ? "Permissions" : "Permissions"}</th>
                <th className="px-3 py-3">{locale === "fr" ? "Utilisateurs" : "Users"}</th>
                <th className="px-3 py-3">{locale === "fr" ? "Mise a jour" : "Updated"}</th>
                <th className="px-3 py-3">{locale === "fr" ? "Actions" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                    {copy.noData}
                  </td>
                </tr>
              ) : (
                pageItems.map((role) => (
                  <tr key={role.id} className="border-t border-border/60 align-top">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(role.id)}
                        onChange={() => {
                          setSelectedIds((current) => {
                            const next = new Set(current);
                            if (next.has(role.id)) {
                              next.delete(role.id);
                            } else {
                              next.add(role.id);
                            }
                            return next;
                          });
                        }}
                        aria-label={`select ${role.name}`}
                      />
                    </td>
                    <td className="px-3 py-3 font-medium">{role.name}</td>
                    <td className="px-3 py-3 text-muted-foreground">{role.description}</td>
                    <td className="px-3 py-3">
                      <Badge variant="outline">{role.scope}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={role.status === "ACTIVE" ? "success" : "outline"}>{role.status}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="secondary">{rolePermissionsCount(role)}</Badge>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {usersQuery.isLoading
                        ? "..."
                        : usersCountByRole.get(role.name) ?? 0}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{formatDate(role.updatedAt, locale)}</td>
                    <td className="px-3 py-3">
                      <DropdownMenu
                        triggerTooltip={locale === "fr" ? "Actions role" : "Role actions"}
                        items={[
                          {
                            label: locale === "fr" ? "Consulter" : "View",
                            icon: Eye,
                            onClick: () => openViewDialog(role),
                          },
                          {
                            label: locale === "fr" ? "Modifier" : "Edit",
                            icon: Pencil,
                            onClick: () => openEditDialog(role),
                          },
                          {
                            label: locale === "fr" ? "Affecter permissions" : "Assign permissions",
                            icon: ShieldPlus,
                            onClick: () => openPermissionsDialog(role),
                          },
                          {
                            label:
                              role.status === "ACTIVE"
                                ? (locale === "fr" ? "Archiver" : "Archive")
                                : (locale === "fr" ? "Activer" : "Activate"),
                            icon: role.status === "ACTIVE" ? Lock : ShieldPlus,
                            onClick: () => toggleRoleStatus(role.id),
                          },
                          {
                            label: locale === "fr" ? "Supprimer" : "Delete",
                            icon: Trash2,
                            variant: "destructive",
                            onClick: () => deleteRole(role.id),
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

        <div className="flex flex-col gap-4 border-t border-border/60 pt-4 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-muted-foreground">
            {selectedIds.size} / {filteredRoles.length} {locale === "fr" ? "selectionnes" : "selected"}
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="roles-rows-per-page" className="text-xs font-medium text-muted-foreground">
                {locale === "fr" ? "Lignes par page:" : "Rows per page:"}
              </label>
              <select
                id="roles-rows-per-page"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(0);
                }}
                className="rounded border border-border bg-background px-2 py-1 text-xs font-medium text-foreground"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <p className="text-xs font-medium text-muted-foreground">
              {locale === "fr" ? `Page ${safePage + 1} / ${totalPages}` : `Page ${safePage + 1} / ${totalPages}`}
            </p>

            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(0)} disabled={safePage <= 0} className="px-2">«</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(current - 1, 0))} disabled={safePage <= 0} className="px-2">‹</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(current + 1, totalPages - 1))} disabled={safePage >= totalPages - 1} className="px-2">›</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(totalPages - 1)} disabled={safePage >= totalPages - 1} className="px-2">»</Button>
            </div>
          </div>
        </div>
      </CardContent>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {roleDialogMode === "create"
                ? (locale === "fr" ? "Creer un role" : "Create role")
                : roleDialogMode === "edit"
                  ? (locale === "fr" ? "Modifier le role" : "Edit role")
                  : (locale === "fr" ? "Consulter le role" : "View role")}
            </DialogTitle>
            <DialogDescription>
              {locale === "fr"
                ? "Nom, description et scope du role."
                : "Role name, description and scope."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <label className="text-sm font-medium text-foreground">
              {locale === "fr" ? "Nom du role" : "Role name"}
            </label>
            <Input
              value={roleForm.name}
              onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))}
              placeholder={locale === "fr" ? "Nom du role" : "Role name"}
              disabled={roleDialogMode === "view"}
            />
            <label className="text-sm font-medium text-foreground">
              {locale === "fr" ? "Description" : "Description"}
            </label>
            <Input
              value={roleForm.description}
              onChange={(event) => setRoleForm((current) => ({ ...current, description: event.target.value }))}
              placeholder={locale === "fr" ? "Description" : "Description"}
              disabled={roleDialogMode === "view"}
            />
            <label className="text-sm font-medium text-foreground">
              {locale === "fr" ? "Scope" : "Scope"}
            </label>
            {roleDialogMode === "view" ? (
              <div className="h-10 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                {roleForm.scope}
              </div>
            ) : (
              <SearchableSelect
                value={roleForm.scope}
                onValueChange={(value) => setRoleForm((current) => ({ ...current, scope: value as SecurityRole["scope"] }))}
                options={scopeOptions}
                placeholder={locale === "fr" ? "Selectionner un scope" : "Select scope"}
                searchPlaceholder={locale === "fr" ? "Rechercher un scope..." : "Search scope..."}
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              {locale === "fr" ? "Fermer" : "Close"}
            </Button>
            {roleDialogMode !== "view" ? (
              <Button className={getGradientButtonClass("primary")} onClick={saveRole}>
                {locale === "fr" ? "Enregistrer" : "Save"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              <span className="inline-flex items-center gap-2">
                <ShieldPlus className="h-4 w-4" />
                {locale === "fr" ? "Affectation des permissions" : "Permission assignment"}
              </span>
            </DialogTitle>
            <DialogDescription>
              {permissionsRole
                ? (locale === "fr" ? `Role: ${permissionsRole.name}` : `Role: ${permissionsRole.name}`)
                : "-"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-background/60 p-3">
              <p className="mb-2 text-sm font-semibold">{locale === "fr" ? "Permissions deja affectees" : "Assigned permissions"}</p>
              <div className="max-h-72 space-y-2 overflow-auto pr-1">
                {assignedPermissions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{locale === "fr" ? "Aucune permission." : "No permissions."}</p>
                ) : (
                  assignedPermissions.map((permission) => (
                    <label key={permission.id} className="flex cursor-pointer items-start gap-2 rounded-md border border-border/60 px-2 py-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedAssigned.has(permission.id)}
                        onChange={() => {
                          setSelectedAssigned((current) => {
                            const next = new Set(current);
                            if (next.has(permission.id)) {
                              next.delete(permission.id);
                            } else {
                              next.add(permission.id);
                            }
                            return next;
                          });
                        }}
                      />
                      <span>
                        <span className="block font-medium">{permission.name}</span>
                        <span className="text-xs text-muted-foreground">{permission.description}</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-background/60 p-3">
              <p className="mb-2 text-sm font-semibold">{locale === "fr" ? "Permissions disponibles" : "Available permissions"}</p>
              <div className="max-h-72 space-y-2 overflow-auto pr-1">
                {availablePermissions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{locale === "fr" ? "Aucune permission." : "No permissions."}</p>
                ) : (
                  availablePermissions.map((permission) => (
                    <label key={permission.id} className="flex cursor-pointer items-start gap-2 rounded-md border border-border/60 px-2 py-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedAvailable.has(permission.id)}
                        onChange={() => {
                          setSelectedAvailable((current) => {
                            const next = new Set(current);
                            if (next.has(permission.id)) {
                              next.delete(permission.id);
                            } else {
                              next.add(permission.id);
                            }
                            return next;
                          });
                        }}
                      />
                      <span>
                        <span className="block font-medium">{permission.name}</span>
                        <span className="text-xs text-muted-foreground">{permission.description}</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={removeSelectedPermissions} disabled={selectedAssigned.size === 0}>
              {locale === "fr" ? "Retirer selection" : "Remove selected"}
            </Button>
            <Button
              className={getGradientButtonClass("primary")}
              onClick={addSelectedPermissions}
              disabled={selectedAvailable.size === 0 || assignedPermissionIds.size === ALL_PERMISSIONS.length}
            >
              {locale === "fr" ? "Ajouter selection" : "Add selected"}
            </Button>
            <Button variant="outline" onClick={() => setPermissionsDialogOpen(false)}>
              {locale === "fr" ? "Terminer" : "Done"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function SecurityPermissionsPanel({ locale }: Omit<SecurityPanelProps, "onLog" | "accessToken">) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState<"ALL" | SecurityPermission["module"]>("ALL");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(10);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewPermission, setViewPermission] = useState<SecurityPermission | null>(null);

  const moduleOptions = useMemo(
    () => [
      {
        value: "ALL",
        label: locale === "fr" ? "Tous les modules" : "All modules",
      },
      { value: "users", label: "USERS" },
      { value: "roles", label: "ROLES" },
      { value: "permissions", label: "PERMISSIONS" },
      { value: "sessions", label: "SESSIONS" },
      { value: "audit_logs", label: "AUDIT_LOGS" },
      { value: "email_templates", label: "EMAIL_TEMPLATES" },
    ],
    [locale],
  );

  const filteredPermissions = useMemo(() => {
    return ALL_PERMISSIONS.filter((permission) => {
      const matchesModule = moduleFilter === "ALL" ? true : permission.module === moduleFilter;
      const normalized = `${permission.name} ${permission.description} ${permission.module}`.toLowerCase();
      const matchesSearch = normalized.includes(searchTerm.toLowerCase());
      return matchesModule && matchesSearch;
    });
  }, [moduleFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredPermissions.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = useMemo(() => {
    const start = safePage * pageSize;
    return filteredPermissions.slice(start, start + pageSize);
  }, [filteredPermissions, safePage, pageSize]);

  const allSelectedOnPage = pageItems.length > 0 && pageItems.every((permission) => selectedIds.has(permission.id));

  const openViewPermission = (permission: SecurityPermission) => {
    setViewPermission(permission);
    setViewDialogOpen(true);
  };

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>{locale === "fr" ? "Permissions de securite" : "Security permissions"}</CardTitle>
            <CardDescription>
              {locale === "fr"
                ? "Table en lecture seule des permissions disponibles."
                : "Read-only table of available permissions."}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 p-1.5">
            <AppTooltip content={locale === "fr" ? "Afficher/masquer les filtres" : "Show/hide filters"}>
              <Button
                variant="ghost"
                size="sm"
                className={`h-9 w-9 rounded-xl text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground ${showFilters ? "bg-background/80 text-foreground" : ""}`}
                onClick={() => setShowFilters((value) => !value)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </AppTooltip>
            <AppTooltip content={locale === "fr" ? "Actualiser" : "Refresh"}>
              <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground">
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </AppTooltip>
          </div>
        </div>

        {showFilters ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(0);
              }}
              placeholder={locale === "fr" ? "Rechercher une permission..." : "Search permission..."}
            />
            <SearchableSelect
              value={moduleFilter}
              onValueChange={(value) => {
                setModuleFilter(value as "ALL" | SecurityPermission["module"]);
                setPage(0);
              }}
              options={moduleOptions}
              placeholder={locale === "fr" ? "Filtrer par module" : "Filter by module"}
              searchPlaceholder={locale === "fr" ? "Rechercher un module..." : "Search module..."}
            />
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-xl border border-border/80 bg-background/70">
          <table className="w-full min-w-4xl text-left text-sm">
            <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelectedOnPage}
                    onChange={() => {
                      setSelectedIds((current) => {
                        const next = new Set(current);
                        if (allSelectedOnPage) {
                          pageItems.forEach((permission) => next.delete(permission.id));
                        } else {
                          pageItems.forEach((permission) => next.add(permission.id));
                        }
                        return next;
                      });
                    }}
                    aria-label={locale === "fr" ? "Selectionner toutes les permissions" : "Select all permissions"}
                  />
                </th>
                <th className="px-3 py-3">Permission</th>
                <th className="px-3 py-3">{locale === "fr" ? "Module" : "Module"}</th>
                <th className="px-3 py-3">{locale === "fr" ? "Role minimum" : "Minimum role"}</th>
                <th className="px-3 py-3">{locale === "fr" ? "Description" : "Description"}</th>
                <th className="px-3 py-3">{locale === "fr" ? "Action" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    {locale === "fr" ? "Aucune permission trouvee." : "No permission found."}
                  </td>
                </tr>
              ) : (
                pageItems.map((permission) => (
                  <tr key={permission.id} className="border-t border-border/60 align-top">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(permission.id)}
                        onChange={() => {
                          setSelectedIds((current) => {
                            const next = new Set(current);
                            if (next.has(permission.id)) {
                              next.delete(permission.id);
                            } else {
                              next.add(permission.id);
                            }
                            return next;
                          });
                        }}
                        aria-label={`select ${permission.name}`}
                      />
                    </td>
                    <td className="px-3 py-3 font-medium">{permission.name}</td>
                    <td className="px-3 py-3">
                      <Badge variant="outline">{moduleBadgeLabel(permission.module)}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={permission.minimumRole === "SUPER_ADMIN" ? "danger" : permission.minimumRole === "ADMIN" ? "warning" : "success"}>
                        {permission.minimumRole}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{permission.description}</td>
                    <td className="px-3 py-3">
                      <DropdownMenu
                        triggerTooltip={locale === "fr" ? "Actions permission" : "Permission actions"}
                        items={[
                          {
                            label: locale === "fr" ? "Consulter" : "View",
                            icon: Eye,
                            onClick: () => openViewPermission(permission),
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

        <div className="flex flex-col gap-4 border-t border-border/60 pt-4 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-muted-foreground">
            {selectedIds.size} / {filteredPermissions.length} {locale === "fr" ? "selectionnees" : "selected"}
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="permissions-rows-per-page" className="text-xs font-medium text-muted-foreground">
                {locale === "fr" ? "Lignes par page:" : "Rows per page:"}
              </label>
              <select
                id="permissions-rows-per-page"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(0);
                }}
                className="rounded border border-border bg-background px-2 py-1 text-xs font-medium text-foreground"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <p className="text-xs font-medium text-muted-foreground">
              {locale === "fr" ? `Page ${safePage + 1} / ${totalPages}` : `Page ${safePage + 1} / ${totalPages}`}
            </p>

            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(0)} disabled={safePage <= 0} className="px-2">«</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(current - 1, 0))} disabled={safePage <= 0} className="px-2">‹</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(current + 1, totalPages - 1))} disabled={safePage >= totalPages - 1} className="px-2">›</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(totalPages - 1)} disabled={safePage >= totalPages - 1} className="px-2">»</Button>
            </div>
          </div>
        </div>
      </CardContent>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <span className="inline-flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {viewPermission?.name}
              </span>
            </DialogTitle>
            <DialogDescription>{locale === "fr" ? "Detail de la permission" : "Permission details"}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 text-sm">
            <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
              <span className="font-medium">{locale === "fr" ? "Module" : "Module"}: </span>
              {viewPermission ? moduleBadgeLabel(viewPermission.module) : "-"}
            </div>
            <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
              <span className="font-medium">{locale === "fr" ? "Role minimum" : "Minimum role"}: </span>
              {viewPermission?.minimumRole}
            </div>
            <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
              <span className="font-medium">{locale === "fr" ? "Description" : "Description"}: </span>
              {viewPermission?.description}
            </div>
          </div>

          <DialogFooter>
            <Button className={getGradientButtonClass("primary")} onClick={() => setViewDialogOpen(false)}>
              {locale === "fr" ? "Fermer" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
