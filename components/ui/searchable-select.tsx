"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  label: string;
  value: string;
  keywords?: string[];
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Selectionner",
  searchPlaceholder = "Rechercher...",
  className,
}: SearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return options;
    }
    return options.filter((opt) => {
      const inLabel = opt.label.toLowerCase().includes(normalized);
      const inKeywords = (opt.keywords ?? []).some((keyword) => keyword.toLowerCase().includes(normalized));
      return inLabel || inKeywords;
    });
  }, [query, options]);

  const selected = options.find((opt) => opt.value === value);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-(--input-bg) px-3 py-2 text-sm text-foreground [font-family:var(--font-grift)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="truncate text-left">{selected?.label ?? placeholder}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open ? (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-border bg-popover p-2 shadow-xl">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="flex h-9 w-full rounded-md border border-input bg-(--input-bg) px-3 py-2 pl-9 text-sm text-foreground [font-family:var(--font-grift)] shadow-sm placeholder:text-muted-foreground placeholder:font-medium placeholder:[font-family:var(--font-grift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <div className="mt-2 max-h-48 overflow-auto">
            {filtered.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">{placeholder}</p>
            ) : null}
            {filtered.map((opt) => (
              <button
                key={`${opt.value}-${opt.label}`}
                type="button"
                onClick={() => {
                  onValueChange(opt.value);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center rounded-md px-2 py-2 text-left text-sm text-foreground [font-family:var(--font-grift)] hover:bg-muted"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
