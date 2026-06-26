"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, CheckCheck, Clock, PlusCircle, Send, Settings, TriangleAlert } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type {
  CandidateResponse,
  ConversationTargetPhoneOwner,
  MessageDeliveryStatus,
} from "@/lib/types";

export function ConversationsTab({
  accessToken,
  locale,
  candidateId,
  establishmentId,
  candidate,
  canSendMessage,
  canCreateConversation,
}: {
  accessToken: string;
  locale: "fr" | "en";
  candidateId: string;
  establishmentId: string;
  candidate?: CandidateResponse;
  canSendMessage: boolean;
  canCreateConversation: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newConversationOwner, setNewConversationOwner] = useState<ConversationTargetPhoneOwner | "">("");
  const [newConversationError, setNewConversationError] = useState<string | null>(null);
  const [showWhatsappConfigMissing, setShowWhatsappConfigMissing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const conversationsQuery = useQuery({
    queryKey: ["candidate", "conversations", accessToken, establishmentId, candidateId],
    queryFn: () => api.candidateConversations.listForCandidate(accessToken, candidateId, establishmentId),
    enabled: Boolean(accessToken && candidateId && establishmentId),
  });

  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data]);

  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const messagesQuery = useQuery({
    queryKey: ["candidate-conversation", "messages", accessToken, establishmentId, selectedConversationId],
    queryFn: () => api.candidateConversations.listMessages(accessToken, selectedConversationId!, establishmentId),
    enabled: Boolean(accessToken && establishmentId && selectedConversationId),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQuery.data]);

  const usersOptionsQuery = useQuery({
    queryKey: ["users", "options", accessToken],
    queryFn: () => api.users.options(accessToken),
    enabled: Boolean(accessToken),
  });

  const userLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    (usersOptionsQuery.data ?? []).forEach((u) => map.set(u.id, u.displayName));
    return map;
  }, [usersOptionsQuery.data]);

  const isWhatsappConfigMissingError = (err: unknown) =>
    err instanceof ApiError && err.errorCode === "WHATSAPP_CONFIG_MISSING";

  const sendMessageMutation = useMutation({
    mutationFn: () =>
      api.candidateConversations.sendMessage(accessToken, selectedConversation!.id, establishmentId, {
        content: messageContent.trim(),
      }),
    onSuccess: async () => {
      setMessageContent("");
      await messagesQuery.refetch();
      await conversationsQuery.refetch();
    },
    onError: (err) => {
      if (isWhatsappConfigMissingError(err)) {
        setShowWhatsappConfigMissing(true);
        return;
      }
      toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message });
    },
  });

  const createConversationMutation = useMutation({
    mutationFn: () =>
      api.candidateConversations.create(accessToken, candidateId, {
        establishmentId,
        targetPhoneOwner: newConversationOwner as ConversationTargetPhoneOwner,
      }),
    onSuccess: async (data) => {
      await conversationsQuery.refetch();
      setSelectedConversationId(data.id);
      setShowNewConversation(false);
      setNewConversationOwner("");
      setNewConversationError(null);
      toast({ variant: "success", title: locale === "fr" ? "Conversation démarrée" : "Conversation started" });
    },
    onError: (err) => {
      if (isWhatsappConfigMissingError(err)) {
        setShowNewConversation(false);
        setNewConversationError(null);
        setShowWhatsappConfigMissing(true);
        return;
      }
      setNewConversationError((err as Error).message);
    },
  });

  const t = {
    title: locale === "fr" ? "Conversations" : "Conversations",
    subtitle: locale === "fr" ? "Échanges WhatsApp avec le candidat." : "WhatsApp exchanges with the candidate.",
    newConversation: locale === "fr" ? "Nouvelle conversation" : "New conversation",
    noConversations: locale === "fr" ? "Aucune conversation." : "No conversations.",
    noMessages: locale === "fr" ? "Aucun message." : "No messages.",
    loadError: locale === "fr" ? "Erreur lors du chargement." : "Error loading data.",
    placeholder: locale === "fr" ? "Écrire un message..." : "Write a message...",
    send: locale === "fr" ? "Envoyer" : "Send",
    windowClosed: locale === "fr"
      ? "Fenêtre de 24h dépassée — un message template est requis pour relancer la conversation."
      : "24h window elapsed — a template message is required to restart the conversation.",
    selectConversation: locale === "fr" ? "Sélectionnez une conversation." : "Select a conversation.",
    whatsappConfigMissingTitle: locale === "fr" ? "WhatsApp non configuré" : "WhatsApp not configured",
    whatsappConfigMissingDescription: locale === "fr"
      ? "Cet établissement n'a pas encore de configuration WhatsApp Business active (token et numéro d'expéditeur). Configurez-la avant de pouvoir démarrer ou poursuivre des conversations avec les candidats."
      : "This establishment does not have an active WhatsApp Business configuration yet (access token and sender number). Set it up before starting or continuing conversations with candidates.",
    goToWhatsappConfig: locale === "fr" ? "Configurer WhatsApp" : "Configure WhatsApp",
  };

  const ownerLabel = (owner: ConversationTargetPhoneOwner) => {
    switch (owner) {
      case "PARENT_1": return locale === "fr" ? "Parent 1" : "Parent 1";
      case "PARENT_2": return locale === "fr" ? "Parent 2" : "Parent 2";
      case "CANDIDATE": return locale === "fr" ? "Candidat" : "Candidate";
      default: return owner;
    }
  };

  const phoneForOwner = (owner: ConversationTargetPhoneOwner): string | undefined => {
    switch (owner) {
      case "PARENT_1": return candidate?.parentPhone1;
      case "PARENT_2": return candidate?.parentPhone2;
      case "CANDIDATE": return candidate?.candidatePhone;
      default: return undefined;
    }
  };

  const existingOwners = useMemo(() => new Set(conversations.map((c) => c.targetPhoneOwner)), [conversations]);

  const newConversationOptions = (["CANDIDATE", "PARENT_1", "PARENT_2"] as ConversationTargetPhoneOwner[])
    .filter((owner) => !existingOwners.has(owner) && Boolean(phoneForOwner(owner)))
    .map((owner) => ({
      value: owner,
      label: `${ownerLabel(owner)} — ${phoneForOwner(owner)}`,
      keywords: [ownerLabel(owner)],
    }));

  const deliveryStatusIcon = (status: MessageDeliveryStatus) => {
    switch (status) {
      case "READ": return <CheckCheck className="h-3.5 w-3.5 text-sky-500" />;
      case "DELIVERED": return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />;
      case "SENT": return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
      case "FAILED": return <TriangleAlert className="h-3.5 w-3.5 text-destructive" />;
      default: return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <>
      <Card className="border-border/60 bg-card/70">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{t.title}</CardTitle>
            <CardDescription>{t.subtitle}</CardDescription>
          </div>
          {canCreateConversation && (
            <Button
              size="sm"
              className="h-9 rounded-xl"
              disabled={newConversationOptions.length === 0}
              onClick={() => {
                setNewConversationOwner("");
                setNewConversationError(null);
                setShowNewConversation(true);
              }}
            >
              <PlusCircle className="mr-1.5 h-4 w-4" />
              {t.newConversation}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {conversationsQuery.isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{locale === "fr" ? "Chargement…" : "Loading…"}</p>
          ) : conversationsQuery.isError ? (
            <p className="py-8 text-center text-sm text-destructive">{t.loadError}</p>
          ) : conversations.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t.noConversations}</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
              {/* Conversation list */}
              <div className="grid gap-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSelectedConversationId(conv.id)}
                    className={`rounded-xl border p-3 text-left text-sm transition-colors ${
                      conv.id === selectedConversationId
                        ? "border-primary bg-primary/10"
                        : "border-border/60 bg-background/60 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{ownerLabel(conv.targetPhoneOwner)}</span>
                      {conv.withinMessagingWindow ? (
                        <Badge variant="success">{locale === "fr" ? "Ouverte" : "Open"}</Badge>
                      ) : (
                        <Badge variant="outline">{locale === "fr" ? "Fermée" : "Closed"}</Badge>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{conv.targetPhoneNumber}</p>
                    {conv.lastInboundAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(conv.lastInboundAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}
                      </p>
                    )}
                  </button>
                ))}
              </div>

              {/* Chat view */}
              <div className="flex flex-col rounded-xl border border-border/70 bg-background/60">
                {!selectedConversation ? (
                  <div className="flex flex-1 items-center justify-center p-8">
                    <p className="text-sm text-muted-foreground">{t.selectConversation}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                      <div>
                        <p className="font-medium">{ownerLabel(selectedConversation.targetPhoneOwner)}</p>
                        <p className="font-mono text-xs text-muted-foreground">{selectedConversation.targetPhoneNumber}</p>
                      </div>
                      {selectedConversation.withinMessagingWindow ? (
                        <Badge variant="success">{locale === "fr" ? "Fenêtre ouverte" : "Window open"}</Badge>
                      ) : (
                        <Badge variant="outline">{locale === "fr" ? "Fenêtre fermée" : "Window closed"}</Badge>
                      )}
                    </div>

                    <div className="flex max-h-120 min-h-80 flex-col gap-2 overflow-y-auto p-4">
                      {messagesQuery.isLoading ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">{locale === "fr" ? "Chargement…" : "Loading…"}</p>
                      ) : messagesQuery.isError ? (
                        <p className="py-8 text-center text-sm text-destructive">{t.loadError}</p>
                      ) : (messagesQuery.data ?? []).length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">{t.noMessages}</p>
                      ) : (
                        (messagesQuery.data ?? []).map((msg) => {
                          const isOutbound = msg.direction === "OUTBOUND";
                          return (
                            <div key={msg.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                                  isOutbound
                                    ? "rounded-br-sm bg-primary text-primary-foreground"
                                    : "rounded-bl-sm bg-muted text-foreground"
                                }`}
                              >
                                {msg.messageType === "TEMPLATE" && (
                                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">{msg.templateName}</p>
                                )}
                                <p className="whitespace-pre-wrap">{msg.content || msg.mediaUrl || "—"}</p>
                                <div className={`mt-1 flex items-center gap-1 text-[10px] ${isOutbound ? "justify-end text-primary-foreground/80" : "text-muted-foreground"}`}>
                                  {isOutbound && msg.senderUserId && <span>{userLabelMap.get(msg.senderUserId) ?? ""}</span>}
                                  <span>{new Date(msg.occurredAt).toLocaleTimeString(locale === "fr" ? "fr-FR" : "en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                                  {isOutbound && deliveryStatusIcon(msg.deliveryStatus)}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {canSendMessage && (
                      <div className="border-t border-border/60 p-3">
                        {!selectedConversation.withinMessagingWindow && (
                          <p className="mb-2 text-xs text-muted-foreground">{t.windowClosed}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <input
                            value={messageContent}
                            onChange={(e) => setMessageContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey && messageContent.trim() && selectedConversation.withinMessagingWindow) {
                                e.preventDefault();
                                sendMessageMutation.mutate();
                              }
                            }}
                            placeholder={t.placeholder}
                            disabled={!selectedConversation.withinMessagingWindow || sendMessageMutation.isPending}
                            className="flex h-10 w-full rounded-full border border-input bg-(--input-bg) px-4 text-sm text-foreground [font-family:var(--font-grift)] shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                          />
                          <Button
                            size="sm"
                            className="h-10 w-10 rounded-full p-0"
                            disabled={!selectedConversation.withinMessagingWindow || !messageContent.trim() || sendMessageMutation.isPending}
                            onClick={() => sendMessageMutation.mutate()}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New conversation dialog */}
      <Dialog open={showNewConversation} onOpenChange={(open) => { if (!open) { setShowNewConversation(false); setNewConversationError(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.newConversation}</DialogTitle>
            <DialogDescription>
              {locale === "fr" ? "Sélectionnez le destinataire de la conversation." : "Select the conversation recipient."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {candidate && (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <p className="text-sm font-medium">{candidate.firstName} {candidate.lastName}</p>
                <p className="font-mono text-xs text-muted-foreground">{candidate.candidatePhone}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">{locale === "fr" ? "Destinataire" : "Recipient"} *</label>
              <SearchableSelect
                options={newConversationOptions}
                value={newConversationOwner}
                onValueChange={(v) => setNewConversationOwner(v as ConversationTargetPhoneOwner)}
                placeholder={locale === "fr" ? "Sélectionner..." : "Select..."}
                searchPlaceholder={locale === "fr" ? "Rechercher..." : "Search..."}
                className="w-full"
                disabled={newConversationOptions.length === 0}
              />
            </div>
            {newConversationError && <p className="text-sm text-destructive">{newConversationError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewConversation(false); setNewConversationError(null); }} disabled={createConversationMutation.isPending}>
              {locale === "fr" ? "Annuler" : "Cancel"}
            </Button>
            <Button
              onClick={() => {
                if (!newConversationOwner) {
                  setNewConversationError(locale === "fr" ? "Le destinataire est obligatoire." : "Recipient is required.");
                  return;
                }
                createConversationMutation.mutate();
              }}
              disabled={createConversationMutation.isPending}
            >
              {createConversationMutation.isPending ? (locale === "fr" ? "Enregistrement..." : "Saving...") : (locale === "fr" ? "Valider" : "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp configuration missing dialog */}
      <Dialog open={showWhatsappConfigMissing} onOpenChange={setShowWhatsappConfigMissing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlert className="h-5 w-5 text-destructive" />
              {t.whatsappConfigMissingTitle}
            </DialogTitle>
            <DialogDescription>{t.whatsappConfigMissingDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWhatsappConfigMissing(false)}>
              {locale === "fr" ? "Fermer" : "Close"}
            </Button>
            <Button onClick={() => router.push(`/dashboard/establishments/${establishmentId}`)}>
              <Settings className="mr-1.5 h-4 w-4" />
              {t.goToWhatsappConfig}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
