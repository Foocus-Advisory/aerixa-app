import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale } from "@/lib/i18n";

const TOKEN_STORAGE_KEY_ACCESS = "aerixa-access-token";
const TOKEN_STORAGE_KEY_REFRESH = "aerixa-refresh-token";
const LAST_ACTIVITY_KEY = "aerixa-last-activity";

interface DashboardState {
  locale: Locale;
  theme: "light" | "dark";
  accessToken: string;
  refreshToken: string;
  activeTab: string;
  sessionLocked: boolean;
  lastActivityTime: number;
  userEmail: string; // Pour l'affichage à la page session-locked
  setLocale: (locale: Locale) => void;
  setTheme: (theme: "light" | "dark") => void;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  clearTokens: () => void;
  setActiveTab: (tab: string) => void;
  loadTokensFromStorage: () => void;
  lockSession: () => void;
  unlockSession: () => void;
  updateActivity: () => void;
  setUserEmail: (email: string) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      locale: "fr",
      theme: "light",
      accessToken: "",
      refreshToken: "",
      activeTab: "dashboard",
      sessionLocked: false,
      lastActivityTime: Date.now(),
      userEmail: "",
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      setTokens: ({ accessToken, refreshToken }) => {
        // Persister en sessionStorage pour survivre aux refresh de page
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(TOKEN_STORAGE_KEY_ACCESS, accessToken);
          window.sessionStorage.setItem(TOKEN_STORAGE_KEY_REFRESH, refreshToken);
        }
        set({ accessToken, refreshToken });
      },
      clearTokens: () => {
        // Effacer de sessionStorage aussi
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(TOKEN_STORAGE_KEY_ACCESS);
          window.sessionStorage.removeItem(TOKEN_STORAGE_KEY_REFRESH);
        }
        set({ accessToken: "", refreshToken: "", sessionLocked: false });
      },
      setActiveTab: (activeTab) => set({ activeTab }),
      loadTokensFromStorage: () => {
        if (typeof window === "undefined") {
          return;
        }
        const accessToken = window.sessionStorage.getItem(TOKEN_STORAGE_KEY_ACCESS) ?? "";
        const refreshToken = window.sessionStorage.getItem(TOKEN_STORAGE_KEY_REFRESH) ?? "";
        set({ accessToken, refreshToken });
      },
      lockSession: () => {
        set({ sessionLocked: true });
      },
      unlockSession: () => {
        set({ sessionLocked: false, lastActivityTime: Date.now() });
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
        }
      },
      updateActivity: () => {
        const now = Date.now();
        set({ lastActivityTime: now });
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
        }
      },
      setUserEmail: (email) => set({ userEmail: email }),
    }),
    {
      name: "aerixa-dashboard",
      // Tokens exclus intentionnellement : ne pas persister des credentials en localStorage
      partialize: (state) => ({ locale: state.locale, theme: state.theme, activeTab: state.activeTab }),
    },
  ),
);
