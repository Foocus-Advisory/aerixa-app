"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Eye, Paperclip, Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast-provider";
import { AppTooltip } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CandidateNoteResponse } from "@/lib/types";

function formatDate(value: string, locale: "fr" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NotesTab({
  accessToken,
  locale,
  establishmentId,
  candidateId,
  candidateApplicationId,
  canCreate,
}: {
  accessToken: string;
  locale: "fr" | "en";
  establishmentId: string;
  candidateId: string;
  candidateApplicationId: string;
  canCreate: boolean;
}) {
  const { toast } = useToast();

  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [uploadTargetNoteId, setUploadTargetNoteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const notesQuery = useQuery({
    queryKey: ["candidate-application", "notes", accessToken, establishmentId, candidateApplicationId],
    queryFn: () => api.candidateApplications.listNotes(accessToken, candidateApplicationId, establishmentId),
    enabled: Boolean(accessToken && establishmentId && candidateApplicationId),
  });

  const notes = notesQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      api.candidateNotes.create(accessToken, candidateId, {
        establishmentId,
        candidateApplicationId,
        content: newNoteContent.trim(),
      }),
    onSuccess: async () => {
      setNewNoteContent("");
      await notesQuery.refetch();
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
      api.candidateNotes.update(accessToken, candidateId, noteId, establishmentId, { content }),
    onSuccess: async () => {
      setEditingNoteId(null);
      setEditingContent("");
      await notesQuery.refetch();
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => api.candidateNotes.delete(accessToken, candidateId, noteId, establishmentId),
    onSuccess: async () => {
      await notesQuery.refetch();
      toast({ variant: "success", title: locale === "fr" ? "Note supprimée" : "Note deleted" });
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ noteId, file }: { noteId: string; file: File }) =>
      api.candidateNotes.uploadAttachment(accessToken, candidateId, noteId, establishmentId, file),
    onSuccess: async () => {
      await notesQuery.refetch();
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur d'envoi" : "Upload failed", description: (err as Error).message }),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: ({ noteId, attachmentId }: { noteId: string; attachmentId: string }) =>
      api.candidateNotes.deleteAttachment(accessToken, candidateId, noteId, attachmentId, establishmentId),
    onSuccess: async () => {
      await notesQuery.refetch();
    },
    onError: (err) => toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message }),
  });

  const downloadAttachment = async (noteId: string, attachmentId: string, filename: string) => {
    try {
      const blob = await api.candidateNotes.getAttachmentBlob(accessToken, candidateId, noteId, attachmentId, establishmentId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message });
    }
  };

  const viewAttachment = async (noteId: string, attachmentId: string) => {
    try {
      const blob = await api.candidateNotes.getAttachmentBlob(accessToken, candidateId, noteId, attachmentId, establishmentId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      // L'URL objet est révoquée après un délai pour laisser le temps au nouvel onglet de charger le contenu.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast({ variant: "error", title: locale === "fr" ? "Erreur" : "Error", description: (err as Error).message });
    }
  };

  const isPreviewable = (contentType: string) =>
    contentType.startsWith("image/") || contentType.startsWith("video/") || contentType.startsWith("audio/") || contentType === "application/pdf";

  const openEdit = (note: CandidateNoteResponse) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditingContent("");
  };

  const openFilePicker = (noteId: string) => {
    setUploadTargetNoteId(noteId);
    fileInputRef.current?.click();
  };

  const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file || !uploadTargetNoteId) return;
    uploadMutation.mutate({ noteId: uploadTargetNoteId, file });
    setUploadTargetNoteId(null);
  };

  return (
    <div className="grid gap-4">
      <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelected} />

      {canCreate && (
        <Card className="border-border/60 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">{locale === "fr" ? "Ajouter une note" : "Add a note"}</CardTitle>
            <CardDescription>
              {locale === "fr"
                ? "Note facultative pour le suivi de cette candidature. Vous pourrez y joindre des fichiers une fois enregistrée."
                : "Optional note to track this application. You can attach files once it is saved."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <textarea
              className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder={locale === "fr" ? "Saisir une note..." : "Write a note..."}
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
            />
            <Button
              size="sm"
              className="w-fit"
              onClick={() => createMutation.mutate()}
              disabled={!newNoteContent.trim() || createMutation.isPending}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {createMutation.isPending ? (locale === "fr" ? "Enregistrement..." : "Saving...") : (locale === "fr" ? "Ajouter" : "Add")}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/60 bg-card/70">
        <CardHeader>
          <CardTitle className="text-base">{locale === "fr" ? "Notes de suivi" : "Tracking notes"}</CardTitle>
          <CardDescription>
            {locale === "fr"
              ? "Chaque note est horodatée et attribuée à son auteur."
              : "Each note is timestamped and attributed to its author."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {notesQuery.isLoading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{locale === "fr" ? "Chargement…" : "Loading…"}</p>
          ) : notesQuery.isError ? (
            <p className="py-4 text-center text-sm text-destructive">{locale === "fr" ? "Erreur lors du chargement." : "Error loading data."}</p>
          ) : notes.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{locale === "fr" ? "Aucune note pour le moment." : "No notes yet."}</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="rounded-xl border border-border/70 bg-background/70 p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{note.authorLabel ?? (locale === "fr" ? "Système" : "System")}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(note.createdAt, locale)}
                      {note.edited && (
                        <span className="ml-1.5 italic">
                          {locale === "fr" ? `(modifiée le ${formatDate(note.updatedAt, locale)})` : `(edited on ${formatDate(note.updatedAt, locale)})`}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <AppTooltip content={locale === "fr" ? "Joindre un fichier" : "Attach a file"}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg p-0" onClick={() => openFilePicker(note.id)}>
                        <Paperclip className="h-3.5 w-3.5" />
                      </Button>
                    </AppTooltip>
                    {note.editableByCurrentUser && editingNoteId !== note.id && (
                      <AppTooltip content={locale === "fr" ? "Modifier" : "Edit"}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg p-0" onClick={() => openEdit(note)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </AppTooltip>
                    )}
                    {note.deletableByCurrentUser && (
                      <AppTooltip content={locale === "fr" ? "Supprimer" : "Delete"}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 rounded-lg p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            if (window.confirm(locale === "fr" ? "Supprimer cette note ?" : "Delete this note?")) {
                              deleteMutation.mutate(note.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AppTooltip>
                    )}
                  </div>
                </div>

                {editingNoteId === note.id ? (
                  <div className="grid gap-2">
                    <textarea
                      className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateMutation.mutate({ noteId: note.id, content: editingContent.trim() })}
                        disabled={!editingContent.trim() || updateMutation.isPending}
                      >
                        {updateMutation.isPending ? (locale === "fr" ? "Enregistrement..." : "Saving...") : (locale === "fr" ? "Enregistrer" : "Save")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={cancelEdit}>
                        <X className="mr-1 h-3.5 w-3.5" />
                        {locale === "fr" ? "Annuler" : "Cancel"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                )}

                {note.attachments.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {note.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{attachment.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.fileSize)} • {attachment.uploadedByLabel ?? "—"} • {formatDate(attachment.createdAt, locale)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {isPreviewable(attachment.contentType) && (
                            <AppTooltip content={locale === "fr" ? "Consulter" : "View"}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 rounded-lg p-0"
                                onClick={() => viewAttachment(note.id, attachment.id)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </AppTooltip>
                          )}
                          <AppTooltip content={locale === "fr" ? "Télécharger" : "Download"}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 rounded-lg p-0"
                              onClick={() => downloadAttachment(note.id, attachment.id, attachment.filename)}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </AppTooltip>
                          <AppTooltip content={locale === "fr" ? "Supprimer" : "Delete"}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 rounded-lg p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => deleteAttachmentMutation.mutate({ noteId: note.id, attachmentId: attachment.id })}
                              disabled={deleteAttachmentMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AppTooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Badge variant="outline" className="mt-3 text-xs">{note.type}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
