"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useDashboardStore } from "@/store/dashboard-store";
import { ToastProvider } from "@/components/ui/toast-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TokenManager } from "@/components/providers/token-manager";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: 1, refetchOnWindowFocus: false },
        mutations: { retry: 0 },
      },
    }),
  );
  const theme = useDashboardStore((state) => state.theme);
  const isFirstMount = useRef(true);

  useEffect(() => {
    const root = document.documentElement;
    const isFirst = isFirstMount.current;
    isFirstMount.current = false;

    // Active la transition douce uniquement lors d'un vrai changement (pas au chargement initial)
    if (!isFirst) {
      root.classList.add("theme-transitioning");
    }

    if (theme === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }

    if (!isFirst) {
      const timer = setTimeout(() => {
        root.classList.remove("theme-transitioning");
      }, 420);
      return () => clearTimeout(timer);
    }
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={120} skipDelayDuration={80}>
        <ToastProvider>
          <TokenManager>{children}</TokenManager>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
