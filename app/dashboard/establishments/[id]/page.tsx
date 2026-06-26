"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, ImagePlus, LayoutDashboard, Mail, MapPin, Pencil, Phone, Save, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useDashboardStore } from "@/store/dashboard-store";
import { AppSidebar } from "@/components/app-sidebar";
import { AdminTopBar } from "@/components/dashboard/admin-top-bar";
import { AppTooltip } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { COUNTRIES_BY_CODE, CITIES_BY_COUNTRY } from "@/lib/countries";
import { phonePrefixes } from "@/lib/phone-prefixes";
import type { UpdateEstablishmentRequest } from "@/lib/types";
import { EntryDiplomasSection } from "@/components/dashboard/config-sections/entry-diplomas-section";
import { AcademicLevelsSection } from "@/components/dashboard/config-sections/academic-levels-section";
import { ProgramTracksSection } from "@/components/dashboard/config-sections/program-tracks-section";
import { ProgramTrackLevelsSection } from "@/components/dashboard/config-sections/program-track-levels-section";
import { AcquisitionChannelsSection } from "@/components/dashboard/config-sections/acquisition-channels-section";
import { FunnelStagesSection } from "@/components/dashboard/config-sections/funnel-stages-section";
import { FunnelStageTransitionsSection } from "@/components/dashboard/config-sections/funnel-stage-transitions-section";
import { WhatsappConfigSection } from "@/components/dashboard/config-sections/whatsapp-config-section";

function formatDate(value: string, locale: "fr" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function computeInitials(primary: string, fallback?: string): string {
  const pickInitialsFromSource = (source: string) => {
    const normalized = source.trim();
    if (!normalized) {
      return "";
    }

    const localPart = normalized.includes("@") ? normalized.split("@")[0] : normalized;
    const tokens = localPart
      .split(/[\s._-]+/)
      .filter(Boolean)
      .map((token) => token.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, ""))
      .filter(Boolean);

    if (tokens.length >= 2) {
      return `${tokens[0][0]}${tokens[1][0]}`.toUpperCase();
    }

    if (tokens.length === 1) {
      return tokens[0].slice(0, 2).toUpperCase();
    }

    return "";
  };

  return pickInitialsFromSource(primary) || pickInitialsFromSource(fallback ?? "") || "ET";
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Impossible de lire le fichier logo"));
    reader.readAsDataURL(file);
  });
}

