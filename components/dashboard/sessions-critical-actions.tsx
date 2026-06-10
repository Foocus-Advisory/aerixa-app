"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppTooltip } from "@/components/ui/tooltip";

type SessionsCriticalActionsProps = {
  canExportSessions: boolean;
  exportPending: boolean;
  exportXlsxLabel: string;
  exportCsvLabel: string;
  onExportXlsx: () => void;
  onExportCsv: () => void;
};

export function SessionsCriticalActions({
  canExportSessions,
  exportPending,
  exportXlsxLabel,
  exportCsvLabel,
  onExportXlsx,
  onExportCsv,
}: SessionsCriticalActionsProps) {
  return (
    <>
      <AppTooltip content={exportXlsxLabel}>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
          onClick={onExportXlsx}
          disabled={!canExportSessions || exportPending}
          aria-label={exportXlsxLabel}
        >
          <FileSpreadsheet className="h-4 w-4" />
        </Button>
      </AppTooltip>

      <AppTooltip content={exportCsvLabel}>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
          onClick={onExportCsv}
          disabled={!canExportSessions || exportPending}
          aria-label={exportCsvLabel}
        >
          <Download className="h-4 w-4" />
        </Button>
      </AppTooltip>
    </>
  );
}
