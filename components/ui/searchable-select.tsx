"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  label: string;
  value: string;
  description?: string;
  keywords?: string[];
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Selectionner",
  searchPlaceholder = "Rechercher...",
  className,
  disabled = false,
}: SearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 240, openUp: false });

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node) && !panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function updatePosition() {
      if (!rootRef.current) {
        return;
      }
      const margin = 8;
      const rect = rootRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(120, Math.min(320, openUp ? spaceAbove : spaceBelow));
      setPosition({
        top: openUp ? rect.top - maxHeight - margin : rect.bottom + margin,
        left: rect.left,
        width: rect.width,
        maxHeight,
        openUp,
      });
    }

    updatePosition();

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
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
        disabled={disabled}
        onClick={() => setOpen((state) => !state)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="flex min-w-0 flex-1 items-baseline gap-1.5 truncate text-left">
          <span className="truncate">{selected?.label ?? placeholder}</span>
          {selected?.description ? (
            <span className="shrink-0 truncate text-xs text-muted-foreground">{selected.description}</span>
          ) : null}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-120 flex flex-col rounded-xl border border-border bg-popover p-2 shadow-xl pointer-events-auto"
              style={{ top: position.top, left: position.left, width: position.width }}
            >
              <label className="relative block shrink-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm text-foreground shadow-sm placeholder:text-muted-foreground placeholder:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>

              <div className="mt-2 overflow-auto" style={{ maxHeight: position.maxHeight }}>
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
                    className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-2 text-left text-sm text-foreground hover:bg-muted"
                  >
                    <span className="w-full truncate">{opt.label}</span>
                    {opt.description ? (
                      <span className="w-full truncate text-xs text-muted-foreground">{opt.description}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
