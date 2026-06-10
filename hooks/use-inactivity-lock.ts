"use client";

import { useEffect, useRef } from "react";
import { useDashboardStore } from "@/store/dashboard-store";

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_TIMEOUT_MS = 14 * 60 * 1000; // 14 minutes 30 secondes (30s avant verrouillage)

/**
 * Hook qui détecte l'inactivité et verrouille automatiquement la session
 * Écoute: click, keypress, scroll, mouvement souris, touchdown
 */
export function useInactivityLock() {
  const { sessionLocked, accessToken, lockSession, updateActivity } = useDashboardStore();
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);

  useEffect(() => {
    // Ne pas activer le timer si pas de session ou déjà verrouillé
    if (!accessToken || sessionLocked) {
      return;
    }

    const resetInactivityTimer = () => {
      // Réinitialiser les timers
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }

      warningShownRef.current = false;

      // Mettre à jour le dernier temps d'activité
      updateActivity();

      // Timer pour affichage du warning (30s avant verrouillage)
      warningTimerRef.current = setTimeout(() => {
        warningShownRef.current = true;
        // TODO: Afficher une toast/modal d'avertissement
        console.warn("Session va se verrouiller dans 30 secondes...");
      }, WARNING_TIMEOUT_MS);

      // Timer pour verrouillage
      inactivityTimerRef.current = setTimeout(() => {
        lockSession();
        console.log("Session verrouillée après inactivité");
      }, INACTIVITY_TIMEOUT_MS);
    };

    // Événements à écouter pour détecter l'activité
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];

    events.forEach((event) => {
      document.addEventListener(event, resetInactivityTimer);
    });

    // Initialiser le timer au premier chargement
    resetInactivityTimer();

    return () => {
      // Cleanup
      events.forEach((event) => {
        document.removeEventListener(event, resetInactivityTimer);
      });

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
    };
  }, [accessToken, sessionLocked, lockSession, updateActivity]);
}
