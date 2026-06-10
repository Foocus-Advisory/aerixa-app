import { render, screen } from "@testing-library/react";
import { SessionsCriticalActions } from "@/components/dashboard/sessions-critical-actions";
import { TooltipProvider } from "@/components/ui/tooltip";

describe("SessionsCriticalActions", () => {
  it("laisse exporter si permission de lecture sessions presente", () => {
    render(
      <TooltipProvider>
        <SessionsCriticalActions
          canExportSessions
          exportPending={false}
          exportXlsxLabel="Exporter XLSX"
          exportCsvLabel="Exporter CSV"
          onExportXlsx={vi.fn()}
          onExportCsv={vi.fn()}
        />
      </TooltipProvider>,
    );

    expect(screen.getByRole("button", { name: "Exporter XLSX" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Exporter CSV" })).toBeEnabled();
  });

  it("desactive export si permission absente", () => {
    render(
      <TooltipProvider>
        <SessionsCriticalActions
          canExportSessions={false}
          exportPending={false}
          exportXlsxLabel="Exporter XLSX"
          exportCsvLabel="Exporter CSV"
          onExportXlsx={vi.fn()}
          onExportCsv={vi.fn()}
        />
      </TooltipProvider>,
    );

    expect(screen.getByRole("button", { name: "Exporter XLSX" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Exporter CSV" })).toBeDisabled();
  });
});
