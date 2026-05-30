"use client";

import * as React from "react";
import { PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SidebarContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const SidebarContext = React.createContext<SidebarContextType | null>(null);

function useSidebarContext() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("Sidebar components must be used inside <SidebarProvider>");
  }
  return context;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);
  const toggle = React.useCallback(() => setOpen((value) => !value), []);

  return (
    <SidebarContext.Provider value={{ open, setOpen, toggle }}>
      <div className="min-h-screen bg-background">{children}</div>
    </SidebarContext.Provider>
  );
}

export function Sidebar({ className, children }: React.HTMLAttributes<HTMLElement>) {
  const { open } = useSidebarContext();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 hidden h-screen border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:block",
        open ? "w-72" : "w-20",
        className,
      )}
    >
      {children}
    </aside>
  );
}

export function SidebarInset({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useSidebarContext();

  return (
    <div className={cn("min-h-screen transition-[margin] md:ml-20", open ? "md:ml-72" : "md:ml-20", className)}>
      {children}
    </div>
  );
}

export function SidebarTrigger({ className }: { className?: string }) {
  const { toggle } = useSidebarContext();

  return (
    <Button variant="ghost" size="sm" onClick={toggle} className={cn("h-8 w-8 p-0", className)}>
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}
