"use client";

import { Moon, Sun } from "lucide-react";
import ReactCountryFlag from "react-country-flag";
import { dictionaries } from "@/lib/i18n";
import { useDashboardStore } from "@/store/dashboard-store";
import { Button } from "@/components/ui/button";

const localeFlags = { fr: "FR", en: "GB" } as const;

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
        <ReactCountryFlag countryCode={localeFlags[locale]} svg style={{ width: "1em", height: "1em" }} />
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
