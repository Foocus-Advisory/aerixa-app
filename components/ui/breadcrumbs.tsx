"use client";

import { ChevronRight, Home } from "lucide-react";

export type BreadcrumbItem = {
  label: string;
  tab?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  onNavigate?: (tab: string, stepsBack: number) => void;
};

export function Breadcrumbs({ items, onNavigate }: BreadcrumbsProps) {
  return (
    <nav aria-label="Fil d'ariane" className="flex items-center gap-1 text-sm text-muted-foreground">
      <Home className="h-3.5 w-3.5 shrink-0" />
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const stepsBack = items.length - 1 - index;
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-border" />
            {item.tab && onNavigate && !isLast ? (
              <button
                type="button"
                onClick={() => onNavigate(item.tab!, stepsBack)}
                className="transition hover:text-foreground hover:underline"
              >
                {item.label}
              </button>
            ) : (
              <span className={isLast ? "font-medium text-foreground" : ""}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
