"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppTooltip } from "@/components/ui/tooltip";

interface DropdownMenuProps {
  items: Array<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: "default" | "destructive";
    icon?: React.ComponentType<{ className?: string }>;
  }>;
  className?: string;
  triggerClassName?: string;
  triggerTooltip?: string;
}

export function DropdownMenu({ items, className, triggerClassName, triggerTooltip }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: 320 });

  useEffect(() => {
    if (!open || !ref.current) {
      return;
    }

    const menuWidth = 192;
    const margin = 8;
    const preferredHeight = 320;
    const rect = ref.current.getBoundingClientRect();

    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openDown = spaceBelow >= 180 || spaceBelow >= spaceAbove;

    const top = openDown
      ? rect.bottom + margin
      : Math.max(margin, rect.top - Math.min(preferredHeight, Math.max(120, spaceAbove)) - margin);
    const left = Math.min(
      Math.max(margin, rect.right - menuWidth),
      Math.max(margin, window.innerWidth - menuWidth - margin),
    );
    const maxHeight = Math.max(120, openDown ? spaceBelow : spaceAbove);

    setPosition({ top, left, maxHeight });

    function handleClickOutside(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function handleReposition() {
      if (!ref.current) {
        return;
      }

      const triggerRect = ref.current.getBoundingClientRect();
      const below = window.innerHeight - triggerRect.bottom - margin;
      const above = triggerRect.top - margin;
      const down = below >= 180 || below >= above;

      const nextTop = down
        ? triggerRect.bottom + margin
        : Math.max(margin, triggerRect.top - Math.min(preferredHeight, Math.max(120, above)) - margin);
      const nextLeft = Math.min(
        Math.max(margin, triggerRect.right - menuWidth),
        Math.max(margin, window.innerWidth - menuWidth - margin),
      );
      const nextMaxHeight = Math.max(120, down ? below : above);

      setPosition({ top: nextTop, left: nextLeft, maxHeight: nextMaxHeight });
    }

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <AppTooltip content={triggerTooltip} side="left">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(!open)}
          className={triggerClassName}
          aria-label="Menu"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </AppTooltip>

      {open && (
        <div
          ref={menuRef}
          className="fixed z-120 w-48 overflow-y-auto rounded-md border border-border bg-background shadow-lg"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            maxHeight: `${position.maxHeight}px`,
          }}
        >
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                }}
                disabled={item.disabled}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm font-medium transition-colors first:rounded-t-md last:rounded-b-md disabled:pointer-events-none disabled:opacity-50",
                  item.variant === "destructive"
                    ? "text-destructive hover:bg-destructive/10"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <span className="inline-flex items-center gap-2">
                  {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                  <span>{item.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
