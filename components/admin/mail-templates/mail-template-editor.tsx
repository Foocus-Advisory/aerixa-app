"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Editor } from "@/components/ui/editor";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getGradientButtonClass } from "@/lib/button-gradients";
import type { Locale } from "@/lib/i18n";
import type {
  MailTemplateRequest,
  MailTemplateResponse,
  MailTypeResponse,
  MailTemplateVariableResponse,
  MailTemplatePreviewResponse,
} from "@/lib/mail-templates-api";

interface MailTemplateEditorProps {
  open: boolean;
  locale: Locale;
  mailType?: MailTypeResponse;
  template?: MailTemplateResponse;
  draftTemplate?: MailTemplateRequest;
  variables?: Record<string, MailTemplateVariableResponse[]>;
  onOpenChange: (open: boolean) => void;
  onSave: (template: MailTemplateRequest) => Promise<void>;
  onPreview?: (template: MailTemplateRequest) => Promise<MailTemplatePreviewResponse | undefined>;
  isLoading?: boolean;
}

function createInitialFormData(
  template?: MailTemplateResponse,
  mailTypeId?: string,
  draftTemplate?: MailTemplateRequest,
): MailTemplateRequest {
  if (draftTemplate) {
    return draftTemplate;
  }

  if (template) {
    return {
      ...template,
      createNewVersion: false,
    };
  }

  return {
    mailTypeId: mailTypeId || "",
    subject: "",
    htmlContent: "",
    textContent: "",
    preview: "",
    language: "fr",
    versionNotes: "",
    createNewVersion: false,
    supportedVariables: "",
    customStyles: "",
  };
}

