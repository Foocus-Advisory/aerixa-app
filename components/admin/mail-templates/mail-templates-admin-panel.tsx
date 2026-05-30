"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Copy, Eye, Plus, RefreshCw, Settings, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { MailTypesTable } from "@/components/admin/mail-templates/mail-types-table";
import { MailTemplateEditor } from "@/components/admin/mail-templates/mail-template-editor";
import { AppTooltip } from "@/components/ui/tooltip";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getGradientButtonClass } from "@/lib/button-gradients";
import type { Locale } from "@/lib/i18n";
import { api } from "@/lib/mail-templates-api";
import type {
  MailTypeRequest,
  MailTypeResponse,
  MailTemplatePreviewResponse,
  MailTemplateRequest,
  MailTemplateResponse,
} from "@/lib/mail-templates-api";

interface MailTemplatesAdminPanelProps {
  accessToken: string;
  locale: Locale;
}

const INITIAL_TYPE_FORM: MailTypeRequest = {
  code: "",
  category: "",
  name: "",
  description: "",
  defaultRecipient: "USER",
  active: true,
  minResendIntervalSeconds: 300,
  maxRetries: 3,
  showSystemComments: true,
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export function MailTemplatesAdminPanel({ accessToken, locale }: MailTemplatesAdminPanelProps) {
  const { toast } = useToast();
  const t = locale === "fr"
    ? {
        success: "Succes",
        error: "Erreur",
        mailTypeCreated: "Type de mail cree",
        mailTypeCreatedDesc: "Le type de mail a ete cree avec succes.",
        mailTypeUpdated: "Type de mail mis a jour",
        mailTypeUpdatedDesc: "Les modifications ont ete enregistrees.",
        statusUpdated: "Statut modifie",
        statusUpdatedDesc: "L'etat du type de mail a ete mis a jour.",
        mailTypeDeleted: "Type de mail supprime",
        mailTypeDeletedDesc: "Le type de mail a ete supprime avec succes.",
        previewError: "Erreur de previsualisation",
        previewErrorDesc: "Impossible de generer l'apercu du template",
        sectionTypes: "Types de mail",
        sectionTemplates: "Templates de mail",
        newType: "Nouveau type",
        relatedTemplates: "Templates lies au type:",
        selectTypeHint: "Selectionnez un type de mail pour gerer ses templates.",
        refresh: "Rafraichir",
        createTemplate: "Creer un template",
        colLanguage: "Langue",
        colType: "Type lie",
        colVersion: "Version",
        colSubject: "Sujet",
        colStatus: "Statut",
        colUpdatedAt: "Mis a jour",
        colActions: "Actions",
        noTypeSelected: "Selectionnez un type de mail dans le tableau au-dessus.",
        loadingTemplates: "Chargement des templates...",
        noTemplate: "Aucun template pour ce type. Cliquez sur \"Creer un template\" pour commencer.",
        statusActive: "Active",
        statusInactive: "Inactive",
        templateActions: "Actions template",
        preview: "Apercu",
        previewLoading: "Apercu en cours...",
        configure: "Configurer",
        duplicate: "Dupliquer",
        deactivate: "Desactiver",
        activate: "Activer",
        delete: "Supprimer",
        confirmDeleteTemplate: "Supprimer ce template ?",
        createMailTypeFailed: "Impossible de creer le type de mail",
        updateMailTypeFailed: "Impossible de mettre a jour",
        deleteMailTypeFailed: "Impossible de supprimer",
        saveTemplateOk: "Template enregistre",
        saveTemplateOkDesc: "Le template a ete enregistre avec succes.",
        saveTemplateFailed: "Impossible d'enregistrer le template",
        templateActivated: "Template active",
        templateDeactivated: "Template desactive",
        templateActivatedDesc: "Le template est maintenant actif.",
        templateDeactivatedDesc: "Le template est maintenant inactif.",
        templateDeleted: "Template supprime",
        templateDeletedDesc: "Le template a ete supprime.",
        selectedRows: "ligne(s) selectionnee(s)",
        rowsPerPage: "Lignes par page:",
        page: "Page",
        of: "de",
        search: "Rechercher...",
        firstPage: "Premiere page",
        previousPage: "Page precedente",
        nextPage: "Page suivante",
        lastPage: "Derniere page",
        editTypeTitle: "Editer le type",
        createTypeTitle: "Creer un type de mail",
        category: "Categorie",
        selectCategory: "Selectionner une categorie",
        searchCategory: "Rechercher une categorie...",
        codeUnique: "Code (unique)",
        name: "Nom",
        resetPasswordLabel: "Reinitialisation de mot de passe",
        description: "Description",
        descriptionPlaceholder: "Description...",
        minDelay: "Delai min entre envois (sec)",
        maxRetries: "Tentatives max",
        active: "Actif",
        cancel: "Annuler",
        update: "Mettre a jour",
        create: "Creer",
        previewDialogTitle: "Apercu du template",
        previewDialogDescription: "Verifiez le rendu HTML final avec les variables d'exemple.",
        noPreview: "Aucun apercu disponible.",
        close: "Fermer",
      }
    : {
        success: "Success",
        error: "Error",
        mailTypeCreated: "Mail type created",
        mailTypeCreatedDesc: "The mail type was created successfully.",
        mailTypeUpdated: "Mail type updated",
        mailTypeUpdatedDesc: "Changes were saved.",
        statusUpdated: "Status updated",
        statusUpdatedDesc: "Mail type status has been updated.",
        mailTypeDeleted: "Mail type deleted",
        mailTypeDeletedDesc: "The mail type was deleted successfully.",
        previewError: "Preview error",
        previewErrorDesc: "Unable to generate template preview",
        sectionTypes: "Mail types",
        sectionTemplates: "Mail templates",
        newType: "New type",
        relatedTemplates: "Templates linked to type:",
        selectTypeHint: "Select a mail type to manage its templates.",
        refresh: "Refresh",
        createTemplate: "Create template",
        colLanguage: "Language",
        colType: "Linked type",
        colVersion: "Version",
        colSubject: "Subject",
        colStatus: "Status",
        colUpdatedAt: "Updated at",
        colActions: "Actions",
        noTypeSelected: "Select a mail type in the table above.",
        loadingTemplates: "Loading templates...",
        noTemplate: "No template for this type. Click \"Create template\" to start.",
        statusActive: "Active",
        statusInactive: "Inactive",
        templateActions: "Template actions",
        preview: "Preview",
        previewLoading: "Loading preview...",
        configure: "Configure",
        duplicate: "Duplicate",
        deactivate: "Deactivate",
        activate: "Activate",
        delete: "Delete",
        confirmDeleteTemplate: "Delete this template?",
        createMailTypeFailed: "Unable to create mail type",
        updateMailTypeFailed: "Unable to update",
        deleteMailTypeFailed: "Unable to delete",
        saveTemplateOk: "Template saved",
        saveTemplateOkDesc: "Template was saved successfully.",
        saveTemplateFailed: "Unable to save template",
        templateActivated: "Template activated",
        templateDeactivated: "Template deactivated",
        templateActivatedDesc: "Template is now active.",
        templateDeactivatedDesc: "Template is now inactive.",
        templateDeleted: "Template deleted",
        templateDeletedDesc: "Template was deleted.",
        selectedRows: "row(s) selected",
        rowsPerPage: "Rows per page:",
        page: "Page",
        of: "of",
        search: "Search...",
        firstPage: "First page",
        previousPage: "Previous page",
        nextPage: "Next page",
        lastPage: "Last page",
        editTypeTitle: "Edit type",
        createTypeTitle: "Create mail type",
        category: "Category",
        selectCategory: "Select a category",
        searchCategory: "Search a category...",
        codeUnique: "Code (unique)",
        name: "Name",
        resetPasswordLabel: "Password reset",
        description: "Description",
        descriptionPlaceholder: "Description...",
        minDelay: "Min resend delay (sec)",
        maxRetries: "Max retries",
        active: "Active",
        cancel: "Cancel",
        update: "Update",
        create: "Create",
        previewDialogTitle: "Template preview",
        previewDialogDescription: "Check final HTML rendering with sample variables.",
        noPreview: "No preview available.",
        close: "Close",
      };
  const [selectedMailType, setSelectedMailType] = useState<MailTypeResponse | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MailTemplateResponse | null>(null);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [mailTypeDialogOpen, setMailTypeDialogOpen] = useState(false);
  const [editingMailType, setEditingMailType] = useState<MailTypeResponse | null>(null);
  const [mailTypeForm, setMailTypeForm] = useState<MailTypeRequest>(INITIAL_TYPE_FORM);
  const [templatePage, setTemplatePage] = useState(0);
  const [templatePageSize, setTemplatePageSize] = useState(10);
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false);
  const [templatePreviewData, setTemplatePreviewData] = useState<MailTemplatePreviewResponse | null>(null);
  const [previewingTemplateId, setPreviewingTemplateId] = useState<string | null>(null);
  const [draftTemplate, setDraftTemplate] = useState<MailTemplateRequest | null>(null);

  const mailTypesQuery = useQuery({
    queryKey: ["mailTypes"],
    queryFn: () => api.mailTemplates.getMailTypes(accessToken),
    enabled: Boolean(accessToken),
  });

  const mailTypeCategoriesQuery = useQuery({
    queryKey: ["mailTypeCategories"],
    queryFn: () => api.mailTemplates.getMailTypeCategories(accessToken),
    enabled: Boolean(accessToken),
  });

  const variablesQuery = useQuery({
    queryKey: ["mailTemplateVariables"],
    queryFn: () => api.mailTemplates.getVariablesByCategory(accessToken),
    enabled: Boolean(accessToken),
  });

  const templatesQuery = useQuery({
    queryKey: ["mailTemplates", selectedMailType?.id ?? mailTypesQuery.data?.[0]?.id],
    queryFn: () => api.mailTemplates.getTemplates(accessToken, (selectedMailType ?? mailTypesQuery.data?.[0])!.id),
    enabled: Boolean(accessToken && (selectedMailType?.id ?? mailTypesQuery.data?.[0]?.id)),
  });

  const effectiveSelectedMailType = useMemo(
    () => selectedMailType ?? mailTypesQuery.data?.[0] ?? null,
    [mailTypesQuery.data, selectedMailType],
  );

  const sortedTemplates = useMemo(() => {
    return [...(templatesQuery.data || [])].sort((a, b) => {
      if (a.language !== b.language) {
        return a.language.localeCompare(b.language);
      }
      return b.versionNumber - a.versionNumber;
    });
  }, [templatesQuery.data]);

  const templateTotalPages = Math.max(1, Math.ceil(sortedTemplates.length / templatePageSize));
  const currentTemplatePage = Math.min(templatePage, templateTotalPages - 1);
  const pagedTemplates = useMemo(() => {
    const start = currentTemplatePage * templatePageSize;
    return sortedTemplates.slice(start, start + templatePageSize);
  }, [sortedTemplates, currentTemplatePage, templatePageSize]);

  const allSelectedTemplatesOnPage =
    pagedTemplates.length > 0 && pagedTemplates.every((template) => selectedTemplateIds.has(template.id));

  const toggleTemplateSelection = (id: string) => {
    setSelectedTemplateIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllTemplatesOnPage = () => {
    setSelectedTemplateIds((current) => {
      const next = new Set(current);
      if (allSelectedTemplatesOnPage) {
        pagedTemplates.forEach((template) => next.delete(template.id));
      } else {
        pagedTemplates.forEach((template) => next.add(template.id));
      }
      return next;
    });
  };

  const templateStatusBadgeClass = (isCurrent: boolean) => {
    if (isCurrent) {
      return "border border-emerald-200 bg-emerald-100 !text-emerald-900 dark:border-emerald-500/45 dark:bg-emerald-500/20 dark:!text-emerald-50";
    }
    return "border border-rose-200 bg-rose-100 !text-rose-900 dark:border-rose-500/45 dark:bg-rose-500/20 dark:!text-rose-50";
  };

  const templateStatusDotClass = (isCurrent: boolean) => {
    return isCurrent ? "bg-emerald-500 dark:bg-emerald-300" : "bg-rose-500 dark:bg-rose-300";
  };

  const mailTypeCategoryOptions = useMemo(
    () =>
      (mailTypeCategoriesQuery.data || []).map((category) => ({
        value: category.value,
        label: `${category.module} / ${category.action} - ${category.label}`,
        keywords: [category.value, category.module, category.action, category.label, category.description],
      })),
    [mailTypeCategoriesQuery.data],
  );

  const templateRowsPerPageOptions = [
    { value: "10", label: "10", keywords: ["10"] },
    { value: "20", label: "20", keywords: ["20"] },
    { value: "50", label: "50", keywords: ["50"] },
    { value: "100", label: "100", keywords: ["100"] },
  ];

  const createMailTypeMutation = useMutation({
    mutationFn: (payload: MailTypeRequest) => api.mailTemplates.createMailType(accessToken, payload),
    onSuccess: () => {
      toast({
        variant: "success",
        title: t.mailTypeCreated,
        description: t.mailTypeCreatedDesc,
      });
      mailTypesQuery.refetch();
      setMailTypeDialogOpen(false);
      setMailTypeForm(INITIAL_TYPE_FORM);
    },
    onError: (error: unknown) => {
      toast({
        variant: "error",
        title: t.error,
        description: getErrorMessage(error, t.createMailTypeFailed),
      });
    },
  });

  const updateMailTypeMutation = useMutation({
    mutationFn: (payload: MailTypeRequest) =>
      api.mailTemplates.updateMailType(accessToken, editingMailType?.id || "", payload),
    onSuccess: () => {
      toast({
        variant: "success",
        title: t.mailTypeUpdated,
        description: t.mailTypeUpdatedDesc,
      });
      mailTypesQuery.refetch();
      setMailTypeDialogOpen(false);
      setEditingMailType(null);
      setMailTypeForm(INITIAL_TYPE_FORM);
    },
    onError: (error: unknown) => {
      toast({
        variant: "error",
        title: t.error,
        description: getErrorMessage(error, t.updateMailTypeFailed),
      });
    },
  });

  const toggleMailTypeMutation = useMutation({
    mutationFn: (mailType: MailTypeResponse) => api.mailTemplates.toggleMailTypeStatus(accessToken, mailType.id),
    onSuccess: () => {
      mailTypesQuery.refetch();
      toast({
        variant: "success",
        title: t.statusUpdated,
        description: t.statusUpdatedDesc,
      });
    },
  });

  const deleteMailTypeMutation = useMutation({
    mutationFn: (mailType: MailTypeResponse) => api.mailTemplates.deleteMailType(accessToken, mailType.id),
    onSuccess: () => {
      mailTypesQuery.refetch();
      templatesQuery.refetch();
      toast({
        variant: "success",
        title: t.mailTypeDeleted,
        description: t.mailTypeDeletedDesc,
      });
    },
    onError: (error: unknown) => {
      toast({
        variant: "error",
        title: t.error,
        description: getErrorMessage(error, t.deleteMailTypeFailed),
      });
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (payload: MailTemplateRequest) =>
      api.mailTemplates.createOrUpdateTemplate(accessToken, effectiveSelectedMailType?.id || "", payload),
    onSuccess: () => {
      toast({
        variant: "success",
        title: t.saveTemplateOk,
        description: t.saveTemplateOkDesc,
      });
      templatesQuery.refetch();
      setTemplateEditorOpen(false);
      setSelectedTemplate(null);
    },
    onError: (error: unknown) => {
      toast({
        variant: "error",
        title: t.error,
        description: getErrorMessage(error, t.saveTemplateFailed),
      });
    },
  });

  const toggleTemplateStatusMutation = useMutation({
    mutationFn: (templateId: string) => api.mailTemplates.toggleTemplateStatus(accessToken, templateId),
    onSuccess: (template) => {
      templatesQuery.refetch();
      toast({
        variant: "success",
        title: template.isCurrent ? t.templateActivated : t.templateDeactivated,
        description: template.isCurrent ? t.templateActivatedDesc : t.templateDeactivatedDesc,
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId: string) => api.mailTemplates.deleteTemplate(accessToken, templateId),
    onSuccess: () => {
      templatesQuery.refetch();
      toast({
        variant: "success",
        title: t.templateDeleted,
        description: t.templateDeletedDesc,
      });
    },
  });

  const handlePreview = async (template: MailTemplateRequest) => {
    const categoryVars = variablesQuery.data || {};
    const sampleVariables = Object.values(categoryVars)
      .flat()
      .reduce<Record<string, string>>((acc, variable) => {
        acc[variable.code] = variable.exampleValue || `[${variable.code}]`;
        return acc;
      }, {});

    return api.mailTemplates.previewTemplate(accessToken, {
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
      variables: sampleVariables,
    });
  };

  const openTemplatePreview = async (template: MailTemplateResponse) => {
    setPreviewingTemplateId(template.id);
    try {
      const preview = await handlePreview({
        mailTypeId: template.mailTypeId,
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent,
        preview: template.preview,
        language: template.language,
        versionNotes: template.versionNotes,
        createNewVersion: false,
        supportedVariables: template.supportedVariables,
        customStyles: template.customStyles,
      });
      setTemplatePreviewData(preview);
      setTemplatePreviewOpen(true);
    } catch (error: unknown) {
      toast({
        variant: "error",
        title: t.previewError,
        description: getErrorMessage(error, t.previewErrorDesc),
      });
    } finally {
      setPreviewingTemplateId(null);
    }
  };

  const duplicateTemplate = (template: MailTemplateResponse) => {
    const duplicatedSubject = template.subject.toLowerCase().includes("copie")
      ? template.subject
      : `${template.subject} - Copie`;

    setSelectedTemplate(null);
    setDraftTemplate({
      mailTypeId: template.mailTypeId,
      subject: duplicatedSubject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
      preview: template.preview,
      language: template.language,
      versionNotes: template.versionNotes
        ? `${template.versionNotes} | Duplication v${template.versionNumber}`
        : `Duplication v${template.versionNumber}`,
      createNewVersion: true,
      supportedVariables: template.supportedVariables,
      customStyles: template.customStyles,
    });
    setTemplateEditorOpen(true);
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-foreground">{t.sectionTypes}</h2>
          <Button
            className={getGradientButtonClass("primary")}
            onClick={() => {
              setEditingMailType(null);
                const firstCategory = mailTypeCategoriesQuery.data?.[0];
                setMailTypeForm({
                  ...INITIAL_TYPE_FORM,
                  category: firstCategory?.value || "",
                  code: firstCategory?.defaultCode || "",
                });
              setMailTypeDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t.newType}
          </Button>
        </div>

        <MailTypesTable
          mailTypes={mailTypesQuery.data || []}
          locale={locale}
          isLoading={mailTypesQuery.isLoading}
          onEdit={(mailType) => {
            setEditingMailType(mailType);
            setMailTypeForm(mailType);
            setMailTypeDialogOpen(true);
          }}
          onDelete={(mailType) => {
            if (
              confirm(
                `Êtes-vous sûr de vouloir supprimer "${mailType.name}" ? Tous les templates associés seront supprimés.`
              )
            ) {
              deleteMailTypeMutation.mutate(mailType);
            }
          }}
          onToggle={(mailType) => toggleMailTypeMutation.mutate(mailType)}
          onTemplates={(mailType) => {
            setSelectedMailType(mailType);
            setTemplatePage(0);
            setSelectedTemplateIds(new Set());
          }}
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">{t.sectionTemplates}</h2>
            {effectiveSelectedMailType ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{t.relatedTemplates}</span>
                <Badge variant="outline" className="rounded-md border-border px-2 py-1 text-xs text-muted-foreground h-auto">
                  {effectiveSelectedMailType.code}
                </Badge>
                <span className="font-medium text-foreground">{effectiveSelectedMailType.name}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t.selectTypeHint}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              className={getGradientButtonClass("info")}
              onClick={() => templatesQuery.refetch()}
              disabled={!effectiveSelectedMailType || templatesQuery.isFetching}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t.refresh}
            </Button>
            <Button
              className={getGradientButtonClass("primary")}
              onClick={() => {
                if (!effectiveSelectedMailType) return;
                setSelectedTemplate(null);
                setDraftTemplate(null);
                setTemplateEditorOpen(true);
              }}
              disabled={!effectiveSelectedMailType}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t.createTemplate}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <table className="w-full text-sm overflow-x-auto">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-semibold">
                  <input
                    type="checkbox"
                    checked={allSelectedTemplatesOnPage}
                    onChange={toggleSelectAllTemplatesOnPage}
                    aria-label="selectionner tous les templates de la page"
                  />
                </th>
                <th className="px-4 py-3 text-left font-semibold">{t.colLanguage}</th>
                <th className="px-4 py-3 text-left font-semibold">{t.colType}</th>
                <th className="px-4 py-3 text-left font-semibold">{t.colVersion}</th>
                <th className="px-4 py-3 text-left font-semibold">{t.colSubject}</th>
                <th className="px-4 py-3 text-left font-semibold">{t.colStatus}</th>
                <th className="px-4 py-3 text-left font-semibold">{t.colUpdatedAt}</th>
                <th className="px-4 py-3 text-left font-semibold">{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {!effectiveSelectedMailType ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    {t.noTypeSelected}
                  </td>
                </tr>
              ) : templatesQuery.isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center">
                    {t.loadingTemplates}
                  </td>
                </tr>
              ) : pagedTemplates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    {t.noTemplate}
                  </td>
                </tr>
              ) : (
                pagedTemplates.map((template) => (
                  <tr
                    key={template.id}
                    className={`border-b border-border/60 ${selectedTemplateIds.has(template.id) ? "bg-muted/20" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedTemplateIds.has(template.id)}
                        onChange={() => toggleTemplateSelection(template.id)}
                        aria-label={`selectionner le template ${template.subject}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium uppercase">{template.language}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit rounded-md border-border px-2 py-1 text-xs text-muted-foreground h-auto">
                          {template.mailTypeCode}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{template.mailTypeName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">v{template.versionNumber}</td>
                    <td className="px-4 py-3 max-w-90 truncate">{template.subject}</td>
                    <td className="px-4 py-3">
                      {template.isCurrent ? (
                        <Badge
                          variant="outline"
                          className={`h-7 gap-1.5 rounded-full px-3 py-0 text-[12px] font-medium leading-none ${templateStatusBadgeClass(template.isCurrent)}`}
                        >
                          <span className={`h-1.75 w-1.75 rounded-full ${templateStatusDotClass(template.isCurrent)}`} />
                          {t.statusActive}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={`h-7 gap-1.5 rounded-full px-3 py-0 text-[12px] font-medium leading-none ${templateStatusBadgeClass(template.isCurrent)}`}
                        >
                          <span className={`h-1.75 w-1.75 rounded-full ${templateStatusDotClass(template.isCurrent)}`} />
                          {t.statusInactive}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {template.updatedAt
                        ? new Date(template.updatedAt).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu
                        triggerClassName="h-8 w-8 p-0"
                        triggerTooltip={t.templateActions}
                        items={[
                          {
                            label: previewingTemplateId === template.id ? t.previewLoading : t.preview,
                            icon: Eye,
                            onClick: () => openTemplatePreview(template),
                            disabled: previewingTemplateId === template.id,
                          },
                          {
                            label: t.configure,
                            icon: Settings,
                            onClick: () => {
                              setDraftTemplate(null);
                              setSelectedTemplate(template);
                              setTemplateEditorOpen(true);
                            },
                          },
                          {
                            label: t.duplicate,
                            icon: Copy,
                            onClick: () => duplicateTemplate(template),
                          },
                          {
                            label: template.isCurrent ? t.deactivate : t.activate,
                            icon: template.isCurrent ? ToggleLeft : ToggleRight,
                            onClick: () => toggleTemplateStatusMutation.mutate(template.id),
                            disabled: toggleTemplateStatusMutation.isPending,
                          },
                          {
                            label: t.delete,
                            icon: Trash2,
                            variant: "destructive",
                            onClick: () => {
                              if (confirm(t.confirmDeleteTemplate)) {
                                deleteTemplateMutation.mutate(template.id);
                              }
                            },
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-border/60 pt-4 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-muted-foreground">
            {selectedTemplateIds.size} {t.of} {sortedTemplates.length} {t.selectedRows}
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="mail-templates-rows-per-page" className="text-xs font-medium text-muted-foreground">
                {t.rowsPerPage}
              </label>
              <div className="w-24">
                <SearchableSelect
                  options={templateRowsPerPageOptions}
                  value={String(templatePageSize)}
                  onValueChange={(value) => {
                    setTemplatePageSize(Number(value));
                    setTemplatePage(0);
                  }}
                  placeholder="10"
                  searchPlaceholder={t.search}
                />
              </div>
            </div>

            <p className="text-xs font-medium text-muted-foreground">
              {t.page} {Math.min(currentTemplatePage + 1, Math.max(templateTotalPages, 1))} {t.of} {Math.max(templateTotalPages, 1)}
            </p>

            <div className="flex gap-1">
              <AppTooltip content={t.firstPage}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTemplatePage(0)}
                  disabled={currentTemplatePage <= 0}
                  className="px-2"
                >
                  «
                </Button>
              </AppTooltip>
              <AppTooltip content={t.previousPage}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTemplatePage((current) => Math.max(current - 1, 0))}
                  disabled={currentTemplatePage <= 0}
                  className="px-2"
                >
                  ‹
                </Button>
              </AppTooltip>
              <AppTooltip content={t.nextPage}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTemplatePage((current) => current + 1)}
                  disabled={templateTotalPages === 0 || currentTemplatePage >= templateTotalPages - 1}
                  className="px-2"
                >
                  ›
                </Button>
              </AppTooltip>
              <AppTooltip content={t.lastPage}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTemplatePage(Math.max(templateTotalPages - 1, 0))}
                  disabled={templateTotalPages === 0 || currentTemplatePage >= templateTotalPages - 1}
                  className="px-2"
                >
                  »
                </Button>
              </AppTooltip>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={mailTypeDialogOpen} onOpenChange={setMailTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMailType ? t.editTypeTitle : t.createTypeTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">{t.category}</label>
              <SearchableSelect
                options={mailTypeCategoryOptions}
                value={mailTypeForm.category}
                onValueChange={(value) => {
                  const selectedCategory = (mailTypeCategoriesQuery.data || []).find(
                    (item) => item.value === value
                  );

                  setMailTypeForm({
                    ...mailTypeForm,
                    category: value,
                    code: selectedCategory?.defaultCode || mailTypeForm.code,
                    name:
                      editingMailType || mailTypeForm.name
                        ? mailTypeForm.name
                        : selectedCategory?.label || mailTypeForm.name,
                  });
                }}
                placeholder={t.selectCategory}
                searchPlaceholder={t.searchCategory}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">{t.codeUnique}</label>
              <Input
                value={mailTypeForm.code}
                onChange={(e) =>
                  setMailTypeForm({
                    ...mailTypeForm,
                    code: e.target.value.toUpperCase(),
                  })
                }
                placeholder="PASSWORD_RESET"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">{t.name}</label>
              <Input
                value={mailTypeForm.name}
                onChange={(e) =>
                  setMailTypeForm({
                    ...mailTypeForm,
                    name: e.target.value,
                  })
                }
                placeholder={t.resetPasswordLabel}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">{t.description}</label>
              <textarea
                value={mailTypeForm.description}
                onChange={(e) =>
                  setMailTypeForm({
                    ...mailTypeForm,
                    description: e.target.value,
                  })
                }
                placeholder={t.descriptionPlaceholder}
                className="w-full rounded-md border border-input bg-(--input-bg) px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">{t.minDelay}</label>
                <Input
                  type="number"
                  value={mailTypeForm.minResendIntervalSeconds}
                  onChange={(e) =>
                    setMailTypeForm({
                      ...mailTypeForm,
                      minResendIntervalSeconds: Number(e.target.value || 0),
                    })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">{t.maxRetries}</label>
                <Input
                  type="number"
                  value={mailTypeForm.maxRetries}
                  onChange={(e) =>
                    setMailTypeForm({
                      ...mailTypeForm,
                      maxRetries: Number(e.target.value || 0),
                    })
                  }
                />
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={mailTypeForm.active}
                onChange={(e) =>
                  setMailTypeForm({
                    ...mailTypeForm,
                    active: e.target.checked,
                  })
                }
              />
              <span className="text-sm font-medium text-foreground">{t.active}</span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMailTypeDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              className={getGradientButtonClass("primary")}
              onClick={() => {
                if (editingMailType) {
                  updateMailTypeMutation.mutate(mailTypeForm);
                } else {
                  createMailTypeMutation.mutate(mailTypeForm);
                }
              }}
            >
              {editingMailType ? t.update : t.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {effectiveSelectedMailType && (
        <MailTemplateEditor
          key={`${effectiveSelectedMailType.id}-${selectedTemplate?.id ?? "new"}-${draftTemplate?.subject ?? "no-draft"}-${templateEditorOpen ? "open" : "closed"}`}
          open={templateEditorOpen}
          locale={locale}
          mailType={effectiveSelectedMailType}
          template={selectedTemplate ?? undefined}
          draftTemplate={draftTemplate ?? undefined}
          variables={variablesQuery.data || {}}
          onOpenChange={(open) => {
            setTemplateEditorOpen(open);
            if (!open) {
              setSelectedTemplate(null);
              setDraftTemplate(null);
            }
          }}
          onSave={async (template) => {
            await saveTemplateMutation.mutateAsync(template);
          }}
          onPreview={handlePreview}
          isLoading={saveTemplateMutation.isPending}
        />
      )}

      <Dialog open={templatePreviewOpen} onOpenChange={setTemplatePreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.previewDialogTitle}</DialogTitle>
            <DialogDescription>
              {t.previewDialogDescription}
            </DialogDescription>
          </DialogHeader>

          {templatePreviewData ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div
                className="rounded-md border border-border bg-background p-4 text-sm"
                dangerouslySetInnerHTML={{ __html: templatePreviewData.renderedHtml }}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.noPreview}</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplatePreviewOpen(false)}>
              {t.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