export default function EstablishmentDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { accessToken, locale, loadTokensFromStorage, setActiveTab } = useDashboardStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [configTab, setConfigTab] = useState("entry-diplomas");
  const [formError, setFormError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [formState, setFormState] = useState({
    name: "",
    shortName: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    country: "",
    whatsappPhonePrefix: "+237",
    whatsappPhone: "",
    otherPhonePrefix: "+237",
    otherPhone: "",
  });

  const establishmentId = useMemo(() => {
    const rawId = params?.id;
    return Array.isArray(rawId) ? rawId[0] : rawId ?? "";
  }, [params]);

  useEffect(() => {
    loadTokensFromStorage();
    setActiveTab("config-establishments");
    setIsHydrated(true);
  }, [loadTokensFromStorage, setActiveTab]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!accessToken) {
      router.replace("/login?reason=auth_required");
    }
  }, [accessToken, isHydrated, router]);

  const establishmentQuery = useQuery({
    queryKey: ["establishment", "details", accessToken, establishmentId],
    queryFn: () => api.configuration.establishments.get(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId),
  });

  useEffect(() => {
    const establishment = establishmentQuery.data;
    if (!accessToken || !establishment?.id) {
      setLogoUrl("");
      return;
    }

    let cancelled = false;
    let objectUrl = "";

    api.configuration.establishments.getLogoBlob(accessToken, establishment.id)
      .then((blob) => {
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setLogoUrl(objectUrl);
      })
      .catch(async () => {
        if (cancelled) {
          return;
        }

        const rawPath = establishment.logoUrl?.trim() ?? "";
        if (!rawPath.startsWith("/api/v1/establishments/")) {
          setLogoUrl("");
          return;
        }

        try {
          const pathSegments = rawPath.split("/").filter(Boolean);
          const idFromPath = pathSegments[3] ?? establishment.id;
          const fallbackBlob = await api.configuration.establishments.getLogoBlob(accessToken, idFromPath);
          if (cancelled) {
            return;
          }
          objectUrl = URL.createObjectURL(fallbackBlob);
          setLogoUrl(objectUrl);
        } catch {
          if (!cancelled) {
            setLogoUrl("");
          }
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [accessToken, establishmentQuery.data?.id]);

  useEffect(() => {
    if (!editOpen || !accessToken || !establishmentQuery.data?.id || logoFile) {
      return;
    }

    let cancelled = false;
    let objectUrl = "";

    api.configuration.establishments.getLogoBlob(accessToken, establishmentQuery.data.id)
      .then((blob) => {
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setLogoPreview(objectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setLogoPreview("");
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [accessToken, editOpen, establishmentQuery.data?.id, logoFile]);

  const labels = locale === "fr"
    ? {
        title: "Fiche etablissement",
        subtitle: "Consultation des informations de l'etablissement.",
        back: "Retour au dashboard",
        loading: "Chargement...",
        loadError: "Impossible de charger la fiche.",
        notFound: "Etablissement introuvable.",
        status: "Statut",
        code: "Code",
        shortName: "Nom court",
        fullName: "Nom",
        email: "Email",
        whatsapp: "WhatsApp",
        otherPhone: "Autre contact",
        country: "Pays",
        city: "Ville",
        address1: "Adresse ligne 1",
        address2: "Adresse ligne 2",
        createdAt: "Cree le",
        updatedAt: "Modifie le",
        active: "Actif",
        inactive: "Inactif",
        noData: "-",
      }
    : {
        title: "Establishment profile",
        subtitle: "Read-only establishment details.",
        back: "Back to dashboard",
        loading: "Loading...",
        loadError: "Could not load the profile.",
        notFound: "Establishment not found.",
        status: "Status",
        code: "Code",
        shortName: "Short name",
        fullName: "Name",
        email: "Email",
        whatsapp: "WhatsApp",
        otherPhone: "Other contact",
        country: "Country",
        city: "City",
        address1: "Address line 1",
        address2: "Address line 2",
        createdAt: "Created at",
        updatedAt: "Updated at",
        active: "Active",
        inactive: "Inactive",
        noData: "-",
      };

  const establishment = establishmentQuery.data;
  const establishmentInitials = computeInitials(
    `${establishment?.shortName ?? ""} ${establishment?.name ?? ""}`.trim(),
    establishment?.code,
  );

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!establishment?.id) {
        throw new Error(locale === "fr" ? "Etablissement introuvable." : "Establishment not found.");
      }

      const payload: UpdateEstablishmentRequest = {
        name: formState.name.trim(),
        shortName: formState.shortName.trim() || undefined,
        status: formState.status,
        email: formState.email.trim() || undefined,
        addressLine1: formState.addressLine1.trim() || undefined,
        addressLine2: formState.addressLine2.trim() || undefined,
        city: formState.city || undefined,
        country: formState.country || undefined,
        whatsappPhonePrefix: formState.whatsappPhone ? formState.whatsappPhonePrefix : undefined,
        whatsappPhone: formState.whatsappPhone.trim() || undefined,
        otherPhonePrefix: formState.otherPhone ? formState.otherPhonePrefix : undefined,
        otherPhone: formState.otherPhone.trim() || undefined,
      };

      let updated = await api.configuration.establishments.update(accessToken, establishment.id, payload);
      if (logoFile) {
        updated = await api.configuration.establishments.uploadLogo(accessToken, establishment.id, logoFile);
      }

      return updated;
    },
    onSuccess: async () => {
      await establishmentQuery.refetch();
      setEditOpen(false);
      setFormError(null);
      setLogoFile(null);
      setLogoPreview("");
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    },
    onError: (error) => {
      setFormError((error as Error).message);
    },
  });

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: locale === "fr" ? "Configuration" : "Configuration", tab: "settings-configuration" },
    { label: locale === "fr" ? "Etablissements" : "Establishments", tab: "config-establishments" },
    { label: establishment?.code ?? (locale === "fr" ? "Fiche" : "Profile") },
  ];

  const handleBreadcrumbNavigation = (_tab: string, stepsBack: number) => {
    window.history.go(-stepsBack);
  };

  const goBackToEstablishments = () => {
    router.back();
  };

  const openEditDialog = () => {
    if (!establishment) {
      return;
    }

    setFormState({
      name: establishment.name ?? "",
      shortName: establishment.shortName ?? "",
      status: establishment.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      email: establishment.email ?? "",
      addressLine1: establishment.addressLine1 ?? "",
      addressLine2: establishment.addressLine2 ?? "",
      city: establishment.city ?? "",
      country: establishment.country ?? "",
      whatsappPhonePrefix: establishment.whatsappPhonePrefix ?? "+237",
      whatsappPhone: establishment.whatsappPhone ?? "",
      otherPhonePrefix: establishment.otherPhonePrefix ?? "+237",
      otherPhone: establishment.otherPhone ?? "",
    });
    setFormError(null);
    setLogoFile(null);
    setLogoPreview("");
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
    setEditOpen(true);
  };

  const selectLogoFile = () => {
    logoInputRef.current?.click();
  };

  const onLogoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const normalizedType = file.type.toLowerCase();
    if (!normalizedType.startsWith("image/")) {
      setFormError(locale === "fr" ? "Le logo doit etre une image." : "Logo must be an image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError(locale === "fr" ? "Le logo ne doit pas depasser 5 Mo." : "Logo must not exceed 5 MB.");
      event.target.value = "";
      return;
    }

    void readFileAsDataUrl(file)
      .then((dataUrl) => {
        setLogoFile(file);
        setLogoPreview(dataUrl);
        setFormError(null);
      })
      .catch((error) => {
        setFormError((error as Error).message);
      });
  };

  const clearSelectedLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

  if (!isHydrated || !accessToken) {
    return null;
  }

  return (
    <div className="admin-typography min-h-screen bg-background text-foreground">
      <AppSidebar />

      <div className="pb-20 md:pb-0 md:pl-22.5">
        <AdminTopBar />

        <main className="w-full space-y-5 px-3 py-4 pb-24 md:space-y-6 md:px-8 md:py-8 md:pb-8">
          <Breadcrumbs items={breadcrumbItems} onNavigate={handleBreadcrumbNavigation} />

          <Card className="border-border/60 bg-card/70 shadow-sm">
            <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-2xl md:text-3xl">{labels.title}</CardTitle>
                <CardDescription>{labels.subtitle}</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 p-1.5">
                <AppTooltip content={locale === "fr" ? "Retour" : "Back"}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
                    onClick={goBackToEstablishments}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </AppTooltip>
                <AppTooltip content={locale === "fr" ? "Modifier la fiche" : "Edit profile"}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground"
                    onClick={openEditDialog}
                    disabled={!establishment}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </AppTooltip>
                <Badge className="w-fit" variant="outline">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  {locale === "fr" ? "Section: Etablissements" : "Section: Establishments"}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {establishmentQuery.isLoading ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-muted-foreground">{labels.loading}</CardContent>
            </Card>
          ) : establishmentQuery.isError ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-destructive">{labels.loadError}</CardContent>
            </Card>
          ) : !establishment ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="py-8 text-sm text-muted-foreground">{labels.notFound}</CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <Card className="border-border/60 bg-card/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4" />
                    {establishment.code}
                  </CardTitle>
                  <CardDescription>{establishment.name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Badge variant={(establishment.status ?? "ACTIVE") === "INACTIVE" ? "outline" : "success"}>
                    {(establishment.status ?? "ACTIVE") === "INACTIVE" ? labels.inactive : labels.active}
                  </Badge>

                  <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={locale === "fr" ? "Logo etablissement" : "Establishment logo"}
                        className="h-28 w-28 rounded-full border border-border/70 object-cover"
                      />
                    ) : (
                      <div className="flex h-28 w-28 items-center justify-center rounded-full border border-border/70 bg-muted text-lg font-semibold text-foreground">
                        {establishmentInitials}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/70">
                <CardHeader>
                  <CardTitle>{locale === "fr" ? "Informations" : "Information"}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{labels.status}</p>
                    <p className="mt-1 text-sm font-medium">{(establishment.status ?? "ACTIVE") === "INACTIVE" ? labels.inactive : labels.active}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{labels.code}</p>
                    <p className="mt-1 font-mono text-sm">{establishment.code}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{labels.shortName}</p>
                    <p className="mt-1 text-sm">{establishment.shortName || labels.noData}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{labels.fullName}</p>
                    <p className="mt-1 text-sm">{establishment.name || labels.noData}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3 sm:col-span-2">
                    <p className="text-xs text-muted-foreground">{labels.email}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm">
                      <Mail className="h-3.5 w-3.5" />
                      {establishment.email || labels.noData}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{labels.whatsapp}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm">
                      <Phone className="h-3.5 w-3.5" />
                      {[establishment.whatsappPhonePrefix, establishment.whatsappPhone].filter(Boolean).join(" ") || labels.noData}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{labels.otherPhone}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm">
                      <Phone className="h-3.5 w-3.5" />
                      {[establishment.otherPhonePrefix, establishment.otherPhone].filter(Boolean).join(" ") || labels.noData}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{labels.country}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm">
                      <MapPin className="h-3.5 w-3.5" />
                      {establishment.country || labels.noData}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{labels.city}</p>
                    <p className="mt-1 text-sm">{establishment.city || labels.noData}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3 sm:col-span-2">
                    <p className="text-xs text-muted-foreground">{labels.address1}</p>
                    <p className="mt-1 text-sm">{establishment.addressLine1 || labels.noData}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3 sm:col-span-2">
                    <p className="text-xs text-muted-foreground">{labels.address2}</p>
                    <p className="mt-1 text-sm">{establishment.addressLine2 || labels.noData}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{labels.createdAt}</p>
                    <p className="mt-1 text-sm">{formatDate(establishment.createdAt, locale)}</p>
                    {establishment.createdByLabel && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{establishment.createdByLabel}</p>
                    )}
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">{labels.updatedAt}</p>
                    <p className="mt-1 text-sm">{formatDate(establishment.updatedAt, locale)}</p>
                    {establishment.updatedByLabel && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{establishment.updatedByLabel}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {establishment && (
            <Card className="border-border/60 bg-card/70">
              <CardHeader>
                <CardTitle>{locale === "fr" ? "Configuration métier" : "Business configuration"}</CardTitle>
                <CardDescription>
                  {locale === "fr"
                    ? "Pilotez la configuration métier de cet établissement par onglet."
                    : "Manage this establishment's business configuration by tab."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={configTab} onValueChange={setConfigTab}>
                  <TabsList className="w-full md:w-auto">
                    <TabsTrigger value="entry-diplomas">{locale === "fr" ? "Diplômes d'entrée" : "Entry diplomas"}</TabsTrigger>
                    <TabsTrigger value="academic-levels">{locale === "fr" ? "Niveaux académiques" : "Academic levels"}</TabsTrigger>
                    <TabsTrigger value="program-tracks">{locale === "fr" ? "Filières" : "Program tracks"}</TabsTrigger>
                    <TabsTrigger value="program-track-levels">{locale === "fr" ? "Filière × niveau" : "Track × level"}</TabsTrigger>
                    <TabsTrigger value="acquisition-channels">{locale === "fr" ? "Canaux d'acquisition" : "Acquisition channels"}</TabsTrigger>
                    <TabsTrigger value="funnel-stages">{locale === "fr" ? "Étapes du funnel" : "Funnel stages"}</TabsTrigger>
                    <TabsTrigger value="funnel-stage-transitions">{locale === "fr" ? "Transitions du funnel" : "Funnel transitions"}</TabsTrigger>
                    <TabsTrigger value="whatsapp-config">{locale === "fr" ? "WhatsApp Business" : "WhatsApp Business"}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="entry-diplomas">
                    <EntryDiplomasSection accessToken={accessToken} locale={locale} establishmentId={establishmentId} />
                  </TabsContent>
                  <TabsContent value="academic-levels">
                    <AcademicLevelsSection accessToken={accessToken} locale={locale} establishmentId={establishmentId} />
                  </TabsContent>
                  <TabsContent value="program-tracks">
                    <ProgramTracksSection accessToken={accessToken} locale={locale} establishmentId={establishmentId} />
                  </TabsContent>
                  <TabsContent value="program-track-levels">
                    <ProgramTrackLevelsSection accessToken={accessToken} locale={locale} establishmentId={establishmentId} />
                  </TabsContent>
                  <TabsContent value="acquisition-channels">
                    <AcquisitionChannelsSection accessToken={accessToken} locale={locale} establishmentId={establishmentId} />
                  </TabsContent>
                  <TabsContent value="funnel-stages">
                    <FunnelStagesSection accessToken={accessToken} locale={locale} establishmentId={establishmentId} />
                  </TabsContent>
                  <TabsContent value="funnel-stage-transitions">
                    <FunnelStageTransitionsSection accessToken={accessToken} locale={locale} establishmentId={establishmentId} />
                  </TabsContent>
                  <TabsContent value="whatsapp-config">
                    <WhatsappConfigSection accessToken={accessToken} locale={locale} establishmentId={establishmentId} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{locale === "fr" ? "Modifier l'établissement" : "Edit establishment"}</DialogTitle>
            <DialogDescription>
              {locale === "fr"
                ? "Mettez à jour les informations de la fiche établissement."
                : "Update establishment profile information."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Nom" : "Name"}</label>
              <Input
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Nom court" : "Short name"}</label>
              <Input
                value={formState.shortName}
                onChange={(event) => setFormState((current) => ({ ...current, shortName: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Statut" : "Status"}</label>
              <select
                value={formState.status}
                onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value as "ACTIVE" | "INACTIVE" }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="ACTIVE">{locale === "fr" ? "Actif" : "Active"}</option>
                <option value="INACTIVE">{locale === "fr" ? "Inactif" : "Inactive"}</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formState.email}
                onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Pays" : "Country"}</label>
              <SearchableSelect
                options={COUNTRIES_BY_CODE.map((country) => ({
                  value: country.code,
                  label: country.name,
                  keywords: [country.code, country.name],
                }))}
                value={formState.country}
                onValueChange={(value) => setFormState((current) => ({ ...current, country: value, city: "" }))}
                placeholder={locale === "fr" ? "Sélectionner un pays" : "Select a country"}
                searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Ville" : "City"}</label>
              <SearchableSelect
                options={(CITIES_BY_COUNTRY[formState.country] ?? []).map((city) => ({
                  value: city,
                  label: city,
                  keywords: [city],
                }))}
                value={formState.city}
                onValueChange={(value) => setFormState((current) => ({ ...current, city: value }))}
                placeholder={locale === "fr" ? "Sélectionner une ville" : "Select a city"}
                searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                disabled={!formState.country}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Adresse ligne 1" : "Address line 1"}</label>
              <Input
                value={formState.addressLine1}
                onChange={(event) => setFormState((current) => ({ ...current, addressLine1: event.target.value }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Adresse ligne 2" : "Address line 2"}</label>
              <Input
                value={formState.addressLine2}
                onChange={(event) => setFormState((current) => ({ ...current, addressLine2: event.target.value }))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">{locale === "fr" ? "WhatsApp" : "WhatsApp"}</label>
              <div className="flex gap-2">
                <SearchableSelect
                  options={phonePrefixes.map((prefix) => ({
                    value: prefix.value,
                    label: prefix.label,
                    keywords: prefix.keywords,
                  }))}
                  value={formState.whatsappPhonePrefix}
                  onValueChange={(value) => setFormState((current) => ({ ...current, whatsappPhonePrefix: value }))}
                  placeholder={locale === "fr" ? "Indicatif" : "Prefix"}
                  searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                  className="w-40"
                />
                <Input
                  value={formState.whatsappPhone}
                  onChange={(event) => setFormState((current) => ({ ...current, whatsappPhone: event.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Autre contact" : "Other contact"}</label>
              <div className="flex gap-2">
                <SearchableSelect
                  options={phonePrefixes.map((prefix) => ({
                    value: prefix.value,
                    label: prefix.label,
                    keywords: prefix.keywords,
                  }))}
                  value={formState.otherPhonePrefix}
                  onValueChange={(value) => setFormState((current) => ({ ...current, otherPhonePrefix: value }))}
                  placeholder={locale === "fr" ? "Indicatif" : "Prefix"}
                  searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                  className="w-40"
                />
                <Input
                  value={formState.otherPhone}
                  onChange={(event) => setFormState((current) => ({ ...current, otherPhone: event.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Logo" : "Logo"}</label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onLogoFileChange}
              />

              <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectLogoFile}>
                    <ImagePlus className="mr-1.5 h-4 w-4" />
                    {logoFile
                      ? (locale === "fr" ? "Remplacer le fichier" : "Replace file")
                      : (locale === "fr" ? "Choisir un fichier" : "Choose a file")}
                  </Button>

                  {logoFile ? (
                    <Button type="button" variant="ghost" size="sm" onClick={clearSelectedLogo}>
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      {locale === "fr" ? "Retirer" : "Remove"}
                    </Button>
                  ) : null}
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  {locale === "fr"
                    ? "PNG, JPG ou WEBP. Taille maximale: 5 Mo."
                    : "PNG, JPG or WEBP. Max file size: 5 MB."}
                </p>

                {logoFile ? (
                  <p className="mt-2 text-xs text-foreground">{logoFile.name}</p>
                ) : null}

                {logoPreview ? (
                  <div className="mt-3">
                    <img
                      src={logoPreview}
                      alt={locale === "fr" ? "Apercu du logo" : "Logo preview"}
                      className="h-20 w-20 rounded-md border border-border/70 bg-background object-cover"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {locale === "fr" ? "Annuler" : "Cancel"}
            </Button>
            <Button
              onClick={() => {
                if (formState.name.trim().length === 0) {
                  setFormError(locale === "fr" ? "Le nom est obligatoire." : "Name is required.");
                  return;
                }
                void updateMutation.mutateAsync();
              }}
              disabled={updateMutation.isPending}
            >
              <Save className="mr-1.5 h-4 w-4" />
              {updateMutation.isPending
                ? (locale === "fr" ? "Enregistrement..." : "Saving...")
                : (locale === "fr" ? "Enregistrer" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