export function MailTemplateEditor({
  open,
  locale,
  mailType,
  template,
  draftTemplate,
  variables = {},
  onOpenChange,
  onSave,
  onPreview,
  isLoading = false,
}: MailTemplateEditorProps) {
  const t = locale === "fr"
    ? {
        editTemplate: "Editer le template",
        createTemplate: "Creer un template",
        subject: "Sujet du mail",
        subjectPlaceholder: "Sujet...",
        textTab: "Texte",
        variablesTab: "Variables",
        htmlContent: "Contenu HTML",
        tip: "Tip: Vous pouvez inserer des variables ci-dessous",
        textContent: "Contenu texte (fallback)",
        variablesAvailable: "Variables disponibles",
        clickVar: "Cliquez sur une variable pour l'inserer dans le HTML",
        language: "Langue",
        selectLanguage: "Selectionner la langue",
        searchLanguage: "Rechercher une langue...",
        createVersion: "Creer une nouvelle version",
        versionNotes: "Notes de version",
        versionNotesPlaceholder: "Decrivez les changements...",
        preview: "Apercu",
        previewing: "Apercu...",
        cancel: "Annuler",
        saving: "Enregistrement...",
        save: "Enregistrer",
      }
    : {
        editTemplate: "Edit template",
        createTemplate: "Create template",
        subject: "Mail subject",
        subjectPlaceholder: "Subject...",
        textTab: "Text",
        variablesTab: "Variables",
        htmlContent: "HTML content",
        tip: "Tip: You can insert variables below",
        textContent: "Text content (fallback)",
        variablesAvailable: "Available variables",
        clickVar: "Click a variable to insert it into HTML",
        language: "Language",
        selectLanguage: "Select language",
        searchLanguage: "Search language...",
        createVersion: "Create a new version",
        versionNotes: "Version notes",
        versionNotesPlaceholder: "Describe changes...",
        preview: "Preview",
        previewing: "Preview...",
        cancel: "Cancel",
        saving: "Saving...",
        save: "Save",
      };
  const languageOptions = [
    { value: "fr", label: "Francais", keywords: ["fr", "french", "francais", "france"] },
    { value: "en", label: "English", keywords: ["en", "english"] },
    { value: "es", label: "Espanol", keywords: ["es", "spanish", "espanol"] },
    { value: "de", label: "Deutsch", keywords: ["de", "german", "deutsch"] },
  ];

  const [formData, setFormData] = useState<MailTemplateRequest>(() => createInitialFormData(template, mailType?.id, draftTemplate));

  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<MailTemplatePreviewResponse | null>(null);

  const handleSave = async () => {
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving template:", error);
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const preview = await onPreview?.(formData);
      setPreviewData(preview ?? null);
    } catch (error) {
      console.error("Error previewing template:", error);
    } finally {
      setPreviewing(false);
    }
  };

  const insertVariable = (varCode: string) => {
    const newContent = formData.htmlContent + ` \${${varCode}}`;
    setFormData({ ...formData, htmlContent: newContent });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? t.editTemplate : t.createTemplate}
          </DialogTitle>
          <DialogDescription>
            {mailType?.name} - {mailType?.code}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t.subject}
            </label>
            <Input
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              placeholder={t.subjectPlaceholder}
              disabled={isLoading}
            />
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue="html" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="html" className="data-[state=active]:bg-linear-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white dark:data-[state=active]:from-violet-500 dark:data-[state=active]:to-cyan-400">HTML</TabsTrigger>
              <TabsTrigger value="text" className="data-[state=active]:bg-linear-to-r data-[state=active]:from-sky-500 data-[state=active]:to-blue-600 data-[state=active]:text-white dark:data-[state=active]:from-sky-500 dark:data-[state=active]:to-blue-500">{t.textTab}</TabsTrigger>
              <TabsTrigger value="variables" className="data-[state=active]:bg-linear-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white dark:data-[state=active]:from-amber-500 dark:data-[state=active]:to-orange-500">{t.variablesTab}</TabsTrigger>
            </TabsList>

            <TabsContent value="html" className="space-y-2">
              <div className="text-sm font-medium text-foreground">
                {t.htmlContent}
              </div>
              <Editor
                value={formData.htmlContent}
                onChange={(value) =>
                  setFormData({ ...formData, htmlContent: value })
                }
                mode="html"
                height="300px"
                disabled={isLoading}
              />
              <div className="text-xs text-muted-foreground p-2 bg-muted/40 rounded border border-border">
                {t.tip}
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-2">
              <div className="text-sm font-medium text-foreground">
                {t.textContent}
              </div>
              <Editor
                value={formData.textContent || ""}
                onChange={(value) =>
                  setFormData({ ...formData, textContent: value })
                }
                mode="text"
                height="300px"
                disabled={isLoading}
              />
            </TabsContent>

            <TabsContent value="variables" className="space-y-3">
              <div className="text-sm font-medium text-foreground">
                {t.variablesAvailable}
              </div>
              <div className="max-h-75 overflow-y-auto space-y-3">
                {Object.entries(variables).map(([category, vars]) => (
                  <div key={category}>
                    <h4 className="font-semibold text-xs text-muted-foreground uppercase mb-2">
                      {category}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {vars.map((variable) => (
                        <Badge
                          key={variable.id}
                          variant="outline"
                          className="cursor-pointer hover:bg-muted"
                          onClick={() => insertVariable(variable.code)}
                        >
                          {variable.code}
                          <span className="text-xs ml-1 opacity-60">
                            {variable.label}
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground italic">
                {t.clickVar}
              </p>
            </TabsContent>
          </Tabs>

          {/* Additional Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t.language}
              </label>
              <SearchableSelect
                options={languageOptions}
                value={formData.language}
                onValueChange={(value) => setFormData({ ...formData, language: value })}
                placeholder={t.selectLanguage}
                searchPlaceholder={t.searchLanguage}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-1">
                <input
                  type="checkbox"
                  checked={formData.createNewVersion}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      createNewVersion: e.target.checked,
                    })
                  }
                  disabled={isLoading}
                />
                {t.createVersion}
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t.versionNotes}
            </label>
            <textarea
              value={formData.versionNotes}
              onChange={(e) =>
                setFormData({ ...formData, versionNotes: e.target.value })
              }
              placeholder={t.versionNotesPlaceholder}
              className="w-full rounded-md border border-input bg-(--input-bg) px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              rows={2}
              disabled={isLoading}
            />
          </div>

          {/* Preview */}
          {previewData && (
            <div className="border border-border rounded-lg p-4 bg-muted/30">
              <h4 className="font-medium text-sm mb-2">{t.preview}</h4>
              <div
                className="bg-background p-4 rounded border border-border text-sm"
                dangerouslySetInnerHTML={{ __html: previewData.renderedHtml }}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            className={getGradientButtonClass("info")}
            onClick={() => handlePreview()}
            disabled={isLoading || previewing}
          >
            {previewing ? t.previewing : t.preview}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {t.cancel}
          </Button>
          <Button className={getGradientButtonClass("primary")} onClick={handleSave} disabled={isLoading}>
            {isLoading ? t.saving : t.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
