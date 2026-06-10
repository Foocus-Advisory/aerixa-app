"use client";

import { Button } from "@/components/ui/button";

type NotificationsCriticalActionsProps = {
  locale: "fr" | "en";
  canEditNotifications: boolean;
  canDeleteNotifications: boolean;
  hasSelection: boolean;
  bulkEditPending: boolean;
  bulkDeletePending: boolean;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onDeleteSelected: () => void;
};

export function NotificationsCriticalActions({
  locale,
  canEditNotifications,
  canDeleteNotifications,
  hasSelection,
  bulkEditPending,
  bulkDeletePending,
  onMarkRead,
  onMarkUnread,
  onDeleteSelected,
}: NotificationsCriticalActionsProps) {
  const markReadLabel = locale === "fr" ? "Marquer lu" : "Mark read";
  const markUnreadLabel = locale === "fr" ? "Marquer non lu" : "Mark unread";
  const deleteLabel = locale === "fr" ? "Supprimer selection" : "Delete selected";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onMarkRead}
        disabled={!canEditNotifications || !hasSelection || bulkEditPending}
      >
        {markReadLabel}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onMarkUnread}
        disabled={!canEditNotifications || !hasSelection || bulkEditPending}
      >
        {markUnreadLabel}
      </Button>
      {canDeleteNotifications ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={onDeleteSelected}
          disabled={!hasSelection || bulkDeletePending}
        >
          {deleteLabel}
        </Button>
      ) : null}
    </div>
  );
}
