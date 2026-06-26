"use client";

import type { ReactNode } from "react";
import { AuthControls } from "@/components/auth/auth-controls";
import { dictionaries } from "@/lib/i18n";
import { useDashboardStore } from "@/store/dashboard-store";

interface AuthShellProps {
  title?: string;
  children: ReactNode;
}

const decoPositions = [
  "left-6 top-8 h-16 w-16",
  "left-9 top-26 h-10 w-10",
  "left-12 bottom-24 h-20 w-20",
  "right-8 top-8 h-14 w-14",
  "right-6 top-24 h-10 w-10",
  "right-14 bottom-24 h-20 w-20",
  "right-9 bottom-40 h-12 w-12",
] as const;

export function AuthShell({ title, children }: AuthShellProps) {
  const { locale } = useDashboardStore();
  const t = dictionaries[locale];

  return (
    <main className="auth-screen auth-typography h-screen overflow-y-auto px-4 py-4">
      <div className="pointer-events-none fixed inset-0">
        {decoPositions.map((position) => (
          <span key={position} className={`auth-square ${position}`} />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center gap-4 py-6">
        {title ? <h1 className="text-center text-2xl font-bold tracking-tight text-foreground md:text-4xl">{title}</h1> : null}
        <div className="w-full rounded-2xl border border-border/70 bg-card/90 p-6 shadow-2xl backdrop-blur-sm">
          <AuthControls />
          {children}
        </div>

        <footer className="z-10 pt-2 text-center text-sm font-medium text-muted-foreground">
          <p>© 2026 AERIXA.</p>
          <p>{t.authFooterLine}</p>
        </footer>
      </div>
    </main>
  );
}
