"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, History, ShieldCheck, Workflow } from "lucide-react";
import { api } from "@/lib/api";
import { useDashboardStore } from "@/store/dashboard-store";
import { buildPermissionSet, hasPermission } from "@/lib/permissions";
import { AppSidebar } from "@/components/app-sidebar";
import { AdminTopBar } from "@/components/dashboard/admin-top-bar";
import { AppTooltip } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { MobileSectionTabs } from "@/components/dashboard/mobile-section-tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isTokenExpired } from "@/lib/jwt-utils";
import { HistoryTab } from "./history-tab";
import { NotesTab } from "./notes-tab";
import { AuditTab } from "./audit-tab";

function statusLabel(status: string | undefined, locale: "fr" | "en") {
  switch (status) {
    case "IN_PROGRESS": return locale === "fr" ? "En cours" : "In progress";
    case "ACCEPTED": return locale === "fr" ? "Acceptée" : "Accepted";
    case "REJECTED": return locale === "fr" ? "Rejetée" : "Rejected";
    default: return status ?? "—";
  }
}

function statusBadgeVariant(status: string | undefined): "success" | "danger" | "outline" {
  if (status === "ACCEPTED") return "success";
  if (status === "REJECTED") return "danger";
  return "outline";
}

export default function CandidateApplicationDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string; applicationId: string }>();
  const searchParams = useSearchParams();
  const { accessToken, locale, loadTokensFromStorage, setActiveTab } = useDashboardStore();
  const [isHydrated, setIsHydrated] = useState(false);

  const candidateId = useMemo(() => {
    const rawId = params?.id;
    return Array.isArray(rawId) ? rawId[0] : rawId ?? "";
  }, [params]);

  const applicationId = useMemo(() => {
    const rawId = params?.applicationId;
    return Array.isArray(rawId) ? rawId[0] : rawId ?? "";
  }, [params]);

  const establishmentId = searchParams?.get("establishmentId") ?? "";

  useEffect(() => {
    loadTokensFromStorage();
    setActiveTab("candidates");
    setIsHydrated(true);
  }, [loadTokensFromStorage, setActiveTab]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken || isTokenExpired(accessToken)) {
      router.replace("/login?reason=auth_required");
    }
  }, [accessToken, isHydrated, router]);

  const currentUserQuery = useQuery({
    queryKey: ["candidate-application-detail", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });

  const applicationQuery = useQuery({
    queryKey: ["candidate-application", "detail", accessToken, establishmentId, applicationId],
    queryFn: () => api.candidateApplications.get(accessToken, applicationId, establishmentId),
    enabled: Boolean(accessToken && applicationId && establishmentId),
  });

  const candidateQuery = useQuery({
    queryKey: ["candidate", "detail", accessToken, establishmentId, candidateId],
    queryFn: () => api.candidates.get(accessToken, candidateId, establishmentId),
    enabled: Boolean(accessToken && candidateId && establishmentId),
  });

  const programTrackLevelsQuery = useQuery({
    queryKey: ["config", "program-track-levels", accessToken, establishmentId],
    queryFn: () => api.configuration.programTrackLevels.list(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId),
  });

  const programTracksQuery = useQuery({
    queryKey: ["config", "program-tracks", accessToken, establishmentId],
    queryFn: () => api.configuration.programTracks.list(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId),
  });

  const academicLevelsQuery = useQuery({
    queryKey: ["config", "academic-levels", accessToken, establishmentId],
    queryFn: () => api.configuration.academicLevels.list(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId),
  });

  const funnelStagesQuery = useQuery({
    queryKey: ["config", "funnel-stages", accessToken, establishmentId],
    queryFn: () => api.configuration.funnelStages.list(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId),
  });

  const application = applicationQuery.data;
  const candidate = candidateQuery.data;

  const programTrackLevelLabel = useMemo(() => {
    if (!application) return "—";
    const ptl = (programTrackLevelsQuery.data ?? []).find((p) => p.id === application.programTrackLevelId);
    if (!ptl) return "—";
    const track = (programTracksQuery.data ?? []).find((t) => t.id === ptl.programTrackId);
    const level = (academicLevelsQuery.data ?? []).find((l) => l.id === ptl.academicLevelId);
    return `${track?.name ?? "—"} — ${level?.label ?? "—"}`;
  }, [application, programTrackLevelsQuery.data, programTracksQuery.data, academicLevelsQuery.data]);

  const currentStageName = useMemo(() => {
    if (!application) return "—";
    return (funnelStagesQuery.data ?? []).find((s) => s.id === application.currentStageId)?.name ?? "—";
  }, [application, funnelStagesQuery.data]);

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);
  const canViewHistory = hasPermission(permissionSet, "candidate_applications:history");
  const canCreateNote = hasPermission(permissionSet, "candidate_notes:create");
  const canViewAudit = hasPermission(permissionSet, "candidate_application_audit:read");

  if (!isHydrated || !accessToken || isTokenExpired(accessToken)) {
    return null;
  }

  return (
    <div className="admin-typography min-h-screen bg-background text-foreground md:h-screen md:overflow-hidden">
      <AppSidebar />

      <div className="pb-20 md:flex md:h-full md:flex-col md:pb-0 md:pl-22.5">
        <AdminTopBar />

        <main className="w-full space-y-5 px-3 py-4 pb-24 md:flex md:min-h-0 md:flex-1 md:flex-col md:space-y-6 md:px-8 md:py-8 md:pb-8">
          <Breadcrumbs
            items={[
              { label: locale === "fr" ? "Candidats" : "Candidates" },
              { label: candidate ? `${candidate.firstName} ${candidate.lastName}` : (locale === "fr" ? "Candidat" : "Candidate") },
              { label: locale === "fr" ? "Candidature" : "Application" },
            ]}
            onNavigate={(_tab, stepsBack) => {
              for (let i = 0; i < stepsBack; i++) router.back();
            }}
          />

          <MobileSectionTabs permissionSet={permissionSet} />

          <Card className="border-border/60 bg-card/70 shadow-sm">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
                  <ClipboardList className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl md:text-3xl">
                    {applicationQuery.isLoading
                      ? (locale === "fr" ? "Chargement..." : "Loading...")
                      : programTrackLevelLabel}
                  </CardTitle>
                  {candidate && (
                    <CardDescription>
                      {candidate.firstName} {candidate.lastName} • <span className="font-mono">{candidate.candidatePhone}</span>
                    </CardDescription>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 p-1.5">
                <AppTooltip content={locale === "fr" ? "Retour" : "Back"}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
                    onClick={() => router.back()}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </AppTooltip>
                {application && (
                  <>
                    <Badge variant="outline">{currentStageName}</Badge>
                    <Badge variant={statusBadgeVariant(application.status)}>{statusLabel(application.status, locale)}</Badge>
                  </>
                )}
              </div>
            </CardHeader>
          </Card>

          {applicationQuery.isLoading ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-muted-foreground">{locale === "fr" ? "Chargement..." : "Loading..."}</CardContent>
            </Card>
          ) : applicationQuery.isError ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-destructive">{locale === "fr" ? "Impossible de charger la candidature." : "Could not load the application."}</CardContent>
            </Card>
          ) : !application ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-muted-foreground">{locale === "fr" ? "Candidature introuvable." : "Application not found."}</CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="history" className="md:flex md:min-h-0 md:flex-1 md:flex-col">
              <TabsList className="md:shrink-0">
                <TabsTrigger value="history">
                  <History className="h-4 w-4" />
                  {locale === "fr" ? "Historique" : "History"}
                </TabsTrigger>
                <TabsTrigger value="notes">
                  <Workflow className="h-4 w-4" />
                  {locale === "fr" ? "Notes" : "Notes"}
                </TabsTrigger>
                {canViewAudit && (
                  <TabsTrigger value="audit">
                    <ShieldCheck className="h-4 w-4" />
                    {locale === "fr" ? "Audit" : "Audit"}
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="history" className="md:min-h-0 md:flex-1 md:overflow-y-auto">
                <HistoryTab
                  accessToken={accessToken}
                  locale={locale}
                  establishmentId={establishmentId}
                  application={application}
                  canViewHistory={canViewHistory}
                />
              </TabsContent>

              <TabsContent value="notes" className="md:min-h-0 md:flex-1 md:overflow-y-auto">
                <NotesTab
                  accessToken={accessToken}
                  locale={locale}
                  establishmentId={establishmentId}
                  candidateId={candidateId}
                  candidateApplicationId={applicationId}
                  canCreate={canCreateNote}
                />
              </TabsContent>

              {canViewAudit && (
                <TabsContent value="audit" className="md:min-h-0 md:flex-1 md:overflow-y-auto">
                  <AuditTab
                    accessToken={accessToken}
                    locale={locale}
                    establishmentId={establishmentId}
                    candidateApplicationId={applicationId}
                  />
                </TabsContent>
              )}
            </Tabs>
          )}
        </main>
      </div>
    </div>
  );
}
