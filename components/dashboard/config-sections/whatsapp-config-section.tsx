"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Copy, MessageCircle, RefreshCcw, Save } from "lucide-react";
import { api } from "@/lib/api";
import { buildPermissionSet, hasPermission } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast-provider";
import { AppTooltip } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import type { WhatsappConnectionStatus } from "@/lib/types";

export function WhatsappConfigSection({
  accessToken,
  locale,
  establishmentId,
}: {
  accessToken: string;
  locale: "fr" | "en";
  establishmentId: string;
}) {
  const { toast } = useToast();

  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState("");
  const [accessTokenInput, setAccessTokenInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ["whatsapp-config", "current-user", accessToken],
    queryFn: () => api.users.getMe(accessToken),
    enabled: Boolean(accessToken),
  });

  const permissionSet = useMemo(() => buildPermissionSet(currentUserQuery.data ?? null), [currentUserQuery.data]);
  const canRead = hasPermission(permissionSet, "establishment_whatsapp_config:read");
  const canUpdate = hasPermission(permissionSet, "establishment_whatsapp_config:update");

  const query = useQuery({
    queryKey: ["whatsapp-config", accessToken, establishmentId],
    queryFn: () => api.configuration.whatsappConfig.get(accessToken, establishmentId),
    enabled: Boolean(accessToken && establishmentId && canRead),
  });

  const config = query.data;

  useEffect(() => {
    if (!config) return;
    setWabaId(config.wabaId ?? "");
    setPhoneNumberId(config.phoneNumberId ?? "");
    setDisplayPhoneNumber(config.displayPhoneNumber ?? "");
    setAccessTokenInput("");
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.configuration.whatsappConfig.update(accessToken, establishmentId, {
        wabaId: wabaId.trim() || undefined,
        phoneNumberId: phoneNumberId.trim() || undefined,
        displayPhoneNumber: displayPhoneNumber.trim() || undefined,
        accessToken: accessTokenInput.trim() || undefined,
      }),
    onSuccess: async () => {
      setAccessTokenInput("");
      setFormError(null);
      await query.refetch();
      toast({ variant: "success", title: t.saveSuccess });
    },
    onError: (err) => setFormError((err as Error).message),
  });

  const webhookUrl = useMemo(() => {
    const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
    return `${apiBaseUrl}/api/v1/webhooks/whatsapp`;
  }, []);

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ variant: "success", title: locale === "fr" ? `${label} copié` : `${label} copied` });
    } catch {
      toast({ variant: "error", title: locale === "fr" ? "Copie impossible" : "Copy failed" });
    }
  };

  const t = {
    title: locale === "fr" ? "WhatsApp Business" : "WhatsApp Business",
    subtitle: locale === "fr"
      ? "Connectez le numero WhatsApp Business de cet etablissement pour activer les echanges avec les candidats."
      : "Connect this establishment's WhatsApp Business number to enable exchanges with candidates.",
    refresh: locale === "fr" ? "Actualiser" : "Refresh",
    statusLabel: locale === "fr" ? "Statut de connexion" : "Connection status",
    wabaIdLabel: "WABA ID",
    phoneNumberIdLabel: "Phone Number ID",
    displayPhoneNumberLabel: locale === "fr" ? "Numéro affiché" : "Display phone number",
    accessTokenLabel: locale === "fr" ? "Token d'accès" : "Access token",
    accessTokenConfigured: locale === "fr" ? "Un token est déjà enregistré (chiffré, non affiché)." : "A token is already saved (encrypted, never displayed).",
    accessTokenPlaceholder: locale === "fr" ? "Laisser vide pour ne pas modifier" : "Leave empty to keep unchanged",
    webhookSectionTitle: locale === "fr" ? "Configuration du webhook Meta" : "Meta webhook configuration",
    webhookSectionDescription: locale === "fr"
      ? "Renseignez ces deux valeurs dans le tableau de bord Meta (Configuration > Webhooks) pour recevoir les réponses des candidats."
      : "Enter these two values in the Meta dashboard (Configuration > Webhooks) to receive candidate replies.",
    webhookUrlLabel: locale === "fr" ? "URL de webhook" : "Webhook URL",
    webhookVerifyTokenLabel: locale === "fr" ? "Token de vérification" : "Verify token",
    save: locale === "fr" ? "Enregistrer" : "Save",
    saving: locale === "fr" ? "Enregistrement..." : "Saving...",
    saveSuccess: locale === "fr" ? "Configuration WhatsApp enregistrée" : "WhatsApp configuration saved",
    loadError: locale === "fr" ? "Impossible de charger la configuration WhatsApp." : "Could not load the WhatsApp configuration.",
    noPermission: locale === "fr" ? "Vous n'avez pas la permission de consulter cette configuration." : "You do not have permission to view this configuration.",
    copy: locale === "fr" ? "Copier" : "Copy",
  };

  const statusLabel = (status: WhatsappConnectionStatus) => {
    switch (status) {
      case "ACTIVE": return locale === "fr" ? "Active" : "Active";
      case "PENDING_VERIFICATION": return locale === "fr" ? "En attente de vérification" : "Pending verification";
      case "ERROR": return locale === "fr" ? "Erreur" : "Error";
      default: return locale === "fr" ? "Non configurée" : "Not configured";
    }
  };

  const statusVariant = (status: WhatsappConnectionStatus): "success" | "warning" | "danger" | "outline" => {
    switch (status) {
      case "ACTIVE": return "success";
      case "PENDING_VERIFICATION": return "warning";
      case "ERROR": return "danger";
      default: return "outline";
    }
  };

  if (!canRead) {
    return (
      <Card className="border-border/60 bg-card/70">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">{t.noPermission}</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="border-border/60 bg-card/70">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <CardTitle>{t.title}</CardTitle>
              <CardDescription>{t.subtitle}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config && (
              <Badge variant={statusVariant(config.connectionStatus)}>{statusLabel(config.connectionStatus)}</Badge>
            )}
            <AppTooltip content={t.refresh}>
              <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground" onClick={() => void query.refetch()} disabled={query.isFetching}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </AppTooltip>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {query.isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{locale === "fr" ? "Chargement…" : "Loading…"}</p>
          ) : query.isError ? (
            <p className="py-8 text-center text-sm text-destructive">{t.loadError}</p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.wabaIdLabel}</label>
                  <Input value={wabaId} onChange={(e) => setWabaId(e.target.value)} disabled={!canUpdate} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.phoneNumberIdLabel}</label>
                  <Input value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} disabled={!canUpdate} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">{t.displayPhoneNumberLabel}</label>
                  <Input value={displayPhoneNumber} onChange={(e) => setDisplayPhoneNumber(e.target.value)} placeholder="+237 6XX XXX XXX" disabled={!canUpdate} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">{t.accessTokenLabel}</label>
                  <PasswordInput
                    value={accessTokenInput}
                    onChange={(e) => setAccessTokenInput(e.target.value)}
                    placeholder={t.accessTokenPlaceholder}
                    disabled={!canUpdate}
                  />
                  {config?.accessTokenConfigured && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      {t.accessTokenConfigured}
                    </p>
                  )}
                </div>
              </div>

              {formError && <p className="text-sm text-destructive">{formError}</p>}

              {canUpdate && (
                <div className="flex justify-end">
                  <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                    <Save className="mr-1.5 h-4 w-4" />
                    {updateMutation.isPending ? t.saving : t.save}
                  </Button>
                </div>
              )}

              {config && (
                <div className="rounded-xl border border-border/70 bg-background/60 p-4">
                  <p className="mb-1 text-sm font-semibold">{t.webhookSectionTitle}</p>
                  <p className="mb-3 text-xs text-muted-foreground">{t.webhookSectionDescription}</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t.webhookUrlLabel}</label>
                      <div className="flex items-center gap-2">
                        <Input value={webhookUrl} readOnly className="font-mono text-xs" />
                        <AppTooltip content={t.copy}>
                          <Button variant="outline" size="sm" className="h-10 w-10 shrink-0 p-0" onClick={() => copyToClipboard(webhookUrl, t.webhookUrlLabel)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </AppTooltip>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t.webhookVerifyTokenLabel}</label>
                      <div className="flex items-center gap-2">
                        <Input value={config.webhookVerifyToken} readOnly className="font-mono text-xs" />
                        <AppTooltip content={t.copy}>
                          <Button variant="outline" size="sm" className="h-10 w-10 shrink-0 p-0" onClick={() => copyToClipboard(config.webhookVerifyToken, t.webhookVerifyTokenLabel)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </AppTooltip>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
