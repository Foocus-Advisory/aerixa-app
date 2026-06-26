"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CandidateApplicationResponse } from "@/lib/types";

export function HistoryTab({
  accessToken,
  locale,
  establishmentId,
  application,
  canViewHistory,
}: {
  accessToken: string;
  locale: "fr" | "en";
  establishmentId: string;
  application: CandidateApplicationResponse;
  canViewHistory: boolean;
}) {
  const historyQuery = useQuery({
    queryKey: ["candidate-applications", "history", accessToken, establishmentId, application.id],
    queryFn: () => api.candidateApplications.history(accessToken, application.id, establishmentId),
    enabled: Boolean(accessToken && establishmentId && canViewHistory),
  });

  const funnelStagesQuery = useQuery({
    queryKey: ["config", "funnel-stages", accessToken, establishmentId],
    queryFn: () => api.configuration.funnelStages.list(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId),
  });

  const funnelStageMap = useMemo(() => {
    const map = new Map<string, string>();
    (funnelStagesQuery.data ?? []).forEach((s) => map.set(s.id, s.name));
    return map;
  }, [funnelStagesQuery.data]);

  if (!canViewHistory) {
    return (
      <Card className="border-border/60 bg-card/70">
        <CardContent className="py-8 text-sm text-muted-foreground">
          {locale === "fr" ? "Vous n'avez pas l'autorisation de consulter l'historique." : "You are not authorized to view the history."}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          {locale === "fr" ? "Historique des étapes" : "Stage history"}
        </CardTitle>
        <CardDescription>
          {locale === "fr"
            ? "Transitions de la candidature dans le funnel, horodatées."
            : "Application transitions through the funnel, timestamped."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {historyQuery.isLoading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{locale === "fr" ? "Chargement…" : "Loading…"}</p>
        ) : historyQuery.isError ? (
          <p className="py-4 text-center text-sm text-destructive">{locale === "fr" ? "Erreur lors du chargement." : "Error loading data."}</p>
        ) : (historyQuery.data ?? []).length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{locale === "fr" ? "Aucun historique." : "No history."}</p>
        ) : (
          (historyQuery.data ?? [])
            .slice()
            .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
            .map((h) => {
              const fromStage = h.fromStageId ? funnelStageMap.get(h.fromStageId) : undefined;
              const toStage = funnelStageMap.get(h.toStageId);
              return (
                <div key={h.id} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>
                      {fromStage ? fromStage : (locale === "fr" ? "Création" : "Created")}
                      {" → "}
                      <span className="font-medium">{toStage ?? "—"}</span>
                    </span>
                    <Badge variant="outline">{h.transitionType}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(h.occurredAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}
                  </p>
                </div>
              );
            })
        )}
      </CardContent>
    </Card>
  );
}
