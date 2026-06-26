"use client";

import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatDate(value: string, locale: "fr" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function entityTypeLabel(entityType: string | undefined, locale: "fr" | "en") {
  switch (entityType) {
    case "CANDIDATE_NOTE": return locale === "fr" ? "Note" : "Note";
    case "CANDIDATE_NOTE_ATTACHMENT": return locale === "fr" ? "Pièce jointe" : "Attachment";
    default: return entityType ?? "—";
  }
}

function actionLabel(action: string, locale: "fr" | "en") {
  switch (action) {
    case "CREATE": return locale === "fr" ? "Création" : "Created";
    case "UPDATE": return locale === "fr" ? "Modification" : "Updated";
    case "DELETE": return locale === "fr" ? "Suppression" : "Deleted";
    case "READ": return locale === "fr" ? "Consultation" : "Viewed";
    case "LIST": return locale === "fr" ? "Listing" : "Listed";
    default: return action;
  }
}

export function AuditTab({
  accessToken,
  locale,
  establishmentId,
  candidateApplicationId,
}: {
  accessToken: string;
  locale: "fr" | "en";
  establishmentId: string;
  candidateApplicationId: string;
}) {
  const auditQuery = useQuery({
    queryKey: ["candidate-application", "audit", accessToken, establishmentId, candidateApplicationId],
    queryFn: () => api.candidateApplications.listAudit(accessToken, candidateApplicationId, establishmentId),
    enabled: Boolean(accessToken && establishmentId && candidateApplicationId),
  });

  const entries = auditQuery.data ?? [];

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" />
          {locale === "fr" ? "Audit de la candidature" : "Application audit"}
        </CardTitle>
        <CardDescription>
          {locale === "fr"
            ? "Toutes les actions tracées sur les notes et pièces jointes de cette candidature."
            : "All tracked actions on this application's notes and attachments."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {auditQuery.isLoading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{locale === "fr" ? "Chargement…" : "Loading…"}</p>
        ) : auditQuery.isError ? (
          <p className="py-4 text-center text-sm text-destructive">{locale === "fr" ? "Erreur lors du chargement." : "Error loading data."}</p>
        ) : entries.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{locale === "fr" ? "Aucune activité tracée." : "No tracked activity."}</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {actionLabel(entry.action, locale)} — {entityTypeLabel(entry.entityType, locale)}
                </span>
                <Badge variant={entry.outcome === "FAILURE" ? "danger" : "outline"}>{entry.outcome ?? "—"}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {entry.actorEmail ?? (locale === "fr" ? "Système" : "System")} • {formatDate(entry.timestamp, locale)}
              </p>
              {entry.errorMessage && (
                <p className="mt-1 text-xs text-destructive">{entry.errorMessage}</p>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
