"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDashboardStore } from "@/store/dashboard-store";

const ACTIVE_ESTABLISHMENT_STORAGE_KEY = "active_establishment_id";

export function useActiveEstablishment() {
  const accessToken = useDashboardStore((state) => state.accessToken);

  const establishmentsQuery = useQuery({
    queryKey: ["config", "establishments", accessToken],
    queryFn: () => api.configuration.establishments.list(accessToken),
    enabled: Boolean(accessToken),
    staleTime: 10 * 60_000,
  });

  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(ACTIVE_ESTABLISHMENT_STORAGE_KEY);
    if (stored) {
      setSelectedEstablishmentId(stored);
    }
  }, []);

  const establishments = establishmentsQuery.data ?? [];
  const isSelectedValid = establishments.some((establishment) => establishment.id === selectedEstablishmentId);
  const effectiveEstablishmentId = isSelectedValid ? selectedEstablishmentId : establishments[0]?.id ?? "";

  const selectEstablishment = (establishmentId: string) => {
    setSelectedEstablishmentId(establishmentId);
    window.localStorage.setItem(ACTIVE_ESTABLISHMENT_STORAGE_KEY, establishmentId);
  };

  return {
    establishments,
    establishmentsQuery,
    isLoadingEstablishments: establishmentsQuery.isLoading,
    hasEstablishments: establishments.length > 0,
    effectiveEstablishmentId,
    isValidEstablishment: Boolean(effectiveEstablishmentId),
    selectEstablishment,
  };
}
