import { render, screen } from "@testing-library/react";
import { NotificationsCriticalActions } from "@/components/dashboard/notifications-critical-actions";

describe("NotificationsCriticalActions", () => {
  it("affiche les actions edition/suppression quand permissions presentes", () => {
    render(
      <NotificationsCriticalActions
        locale="fr"
        canEditNotifications
        canDeleteNotifications
        hasSelection
        bulkEditPending={false}
        bulkDeletePending={false}
        onMarkRead={vi.fn()}
        onMarkUnread={vi.fn()}
        onDeleteSelected={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Marquer lu" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Marquer non lu" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Supprimer selection" })).toBeEnabled();
  });

  it("desactive edition et masque suppression sans permissions", () => {
    render(
      <NotificationsCriticalActions
        locale="fr"
        canEditNotifications={false}
        canDeleteNotifications={false}
        hasSelection
        bulkEditPending={false}
        bulkDeletePending={false}
        onMarkRead={vi.fn()}
        onMarkUnread={vi.fn()}
        onDeleteSelected={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Marquer lu" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Marquer non lu" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Supprimer selection" })).not.toBeInTheDocument();
  });
});
