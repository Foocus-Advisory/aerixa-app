"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { AppTooltip } from "@/components/ui/tooltip";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Edit2, Eye, Trash2, ToggleRight } from "lucide-react";
import type { MailTypeResponse } from "@/lib/mail-templates-api";
import type { Locale } from "@/lib/i18n";

interface MailTypesTableProps {
  mailTypes: MailTypeResponse[];
  locale: Locale;
  isLoading?: boolean;
  pageSize?: number;
  onEdit?: (mailType: MailTypeResponse) => void;
  onDelete?: (mailType: MailTypeResponse) => void;
  onToggle?: (mailType: MailTypeResponse) => void;
  onTemplates?: (mailType: MailTypeResponse) => void;
}

export function MailTypesTable({
  mailTypes,
  locale,
  isLoading = false,
  pageSize = 6,
  onEdit,
  onDelete,
  onToggle,
  onTemplates,
}: MailTypesTableProps) {
  const t = locale === "fr"
    ? {
        selectAll: "selectionner tous les types de mail",
        category: "Categorie",
        state: "Etat",
        retries: "Tentatives",
        actions: "Actions",
        loading: "Chargement...",
        empty: "Aucun type de mail configure",
        active: "Actif",
        inactive: "Inactif",
        linkedTemplates: "Voir les templates lies",
        edit: "Editer",
        toggle: "Basculer l'etat",
        delete: "Supprimer",
        rowsSelected: "ligne(s) selectionnee(s)",
        rowsPerPage: "Lignes par page:",
        page: "Page",
        of: "of",
        search: "Rechercher...",
        firstPage: "Premiere page",
        previousPage: "Page precedente",
        nextPage: "Page suivante",
        lastPage: "Derniere page",
      }
    : {
        selectAll: "select all mail types",
        category: "Category",
        state: "State",
        retries: "Retries",
        actions: "Actions",
        loading: "Loading...",
        empty: "No mail type configured",
        active: "Active",
        inactive: "Inactive",
        linkedTemplates: "View linked templates",
        edit: "Edit",
        toggle: "Toggle state",
        delete: "Delete",
        rowsSelected: "row(s) selected",
        rowsPerPage: "Rows per page:",
        page: "Page",
        of: "of",
        search: "Search...",
        firstPage: "First page",
        previousPage: "Previous page",
        nextPage: "Next page",
        lastPage: "Last page",
      };
  const rowsPerPageOptions = [
    { value: "5", label: "5", keywords: ["5"] },
    { value: "10", label: "10", keywords: ["10"] },
    { value: "20", label: "20", keywords: ["20"] },
    { value: "50", label: "50", keywords: ["50"] },
  ];

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(pageSize);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const totalPages = Math.max(1, Math.ceil(mailTypes.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages - 1);
  const pagedMailTypes = React.useMemo(() => {
    const start = currentPage * rowsPerPage;
    return mailTypes.slice(start, start + rowsPerPage);
  }, [mailTypes, currentPage, rowsPerPage]);

  const allSelectedOnPage =
    pagedMailTypes.length > 0 && pagedMailTypes.every((mailType) => selectedIds.has(mailType.id));

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allSelectedOnPage) {
        pagedMailTypes.forEach((mailType) => next.delete(mailType.id));
      } else {
        pagedMailTypes.forEach((mailType) => next.add(mailType.id));
      }
      return next;
    });
  };

  const statusBadgeClass = (active: boolean) => {
    if (active) {
      return "border border-emerald-200 bg-emerald-100 !text-emerald-900 dark:border-emerald-500/45 dark:bg-emerald-500/20 dark:!text-emerald-50";
    }
    return "border border-rose-200 bg-rose-100 !text-rose-900 dark:border-rose-500/45 dark:bg-rose-500/20 dark:!text-rose-50";
  };

  const statusDotClass = (active: boolean) => {
    return active ? "bg-emerald-500 dark:bg-emerald-300" : "bg-rose-500 dark:bg-rose-300";
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/40 border-b border-border">
            <th className="w-10 px-4 py-3 text-left font-semibold">
              <input
                type="checkbox"
                checked={allSelectedOnPage}
                onChange={toggleSelectAllOnPage}
                aria-label={t.selectAll}
              />
            </th>
            <th className="w-37.5 px-4 py-3 text-left font-semibold">Code</th>
            <th className="w-50 px-4 py-3 text-left font-semibold">{t.category}</th>
            <th className="px-4 py-3 text-left font-semibold">Nom</th>
            <th className="w-25 px-4 py-3 text-left font-semibold">{t.state}</th>
            <th className="w-25 px-4 py-3 text-left font-semibold">{t.retries}</th>
            <th className="w-25 px-4 py-3 text-left font-semibold">{t.actions}</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={7} className="text-center py-8 text-muted-foreground">
                {t.loading}
              </td>
            </tr>
          ) : pagedMailTypes.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-8 text-muted-foreground">
                {t.empty}
              </td>
            </tr>
          ) : (
            pagedMailTypes.map((mailType) => (
              <tr
                key={mailType.id}
                className={`hover:bg-muted/30 border-b border-border/60 ${selectedIds.has(mailType.id) ? "bg-muted/20" : ""}`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(mailType.id)}
                    onChange={() => toggleSelection(mailType.id)}
                    aria-label={`selectionner ${mailType.name}`}
                  />
                </td>
                <td className="px-4 py-3 font-mono font-medium text-sm">
                  {mailType.code}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className="rounded-md border-border px-2 py-1 text-xs text-muted-foreground h-auto"
                  >
                    {mailType.category}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-medium">{mailType.name}</td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={`h-7 gap-1.5 rounded-full px-3 py-0 text-[12px] font-medium leading-none ${statusBadgeClass(mailType.active)}`}
                  >
                    <span className={`h-1.75 w-1.75 rounded-full ${statusDotClass(mailType.active)}`} />
                    {mailType.active ? t.active : t.inactive}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    {mailType.maxRetries}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <DropdownMenu
                    triggerClassName="h-8 w-8 p-0"
                    triggerTooltip={t.actions}
                    items={[
                      {
                        label: t.linkedTemplates,
                        onClick: () => onTemplates?.(mailType),
                        icon: Eye,
                      },
                      {
                        label: t.edit,
                        onClick: () => onEdit?.(mailType),
                        icon: Edit2,
                      },
                      {
                        label: t.toggle,
                        onClick: () => onToggle?.(mailType),
                        icon: ToggleRight,
                      },
                      {
                        label: t.delete,
                        onClick: () => onDelete?.(mailType),
                        icon: Trash2,
                        variant: "destructive",
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

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <p>
          {selectedIds.size} {t.of} {mailTypes.length} {t.rowsSelected}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="mail-types-rows-per-page" className="text-xs font-medium text-muted-foreground">
              {t.rowsPerPage}
            </label>
            <div className="w-24">
              <SearchableSelect
                options={rowsPerPageOptions}
                value={String(rowsPerPage)}
                onValueChange={(value) => {
                  setRowsPerPage(Number(value));
                  setPage(0);
                  setSelectedIds(new Set());
                }}
                placeholder="5"
                searchPlaceholder={t.search}
              />
            </div>
          </div>

          <p className="text-xs font-medium text-muted-foreground">
            {t.page} {Math.min(currentPage + 1, Math.max(totalPages, 1))} {t.of} {Math.max(totalPages, 1)}
          </p>

          <div className="flex gap-1">
            <AppTooltip content={t.firstPage}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(0)}
                disabled={currentPage <= 0}
                className="px-2"
              >
                «
              </Button>
            </AppTooltip>
            <AppTooltip content={t.previousPage}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(current - 1, 0))}
                disabled={currentPage <= 0}
                className="px-2"
              >
                ‹
              </Button>
            </AppTooltip>
            <AppTooltip content={t.nextPage}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => current + 1)}
                disabled={totalPages === 0 || currentPage >= totalPages - 1}
                className="px-2"
              >
                ›
              </Button>
            </AppTooltip>
            <AppTooltip content={t.lastPage}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(totalPages - 1, 0))}
                disabled={totalPages === 0 || currentPage >= totalPages - 1}
                className="px-2"
              >
                »
              </Button>
            </AppTooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
