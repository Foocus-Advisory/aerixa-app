"use client";

import { Globe, Moon, Sun } from "lucide-react";
import { dictionaries } from "@/lib/i18n";
import { useDashboardStore } from "@/store/dashboard-store";
import { Button } from "@/components/ui/button";

export function AuthControls() {
  const { locale, setLocale, theme, setTheme } = useDashboardStore();
  const t = dictionaries[locale];

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 rounded-full px-2 text-xs text-muted-foreground"
        onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
      >
        <Globe className="h-3.5 w-3.5" />
        {locale.toUpperCase()}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 rounded-full p-0 text-muted-foreground"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label={t.theme}
      >
        {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
