"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Contact, MessageCircle, Pencil, Power, Trash2, User, Workflow } from "lucide-react";
import { api } from "@/lib/api";
import { useDashboardStore } from "@/store/dashboard-store";
import { buildPermissionSet, hasPermission } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast-provider";
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
import { COUNTRIES_BY_CODE } from "@/lib/countries";
import type { CandidateGender, WhatsappTarget } from "@/lib/types";
import { ApplicationsTab } from "./applications-tab";
import { ConversationsTab } from "./conversations-tab";

function formatDate(value: string, locale: "fr" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatDateOnly(value: string | undefined, locale: "fr" | "en") {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { dateStyle: "long" }).format(date);
}

export default function CandidateDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { accessToken, locale, loadTokensFromStorage, setActiveTab } = useDashboardStore();
  const [isHydrated, setIsHydrated] = useState(false);

  const candidateId = useMemo(() => {
    const rawId = params?.id;
    return Array.isArray(rawId) ? rawId[0] : rawId ?? "";
  }, [params]);

  const establishmentId = searchParams?.get("establishmentId") ?? "";

  const { toast } = useToast();

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
    queryKey: ["candidate-detail", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);
  const canReadAcquisitionChannels = hasPermission(permissionSet, "acquisition_channels:list");
  const canReadEntryDiplomas = hasPermission(permissionSet, "entry_diplomas:list");

  const candidateQuery = useQuery({
    queryKey: ["candidate", "detail", accessToken, establishmentId, candidateId],
    queryFn: () => api.candidates.get(accessToken, candidateId, establishmentId),
    enabled: Boolean(accessToken && candidateId && establishmentId),
  });

  const candidate = candidateQuery.data;

  const acquisitionChannelsQuery = useQuery({
    queryKey: ["config", "acquisition-channels", accessToken, establishmentId],
    queryFn: () => api.configuration.acquisitionChannels.list(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId && canReadAcquisitionChannels),
  });

  const entryDiplomasQuery = useQuery({
    queryKey: ["config", "entry-diplomas", accessToken, establishmentId],
    queryFn: () => api.configuration.entryDiplomas.list(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId && canReadEntryDiplomas),
  });

  const acquisitionChannel = useMemo(
    () => (acquisitionChannelsQuery.data ?? []).find((ch) => ch.id === candidate?.acquisitionChannelId),
    [acquisitionChannelsQuery.data, candidate],
  );

  const entryDiploma = useMemo(
    () => (entryDiplomasQuery.data ?? []).find((d) => d.id === candidate?.entryDiplomaId),
    [entryDiplomasQuery.data, candidate],
  );

  const eligibleLevelsQuery = useQuery({
    queryKey: ["candidate", "eligible-levels", accessToken, establishmentId, candidateId],
    queryFn: () => api.candidates.listEligibleProgramTrackLevels(accessToken, candidateId, establishmentId),
    enabled: Boolean(accessToken && candidateId && establishmentId),
  });

  const establishmentQuery = useQuery({
    queryKey: ["candidate-detail", "establishment", accessToken, establishmentId],
    queryFn: () => api.configuration.establishments.get(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId),
  });

  const canUpdate = hasPermission(permissionSet, "candidates:update");
  const canToggleStatus = hasPermission(permissionSet, "candidates:activate") || hasPermission(permissionSet, "candidates:deactivate");
  const canDelete = hasPermission(permissionSet, "candidates:delete");
  const canCreateApplication = hasPermission(permissionSet, "candidate_applications:create");
  const canTransitionApplication = hasPermission(permissionSet, "candidate_applications:transition");
  const canViewApplicationHistory = hasPermission(permissionSet, "candidate_applications:history");
  const isEstablishmentCreator = Boolean(
    currentUserQuery.data?.id && establishmentQuery.data?.createdByUserId === currentUserQuery.data.id,
  );
  const canViewConversations = hasPermission(permissionSet, "candidate_conversations:list") && isEstablishmentCreator;
  const canSendConversationMessage = hasPermission(permissionSet, "candidate_conversations:send_message") && isEstablishmentCreator;
  const canCreateConversation = hasPermission(permissionSet, "candidate_conversations:create") && isEstablishmentCreator;

  const activateMutation = useMutation({
    mutationFn: () => api.candidates.activate(accessToken, candidateId, establishmentId),
    onSuccess: () => candidateQuery.refetch(),
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => api.candidates.deactivate(accessToken, candidateId, establishmentId),
    onSuccess: () => candidateQuery.refetch(),
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.candidates.delete(accessToken, candidateId, establishmentId),
    onSuccess: () => {
      toast({ variant: "success", title: locale === "fr" ? "Candidat archivé" : "Candidate archived" });
      router.push(`/dashboard/candidates?establishmentId=${establishmentId}`);
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const genderLabel = (gender?: CandidateGender) => {
    switch (gender) {
      case "MALE": return locale === "fr" ? "Masculin" : "Male";
      case "FEMALE": return locale === "fr" ? "Féminin" : "Female";
      default: return locale === "fr" ? "Non précisé" : "Unspecified";
    }
  };

  const whatsappTargetLabel = (target: WhatsappTarget) => {
    switch (target) {
      case "PARENT_1": return locale === "fr" ? "Parent 1" : "Parent 1";
      case "PARENT_2": return locale === "fr" ? "Parent 2" : "Parent 2";
      case "CANDIDATE": return locale === "fr" ? "Candidat" : "Candidate";
      default: return target;
    }
  };

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
              { label: locale === "fr" ? "Liste des candidats" : "Candidates list" },
              { label: locale === "fr" ? "Détail" : "Detail" },
            ]}
            onNavigate={(_tab, stepsBack) => {
              for (let i = 0; i < stepsBack; i++) router.back();
            }}
          />

          <MobileSectionTabs permissionSet={permissionSet} />

          {/* Header card */}
          <Card className="border-border/60 bg-card/70 shadow-sm">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
                  <Contact className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl md:text-3xl">
                    {candidateQuery.isLoading
                      ? (locale === "fr" ? "Chargement..." : "Loading...")
                      : candidate
                        ? `${candidate.firstName} ${candidate.lastName}`
                        : (locale === "fr" ? "Candidat" : "Candidate")}
                  </CardTitle>
                  {candidate && (
                    <CardDescription>
                      <span className="font-mono">{candidate.candidatePhone}</span>
                      {candidate.email ? ` • ${candidate.email}` : ""}
                    </CardDescription>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 p-1.5">
                <AppTooltip content={locale === "fr" ? "Retour à la liste" : "Back to list"}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
                    onClick={() => router.back()}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </AppTooltip>
                {canToggleStatus && candidate && (
                  <AppTooltip content={candidate.status === "ACTIVE" ? (locale === "fr" ? "Archiver" : "Archive") : (locale === "fr" ? "Activer" : "Activate")}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
                      onClick={() => candidate.status === "ACTIVE" ? deactivateMutation.mutate() : activateMutation.mutate()}
                      disabled={activateMutation.isPending || deactivateMutation.isPending}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </AppTooltip>
                )}
                {canUpdate && candidate && (
                  <AppTooltip content={locale === "fr" ? "Modifier" : "Edit"}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
                      onClick={() => router.push(`/dashboard/candidates?establishmentId=${establishmentId}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </AppTooltip>
                )}
                {canDelete && candidate && (
                  <AppTooltip content={locale === "fr" ? "Supprimer" : "Delete"}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (window.confirm(locale === "fr" ? "Confirmer l'archivage de ce candidat ?" : "Confirm archiving this candidate?")) {
                          deleteMutation.mutate();
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AppTooltip>
                )}
                {candidate && (
                  <Badge variant={candidate.status === "ACTIVE" ? "success" : "outline"}>
                    {candidate.status === "ACTIVE" ? (locale === "fr" ? "Actif" : "Active") : (locale === "fr" ? "Archivé" : "Archived")}
                  </Badge>
                )}
              </div>
            </CardHeader>
          </Card>

          {candidateQuery.isLoading ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-muted-foreground">{locale === "fr" ? "Chargement..." : "Loading..."}</CardContent>
            </Card>
          ) : candidateQuery.isError ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-destructive">{locale === "fr" ? "Impossible de charger la fiche." : "Could not load the record."}</CardContent>
            </Card>
          ) : !candidate ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-muted-foreground">{locale === "fr" ? "Candidat introuvable." : "Candidate not found."}</CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="personal" className="md:flex md:min-h-0 md:flex-1 md:flex-col">
              <TabsList className="md:shrink-0">
                <TabsTrigger value="personal">
                  <User className="h-4 w-4" />
                  {locale === "fr" ? "Informations personnelles" : "Personal information"}
                </TabsTrigger>
                <TabsTrigger value="applications">
                  <Workflow className="h-4 w-4" />
                  {locale === "fr" ? "Applications" : "Applications"}
                </TabsTrigger>
                {canViewConversations && (
                  <TabsTrigger value="conversations">
                    <MessageCircle className="h-4 w-4" />
                    {locale === "fr" ? "Conversations" : "Conversations"}
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="personal" className="md:min-h-0 md:flex-1 md:overflow-y-auto">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="grid gap-6">
                {/* Contact panel */}
                <Card className="border-border/60 bg-card/70">
                  <CardHeader>
                    <CardTitle className="text-base">{locale === "fr" ? "Coordonnées" : "Contact information"}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">{locale === "fr" ? "Téléphone candidat" : "Candidate phone"}</p>
                      <p className="mt-1 font-mono text-sm">{candidate.candidatePhone}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="mt-1 text-sm">{candidate.email || "—"}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">{locale === "fr" ? "Téléphone parent 1" : "Parent phone 1"}</p>
                      <p className="mt-1 font-mono text-sm">{candidate.parentPhone1 || "—"}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">{locale === "fr" ? "Téléphone parent 2" : "Parent phone 2"}</p>
                      <p className="mt-1 font-mono text-sm">{candidate.parentPhone2 || "—"}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3 sm:col-span-2">
                      <p className="text-xs text-muted-foreground">{locale === "fr" ? "Cible WhatsApp préférée" : "Preferred WhatsApp target"}</p>
                      <p className="mt-1 text-sm">{whatsappTargetLabel(candidate.preferredWhatsappTarget)}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Profile panel */}
                <Card className="border-border/60 bg-card/70">
                  <CardHeader>
                    <CardTitle className="text-base">{locale === "fr" ? "Profil" : "Profile"}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">{locale === "fr" ? "Genre" : "Gender"}</p>
                      <div className="mt-1.5"><Badge variant="outline">{genderLabel(candidate.gender)}</Badge></div>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">{locale === "fr" ? "Date de naissance" : "Date of birth"}</p>
                      <p className="mt-1 text-sm">{formatDateOnly(candidate.dateOfBirth, locale)}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">{locale === "fr" ? "Canal d'acquisition" : "Acquisition channel"}</p>
                      <p className="mt-1 text-sm">{acquisitionChannel ? `${acquisitionChannel.code} — ${acquisitionChannel.name}` : "—"}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">{locale === "fr" ? "Diplôme d'entrée" : "Entry diploma"}</p>
                      <p className="mt-1 text-sm">{entryDiploma ? `${entryDiploma.code} — ${entryDiploma.label}` : "—"}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">{locale === "fr" ? "École précédente" : "Previous school"}</p>
                      <p className="mt-1 text-sm">{candidate.previousSchool || "—"}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Address panel */}
                <Card className="border-border/60 bg-card/70">
                  <CardHeader>
                    <CardTitle className="text-base">{locale === "fr" ? "Adresse" : "Address"}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3 sm:col-span-3">
                      <p className="text-xs text-muted-foreground">{locale === "fr" ? "Adresse" : "Address"}</p>
                      <p className="mt-1 text-sm">{candidate.addressLine || "—"}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                      <p className="text-xs text-muted-foreground">{locale === "fr" ? "Ville" : "City"}</p>
                      <p className="mt-1 text-sm">{candidate.city || "—"}</p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3 sm:col-span-2">
                      <p className="text-xs text-muted-foreground">{locale === "fr" ? "Pays" : "Country"}</p>
                      <p className="mt-1 text-sm">
                        {candidate.country
                          ? (COUNTRIES_BY_CODE.find((c) => c.code === candidate.country)?.name ?? candidate.country)
                          : "—"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Observations */}
                {candidate.observations && (
                  <Card className="border-border/60 bg-card/70">
                    <CardHeader>
                      <CardTitle className="text-base">Observations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{candidate.observations}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Eligible program track levels */}
                <Card className="border-border/60 bg-card/70">
                  <CardHeader>
                    <CardTitle className="text-base">{locale === "fr" ? "Filières / niveaux éligibles" : "Eligible program tracks / levels"}</CardTitle>
                    <CardDescription>
                      {locale === "fr"
                        ? "En fonction du diplôme d'entrée du candidat."
                        : "Based on the candidate's entry diploma."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {eligibleLevelsQuery.isLoading ? (
                      <p className="text-sm text-muted-foreground">{locale === "fr" ? "Chargement..." : "Loading..."}</p>
                    ) : eligibleLevelsQuery.isError ? (
                      <p className="text-sm text-destructive">{locale === "fr" ? "Erreur de chargement." : "Error loading data."}</p>
                    ) : (eligibleLevelsQuery.data ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">{locale === "fr" ? "Aucune filière éligible." : "No eligible program track."}</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {(eligibleLevelsQuery.data ?? []).map((lvl) => (
                          <div key={lvl.programTrackLevelId} className="rounded-lg border border-border/70 bg-background/70 p-3">
                            <p className="text-sm font-medium">{lvl.programTrackName}</p>
                            <p className="text-xs text-muted-foreground">{lvl.academicLevelLabel}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Info panel */}
              <Card className="border-border/60 bg-card/70">
                <CardHeader>
                  <CardTitle className="text-base">{locale === "fr" ? "Informations" : "Information"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Statut" : "Status"}</p>
                    <div className="mt-1.5">
                      <Badge variant={candidate.status === "ACTIVE" ? "success" : "outline"}>
                        {candidate.status === "ACTIVE" ? (locale === "fr" ? "Actif" : "Active") : (locale === "fr" ? "Archivé" : "Archived")}
                      </Badge>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Créé le" : "Created at"}</p>
                    <p className="mt-1 text-xs">{formatDate(candidate.createdAt, locale)}</p>
                    {candidate.createdByLabel && <p className="mt-0.5 text-xs text-muted-foreground">{candidate.createdByLabel}</p>}
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{locale === "fr" ? "Modifié le" : "Updated at"}</p>
                    <p className="mt-1 text-xs">{formatDate(candidate.updatedAt, locale)}</p>
                    {candidate.updatedByLabel && <p className="mt-0.5 text-xs text-muted-foreground">{candidate.updatedByLabel}</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
              </TabsContent>

              <TabsContent value="applications" className="md:min-h-0 md:flex-1 md:overflow-y-auto">
                <ApplicationsTab
                  accessToken={accessToken}
                  locale={locale}
                  candidateId={candidateId}
                  establishmentId={establishmentId}
                  canCreate={canCreateApplication}
                  canTransition={canTransitionApplication}
                  canViewHistory={canViewApplicationHistory}
                />
              </TabsContent>

              {canViewConversations && (
                <TabsContent value="conversations" className="md:min-h-0 md:flex-1 md:overflow-y-auto">
                  <ConversationsTab
                    accessToken={accessToken}
                    locale={locale}
                    candidateId={candidateId}
                    establishmentId={establishmentId}
                    candidate={candidate}
                    canSendMessage={canSendConversationMessage}
                    canCreateConversation={canCreateConversation}
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
