"use client";

import { Download, FileSpreadsheet, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppTooltip } from "@/components/ui/tooltip";
import { getGradientButtonClass } from "@/lib/button-gradients";

type UsersCriticalActionsProps = {
  canCreateUsers: boolean;
  canReadUsers: boolean;
  templatePending: boolean;
  exportPending: boolean;
  importPending: boolean;
  templateTooltip: string;
  exportTooltip: string;
  importTooltip: string;
  addTooltip: string;
  addLabel: string;
  onTemplate: () => void;
  onExport: () => void;
  onImport: () => void;
  onCreate: () => void;
};

export function UsersCriticalActions({
  canCreateUsers,
  canReadUsers,
  templatePending,
  exportPending,
  importPending,
  templateTooltip,
  exportTooltip,
  importTooltip,
  addTooltip,
  addLabel,
  onTemplate,
  onExport,
  onImport,
  onCreate,
}: UsersCriticalActionsProps) {
  return (
    <>
      <AppTooltip content={templateTooltip}>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
          onClick={onTemplate}
          disabled={!canCreateUsers || templatePending}
          aria-label={templateTooltip}
        >
          <FileSpreadsheet className="h-4 w-4" />
        </Button>
      </AppTooltip>

      <AppTooltip content={exportTooltip}>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
          onClick={onExport}
          disabled={!canReadUsers || exportPending}
          aria-label={exportTooltip}
        >
          <Download className="h-4 w-4" />
        </Button>
      </AppTooltip>

      <AppTooltip content={importTooltip}>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
          onClick={onImport}
          disabled={!canCreateUsers || importPending}
          aria-label={importTooltip}
        >
          <Upload className="h-4 w-4" />
        </Button>
      </AppTooltip>

      <AppTooltip content={addTooltip}>
        <Button className={getGradientButtonClass("primary")} onClick={onCreate} disabled={!canCreateUsers}>
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      </AppTooltip>
    </>
  );
}
