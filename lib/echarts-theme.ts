export type ChartTheme = "light" | "dark";

export function chartPalette(theme: ChartTheme) {
  const isDark = theme === "dark";
  return {
    foreground: isDark ? "#e9eefc" : "#121a2b",
    mutedForeground: isDark ? "#9aa7c0" : "#67758f",
    card: isDark ? "#0f1730" : "#ffffff",
    border: isDark ? "rgba(122, 150, 214, 0.35)" : "#dce4f5",
  };
}

export function chartTooltipStyle(theme: ChartTheme) {
  const palette = chartPalette(theme);
  return {
    backgroundColor: palette.card,
    borderColor: palette.border,
    textStyle: { color: palette.foreground, fontSize: 12 },
  };
}
