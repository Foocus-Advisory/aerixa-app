"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  locale?: "fr" | "en";
  maxDate?: Date;
  minDate?: Date;
}

function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateOnly(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function DatePicker({
  value,
  onValueChange,
  placeholder,
  className,
  disabled = false,
  locale = "fr",
  maxDate,
  minDate,
}: DatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  const selectedDate = useMemo(() => parseDateOnly(value), [value]);
  const [viewDate, setViewDate] = useState(() => selectedDate ?? new Date());

  useEffect(() => {
    if (open) {
      setViewDate(selectedDate ?? new Date());
    }
  }, [open, selectedDate]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node) && !panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function updatePosition() {
      if (!rootRef.current) return;
      const margin = 8;
      const rect = rootRef.current.getBoundingClientRect();
      const panelHeight = 340;
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const openUp = spaceBelow < panelHeight && rect.top > spaceBelow;
      setPosition({
        top: openUp ? rect.top - panelHeight - margin : rect.bottom + margin,
        left: rect.left,
        width: rect.width,
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

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { month: "long", year: "numeric" }).format(viewDate),
    [viewDate, locale],
  );

  const weekDayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { weekday: "short" });
    const baseMonday = new Date(2024, 0, 1); // a Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(baseMonday);
      d.setDate(baseMonday.getDate() + i);
      return formatter.format(d).slice(0, 2);
    });
  }, [locale]);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    // Monday-first offset
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { date: Date; outside: boolean }[] = [];
    for (let i = firstWeekday; i > 0; i--) {
      days.push({ date: new Date(year, month, 1 - i), outside: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: new Date(year, month, d), outside: false });
    }
    while (days.length % 7 !== 0 || days.length < 42) {
      const last = days[days.length - 1].date;
      days.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), outside: true });
      if (days.length >= 42) break;
    }
    return days;
  }, [viewDate]);

  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const isDisabled = (date: Date) => {
    if (maxDate && date.getTime() > maxDate.getTime()) return true;
    if (minDate && date.getTime() < minDate.getTime()) return true;
    return false;
  };

  const today = new Date();

  const displayLabel = selectedDate
    ? new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { dateStyle: "long" }).format(selectedDate)
    : (placeholder ?? (locale === "fr" ? "Sélectionner une date" : "Select a date"));

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const start = currentYear - 100;
    const end = currentYear + 1;
    const years: number[] = [];
    for (let y = end; y >= start; y--) years.push(y);
    return years;
  }, []);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((state) => !state)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={cn("truncate text-left", !selectedDate && "text-muted-foreground")}>{displayLabel}</span>
        <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-120 flex flex-col gap-3 rounded-xl border border-border bg-popover p-3 shadow-xl pointer-events-auto"
              style={{ top: position.top, left: position.left, width: Math.max(position.width, 280) }}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={locale === "fr" ? "Mois précédent" : "Previous month"}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium capitalize">{monthLabel}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={locale === "fr" ? "Mois suivant" : "Next month"}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={viewDate.getMonth()}
                  onChange={(e) => setViewDate((d) => new Date(d.getFullYear(), Number(e.target.value), 1))}
                  className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs capitalize text-foreground"
                >
                  {Array.from({ length: 12 }, (_, m) => (
                    <option key={m} value={m}>
                      {new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { month: "long" }).format(new Date(2024, m, 1))}
                    </option>
                  ))}
                </select>
                <select
                  value={viewDate.getFullYear()}
                  onChange={(e) => setViewDate((d) => new Date(Number(e.target.value), d.getMonth(), 1))}
                  className="h-8 w-24 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {weekDayLabels.map((d, i) => (
                  <div key={i} className="flex h-7 items-center justify-center text-[11px] font-medium uppercase text-muted-foreground">
                    {d}
                  </div>
                ))}
                {calendarDays.map(({ date, outside }, i) => {
                  const disabled = isDisabled(date);
                  const selected = selectedDate ? isSameDay(date, selectedDate) : false;
                  const isToday = isSameDay(date, today);
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        onValueChange(toDateOnly(date));
                        setOpen(false);
                      }}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors",
                        outside && "text-muted-foreground/40",
                        !outside && !selected && "text-foreground hover:bg-muted",
                        selected && "bg-primary text-primary-foreground hover:bg-primary",
                        !selected && isToday && "border border-primary/50",
                        disabled && "cursor-not-allowed opacity-30 hover:bg-transparent",
                      )}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between border-t border-border/60 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onValueChange("");
                    setOpen(false);
                  }}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {locale === "fr" ? "Effacer" : "Clear"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    if (!isDisabled(now)) {
                      onValueChange(toDateOnly(now));
                      setOpen(false);
                    } else {
                      setViewDate(now);
                    }
                  }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {locale === "fr" ? "Aujourd'hui" : "Today"}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
