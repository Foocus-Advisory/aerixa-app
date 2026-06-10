import { fireEvent, render, screen } from "@testing-library/react";
import { UsersCriticalActions } from "@/components/dashboard/users-critical-actions";
import { TooltipProvider } from "@/components/ui/tooltip";

describe("UsersCriticalActions", () => {
  it("active les boutons critiques quand les permissions sont presentes", () => {
    const onCreate = vi.fn();

    render(
      <TooltipProvider>
        <UsersCriticalActions
          canCreateUsers
          canReadUsers
          templatePending={false}
          exportPending={false}
          importPending={false}
          templateTooltip="Template"
          exportTooltip="Exporter"
          importTooltip="Importer"
          addTooltip="Ajouter utilisateur"
          addLabel="Ajouter"
          onTemplate={vi.fn()}
          onExport={vi.fn()}
          onImport={vi.fn()}
          onCreate={onCreate}
        />
      </TooltipProvider>,
    );

    const addButton = screen.getByRole("button", { name: "Ajouter" });
    expect(addButton).toBeEnabled();

    fireEvent.click(addButton);
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("desactive les actions critiques si permission absente", () => {
    render(
      <TooltipProvider>
        <UsersCriticalActions
          canCreateUsers={false}
          canReadUsers={false}
          templatePending={false}
          exportPending={false}
          importPending={false}
          templateTooltip="Template"
          exportTooltip="Exporter"
          importTooltip="Importer"
          addTooltip="Ajouter utilisateur"
          addLabel="Ajouter"
          onTemplate={vi.fn()}
          onExport={vi.fn()}
          onImport={vi.fn()}
          onCreate={vi.fn()}
        />
      </TooltipProvider>,
    );

    expect(screen.getByRole("button", { name: "Template" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Exporter" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Importer" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ajouter" })).toBeDisabled();
  });
});
