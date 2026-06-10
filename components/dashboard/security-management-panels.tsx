"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Eye, Filter, Lock, Pencil, Plus, RefreshCcw, ShieldPlus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AppTooltip } from "@/components/ui/tooltip";
import { getGradientButtonClass } from "@/lib/button-gradients";
import { api } from "@/lib/api";
import { buildPermissionSet, hasPermission } from "@/lib/permissions";
import type { Locale } from "@/lib/i18n";
import type { RbacPermissionResponse, RbacRoleResponse } from "@/lib/types";
import { useDashboardStore } from "@/store/dashboard-store";

type SecurityPanelProps = {
  locale: Locale;
  onLog: (entry: string) => void;
  accessToken: string;
};

type RoleDialogMode = "create" | "edit" | "view";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

function moduleBadgeLabel(moduleName: string) {
  return moduleName.toUpperCase();
}

function dedupePermissions(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export function SecurityRolesPanel({ locale, onLog, accessToken }: SecurityPanelProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(10);

  const [localRoles, setLocalRoles] = useState<RbacRoleResponse[] | null>(null);

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleDialogMode, setRoleDialogMode] = useState<RoleDialogMode>("view");
  const [currentRoleId, setCurrentRoleId] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState({ name: "", description: "", level: 2 });

  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [permissionsRoleId, setPermissionsRoleId] = useState<string | null>(null);
  const [selectedAssigned, setSelectedAssigned] = useState<Set<string>>(new Set());
  const [selectedAvailable, setSelectedAvailable] = useState<Set<string>>(new Set());

  const currentUserQuery = useQuery({
    queryKey: ["security-rbac-current-user", accessToken],
    enabled: Boolean(accessToken),
    queryFn: () => api.users.getMe(accessToken),
  });

  const rolesQuery = useQuery({
    queryKey: ["security-rbac-roles", accessToken],
    enabled: Boolean(accessToken),
    queryFn: () => api.rbac.roles.list(accessToken),
  });

  const permissionsQuery = useQuery({
    queryKey: ["security-rbac-permissions-for-roles", accessToken],
    enabled: Boolean(accessToken),
    queryFn: () => api.rbac.permissions.list(accessToken),
  });

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);
  const canManageRolePermissions = hasPermission(permissionSet, "roles:manage_permissions");

  const roles = localRoles ?? (rolesQuery.data ?? []);

  const filteredRoles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      return roles;
    }

    return roles.filter((role) => {
      const normalized = `${role.name} ${role.description ?? ""} ${role.level}`.toLowerCase();
      return normalized.includes(q);
    });
  }, [roles, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = useMemo(() => {
    const start = safePage * pageSize;
    return filteredRoles.slice(start, start + pageSize);
  }, [filteredRoles, safePage, pageSize]);

  const permissionsRole = useMemo(
    () => roles.find((role) => role.id === permissionsRoleId) ?? null,
    [roles, permissionsRoleId],
  );

  const allPermissions = permissionsQuery.data ?? [];

  const assignedPermissions = useMemo(() => {
    if (!permissionsRole) {
      return [] as RbacPermissionResponse[];
    }

    const assigned = new Set(permissionsRole.permissions);
    return allPermissions.filter((permission) => assigned.has(permission.name));
  }, [permissionsRole, allPermissions]);

  const availablePermissions = useMemo(() => {
    if (!permissionsRole) {
      return [] as RbacPermissionResponse[];
    }

    const assigned = new Set(permissionsRole.permissions);
    return allPermissions.filter((permission) => !assigned.has(permission.name));
  }, [permissionsRole, allPermissions]);

  const refreshRoles = async () => {
    const response = await rolesQuery.refetch();
    if (response.data) {
      setLocalRoles(response.data);
    }
  };

  const updateRolePermissionsMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      api.rbac.roles.updatePermissions(accessToken, roleId, permissionIds),
    onSuccess: async (updatedRole) => {
      if (updatedRole) {
        setLocalRoles((current) => current?.map((role) => (role.id === updatedRole.id ? updatedRole : role)) ?? [updatedRole]);
      }

      setSelectedAssigned(new Set());
      setSelectedAvailable(new Set());
      await refreshRoles();
      onLog(`UPDATE PERMISSIONS OK: ${permissionsRoleId ?? "unknown"}`);
    },
    onError: (error) => {
      onLog(`UPDATE PERMISSIONS ERROR: ${(error as Error).message}`);
    },
  });

  const openCreateDialog = () => {
    setRoleDialogMode("create");
    setCurrentRoleId(null);
    setRoleForm({ name: "", description: "", level: 2 });
    setRoleDialogOpen(true);
  };

  const openViewDialog = (role: RbacRoleResponse) => {
    setRoleDialogMode("view");
    setCurrentRoleId(role.id);
    setRoleForm({ name: role.name, description: role.description ?? "", level: role.level });
    setRoleDialogOpen(true);
  };

  const openEditDialog = (role: RbacRoleResponse) => {
    setRoleDialogMode("edit");
    setCurrentRoleId(role.id);
    setRoleForm({ name: role.name, description: role.description ?? "", level: role.level });
    setRoleDialogOpen(true);
  };

  const saveRole = () => {
    const name = roleForm.name.trim().toUpperCase();
    const description = roleForm.description.trim();
    if (!name) {
      return;
    }

    if (roleDialogMode === "create") {
      const newRole: RbacRoleResponse = {
        id: `local-${Date.now()}`,
        name,
        description,
        level: roleForm.level,
        isSystem: false,
        usersCount: 0,
        permissions: [],
      };
      setLocalRoles([newRole, ...roles]);
      onLog(`CREATE ROLE (UI): ${name}`);
    }

    if (roleDialogMode === "edit" && currentRoleId) {
      setLocalRoles(
        roles.map((role) =>
          role.id === currentRoleId
            ? { ...role, name, description, level: roleForm.level }
            : role,
        ),
      );
      onLog(`EDIT ROLE (UI): ${name}`);
    }

    setRoleDialogOpen(false);
  };

  const deleteRole = (roleId: string) => {
    const role = roles.find((item) => item.id === roleId);
    setLocalRoles(roles.filter((item) => item.id !== roleId));
    onLog(`DELETE ROLE (UI): ${role?.name ?? roleId}`);
  };

  const openPermissionsDialog = (role: RbacRoleResponse) => {
    setPermissionsRoleId(role.id);
    setSelectedAssigned(new Set());
    setSelectedAvailable(new Set());
    setPermissionsDialogOpen(true);
  };

  const addSelectedPermissions = () => {
    if (!canManageRolePermissions || !permissionsRoleId || selectedAvailable.size === 0 || !permissionsRole) {
      return;
    }

    const currentPermissionIds = allPermissions
      .filter((permission) => permissionsRole.permissions.includes(permission.name))
      .map((permission) => permission.id);
    const selectedPermissionIds = availablePermissions
      .filter((permission) => selectedAvailable.has(permission.id))
      .map((permission) => permission.id);

    void updateRolePermissionsMutation.mutateAsync({
      roleId: permissionsRoleId,
      permissionIds: dedupePermissions([...currentPermissionIds, ...selectedPermissionIds]),
    });
  };

  const removeSelectedPermissions = () => {
    if (!canManageRolePermissions || !permissionsRoleId || selectedAssigned.size === 0 || !permissionsRole) {
      return;
    }

    const currentPermissionIds = allPermissions
      .filter((permission) => permissionsRole.permissions.includes(permission.name))
      .map((permission) => permission.id);
    const nextPermissionIds = currentPermissionIds.filter((permissionId) => !selectedAssigned.has(permissionId));

    void updateRolePermissionsMutation.mutateAsync({
      roleId: permissionsRoleId,
      permissionIds: dedupePermissions(nextPermissionIds),
    });
  };

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>{locale === "fr" ? "Roles de securite" : "Security roles"}</CardTitle>
            <CardDescription>
              {locale === "fr"
                ? "Vue base de donnees des roles et actions de gestion (view/edit/delete/assign)."
                : "Database view of roles with management actions (view/edit/delete/assign)."}
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
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
                onClick={() => {
                  refreshRoles();
                  onLog("REFRESH RBAC ROLES");
                }}
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </AppTooltip>

            <Button className={getGradientButtonClass("primary")} onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              {locale === "fr" ? "Creer" : "Create"}
            </Button>
          </div>
        </div>

        {showFilters ? (
          <div className="grid gap-3 md:grid-cols-1">
            <Input
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(0);
              }}
              placeholder={locale === "fr" ? "Rechercher un role..." : "Search role..."}
            />
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-xl border border-border/80 bg-background/70">
          <table className="w-full min-w-4xl text-left text-sm">
            <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-3">{locale === "fr" ? "Role" : "Role"}</th>
                <th className="px-3 py-3">{locale === "fr" ? "Description" : "Description"}</th>
                <th className="px-3 py-3">{locale === "fr" ? "Niveau" : "Level"}</th>
                <th className="px-3 py-3">{locale === "fr" ? "Systeme" : "System"}</th>
                <th className="px-3 py-3">{locale === "fr" ? "Permissions" : "Permissions"}</th>
                <th className="px-3 py-3">{locale === "fr" ? "Utilisateurs" : "Users"}</th>
                <th className="px-3 py-3">{locale === "fr" ? "Actions" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {rolesQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">{locale === "fr" ? "Chargement..." : "Loading..."}</td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">{locale === "fr" ? "Aucun role trouve." : "No role found."}</td>
                </tr>
              ) : (
                pageItems.map((role) => (
                  <tr key={role.id} className="border-t border-border/60 align-top">
                    <td className="px-3 py-3 font-medium">{role.name}</td>
                    <td className="px-3 py-3 text-muted-foreground">{role.description ?? "-"}</td>
                    <td className="px-3 py-3"><Badge variant="outline">L{role.level}</Badge></td>
                    <td className="px-3 py-3"><Badge variant={role.isSystem ? "secondary" : "outline"}>{role.isSystem ? "YES" : "NO"}</Badge></td>
                    <td className="px-3 py-3"><Badge variant="secondary">{role.permissions.length}</Badge></td>
                    <td className="px-3 py-3 text-muted-foreground">{role.usersCount}</td>
                    <td className="px-3 py-3">
                      <DropdownMenu
                        triggerTooltip={locale === "fr" ? "Actions role" : "Role actions"}
                        items={[
                          { label: "View", icon: Eye, onClick: () => openViewDialog(role) },
                          { label: "Edit", icon: Pencil, onClick: () => openEditDialog(role) },
                          { label: "Assign permissions", icon: ShieldPlus, onClick: () => openPermissionsDialog(role), disabled: !canManageRolePermissions },
                          { label: "Delete", icon: Trash2, variant: "destructive", onClick: () => deleteRole(role.id) },
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
          <p className="text-xs text-muted-foreground">{filteredRoles.length} {locale === "fr" ? "role(s)" : "role(s)"}</p>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="roles-rows-per-page" className="text-xs font-medium text-muted-foreground">{locale === "fr" ? "Lignes par page:" : "Rows per page:"}</label>
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

            <p className="text-xs font-medium text-muted-foreground">{locale === "fr" ? `Page ${safePage + 1} / ${totalPages}` : `Page ${safePage + 1} / ${totalPages}`}</p>

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
                ? "Create role"
                : roleDialogMode === "edit"
                  ? "Edit role"
                  : "View role"}
            </DialogTitle>
            <DialogDescription>{locale === "fr" ? "Nom, description et niveau du role." : "Role name, description and level."}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <label className="text-sm font-medium text-foreground">{locale === "fr" ? "Nom du role" : "Role name"}</label>
            <Input
              value={roleForm.name}
              onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))}
              placeholder={locale === "fr" ? "Nom du role" : "Role name"}
              disabled={roleDialogMode === "view"}
            />
            <label className="text-sm font-medium text-foreground">{locale === "fr" ? "Description" : "Description"}</label>
            <Input
              value={roleForm.description}
              onChange={(event) => setRoleForm((current) => ({ ...current, description: event.target.value }))}
              placeholder={locale === "fr" ? "Description" : "Description"}
              disabled={roleDialogMode === "view"}
            />
            <label className="text-sm font-medium text-foreground">{locale === "fr" ? "Niveau" : "Level"}</label>
            <Input
              type="number"
              min={1}
              max={10}
              value={roleForm.level}
              onChange={(event) => setRoleForm((current) => ({ ...current, level: Number(event.target.value || 2) }))}
              disabled={roleDialogMode === "view"}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>Close</Button>
            {roleDialogMode !== "view" ? (
              <Button className={getGradientButtonClass("primary")} onClick={saveRole}>Save</Button>
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
                Assign permissions
              </span>
            </DialogTitle>
            <DialogDescription>
              {permissionsRole ? `${locale === "fr" ? "Role" : "Role"}: ${permissionsRole.name}` : "-"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-background/60 p-3">
              <p className="mb-2 text-sm font-semibold">{locale === "fr" ? "Permissions assignees" : "Assigned permissions"}</p>
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
                        <span className="text-xs text-muted-foreground">{permission.description ?? "-"}</span>
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
                        <span className="text-xs text-muted-foreground">{permission.description ?? "-"}</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={removeSelectedPermissions} disabled={!canManageRolePermissions || selectedAssigned.size === 0}>Retirer selection</Button>
            <Button className={getGradientButtonClass("primary")} onClick={addSelectedPermissions} disabled={!canManageRolePermissions || selectedAvailable.size === 0}>Ajouter selection</Button>
            <Button variant="outline" onClick={() => setPermissionsDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function SecurityPermissionsPanel({ locale }: Omit<SecurityPanelProps, "onLog" | "accessToken">) {
  const accessToken = useDashboardStore((state) => state.accessToken);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("ALL");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(10);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewPermission, setViewPermission] = useState<RbacPermissionResponse | null>(null);

  const permissionsQuery = useQuery({
    queryKey: ["security-rbac-permissions", accessToken],
    enabled: Boolean(accessToken),
    queryFn: () => api.rbac.permissions.list(accessToken),
  });

  const moduleOptions = useMemo(() => {
    const base = [{ value: "ALL", label: locale === "fr" ? "Tous les modules" : "All modules" }];
    const modules = Array.from(new Set((permissionsQuery.data ?? []).map((permission) => permission.module))).sort();
    return base.concat(modules.map((moduleName) => ({ value: moduleName, label: moduleBadgeLabel(moduleName) })));
  }, [locale, permissionsQuery.data]);

  const filteredPermissions = useMemo(() => {
    const rows = permissionsQuery.data ?? [];

    return rows.filter((permission) => {
      const matchesModule = moduleFilter === "ALL" ? true : permission.module === moduleFilter;
      const normalized = `${permission.name} ${permission.description ?? ""} ${permission.module} ${permission.action}`.toLowerCase();
      const matchesSearch = normalized.includes(searchTerm.toLowerCase());
      return matchesModule && matchesSearch;
    });
  }, [permissionsQuery.data, moduleFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredPermissions.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = useMemo(() => {
    const start = safePage * pageSize;
    return filteredPermissions.slice(start, start + pageSize);
  }, [filteredPermissions, safePage, pageSize]);

  const allSelectedOnPage = pageItems.length > 0 && pageItems.every((permission) => selectedIds.has(permission.id));

  const openViewPermission = (permission: RbacPermissionResponse) => {
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
                ? "Table en lecture seule issue des permissions actives en base."
                : "Read-only table sourced from active database permissions."}
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
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
                onClick={() => permissionsQuery.refetch()}
              >
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
                setModuleFilter(value);
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
                <th className="px-3 py-3">{locale === "fr" ? "Action" : "Action"}</th>
                <th className="px-3 py-3">{locale === "fr" ? "Description" : "Description"}</th>
                <th className="px-3 py-3">{locale === "fr" ? "Consultation" : "View"}</th>
              </tr>
            </thead>
            <tbody>
              {permissionsQuery.isLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">{locale === "fr" ? "Chargement..." : "Loading..."}</td>
                </tr>
              ) : pageItems.length === 0 ? (
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
                      <Badge variant="secondary">{permission.action.toUpperCase()}</Badge>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{permission.description ?? "-"}</td>
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
              <span className="font-medium">{locale === "fr" ? "Action" : "Action"}: </span>
              {viewPermission?.action?.toUpperCase()}
            </div>
            <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
              <span className="font-medium">{locale === "fr" ? "Description" : "Description"}: </span>
              {viewPermission?.description ?? "-"}
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
