"use client";

import { useMemo, useState, type ComponentType } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  FlaskConical,
  HelpCircle,
  KeyRound,
  Link2,
  Lightbulb,
  Megaphone,
  MessageCircle,
  Radio,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  StickyNote,
  UserPlus,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t, type Guide, type GuideCalloutTone, type GuideSectionIcon, type Locale, type LocalizedText } from "@/lib/guides/types";

const SECTION_ICONS: Record<GuideSectionIcon, ComponentType<{ className?: string }>> = {
  rocket: Rocket,
  userPlus: UserPlus,
  workflow: Workflow,
  shieldCheck: ShieldCheck,
  stickyNote: StickyNote,
  messageCircle: MessageCircle,
  sparkles: Sparkles,
  settings: Settings,
  key: KeyRound,
  link: Link2,
  radio: Radio,
  flaskConical: FlaskConical,
  megaphone: Megaphone,
  helpCircle: HelpCircle,
  clipboardList: ClipboardList,
  search: Search,
  fileSpreadsheet: FileSpreadsheet,
  bellRing: BellRing,
};

const SECTION_PALETTE = [
  { dot: "bg-primary", ring: "ring-primary/20", text: "text-primary", bg: "bg-primary/10" },
  { dot: "bg-secondary", ring: "ring-secondary/20", text: "text-secondary", bg: "bg-secondary/10" },
  { dot: "bg-accent", ring: "ring-accent/20", text: "text-accent", bg: "bg-accent/10" },
];

const CALLOUT_STYLES: Record<GuideCalloutTone, { icon: ComponentType<{ className?: string }>; classes: string }> = {
  info: { icon: HelpCircle, classes: "border-accent/30 bg-accent/10 text-accent-foreground [&_*]:text-foreground" },
  success: { icon: CheckCircle2, classes: "border-success/30 bg-success/10 [&_*]:text-foreground" },
  warning: { icon: AlertTriangle, classes: "border-warning/40 bg-warning/10 [&_*]:text-foreground" },
  tip: { icon: Lightbulb, classes: "border-primary/30 bg-primary/10 [&_*]:text-foreground" },
};

function slugify(value: string, index: number): string {
  return `${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${index}`;
}

// Detecte les URLs completes (http/https) et les domaines nus mentionnes dans le texte
// (ex: business.facebook.com, developers.facebook.com/apps) pour les rendre cliquables.
const LINK_PATTERN = /(https?:\/\/[^\s)]+)|(\b(?:[a-z0-9-]+\.)+(?:com|org|net|io|app)(?:\/[^\s),.]*)?)/gi;

function linkify(text: string): Array<string | { href: string; label: string }> {
  const parts: Array<string | { href: string; label: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  LINK_PATTERN.lastIndex = 0;
  while ((match = LINK_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const label = match[0].replace(/[.,;:!?]+$/, "");
    const trailing = match[0].slice(label.length);
    const href = label.startsWith("http") ? label : `https://${label}`;
    parts.push({ href, label });
    if (trailing) parts.push(trailing);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

function LinkifiedText({ text, locale, className }: { text: LocalizedText; locale: Locale; className?: string }) {
  const resolved = t(text, locale);
  return (
    <>
      {linkify(resolved).map((part, index) =>
        typeof part === "string" ? (
          <span key={index}>{part}</span>
        ) : (
          <a
            key={index}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary", className)}
          >
            {part.label}
          </a>
        ),
      )}
    </>
  );
}

export function GuideContent({ guide, locale }: { guide: Guide; locale: Locale }) {
  const sectionIds = useMemo(() => guide.sections.map((section, index) => slugify(t(section.heading, locale), index)), [guide.sections, locale]);
  const [activeId, setActiveId] = useState<string>(sectionIds[0] ?? "");

  const scrollToSection = (id: string) => {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Sommaire */}
      <nav className="hidden lg:block">
        <div className="sticky top-24 space-y-1 rounded-2xl border border-border/60 bg-card/70 p-3">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {locale === "fr" ? "Sommaire" : "Contents"}
          </p>
          {guide.sections.map((section, index) => {
            const id = sectionIds[index];
            const palette = SECTION_PALETTE[index % SECTION_PALETTE.length];
            const Icon = section.icon ? SECTION_ICONS[section.icon] : Sparkles;
            return (
              <button
                key={id}
                type="button"
                onClick={() => scrollToSection(id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors",
                  activeId === id ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", palette.bg)}>
                  <Icon className={cn("h-3.5 w-3.5", palette.text)} />
                </span>
                <span className="truncate">{t(section.heading, locale)}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Contenu */}
      <article className="min-w-0 space-y-10">
        <header className="space-y-3 rounded-2xl border border-border/60 bg-linear-to-br from-primary/10 via-secondary/5 to-transparent p-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{t(guide.title, locale)}</h1>
          {guide.intro.map((paragraph, index) => (
            <p key={index} className="text-sm leading-relaxed text-muted-foreground md:text-base">
              <LinkifiedText text={paragraph} locale={locale} />
            </p>
          ))}
        </header>

        {guide.sections.map((section, sectionIndex) => {
          const id = sectionIds[sectionIndex];
          const palette = SECTION_PALETTE[sectionIndex % SECTION_PALETTE.length];
          const Icon = section.icon ? SECTION_ICONS[section.icon] : Sparkles;
          return (
            <section key={id} id={id} className="space-y-4 scroll-mt-24">
              <div className="flex items-center gap-3">
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-4", palette.bg, palette.ring)}>
                  <Icon className={cn("h-5 w-5", palette.text)} />
                </span>
                <h2 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">{t(section.heading, locale)}</h2>
              </div>

              <div className={cn("space-y-3 border-l-2 pl-5", palette.ring.replace("ring-", "border-"))}>
                {section.blocks.map((block, blockIndex) => {
                  switch (block.type) {
                    case "paragraph":
                      return (
                        <p key={blockIndex} className="text-sm leading-relaxed text-foreground/90 md:text-base">
                          <LinkifiedText text={block.text} locale={locale} />
                        </p>
                      );
                    case "list":
                      return block.ordered ? (
                        <ol key={blockIndex} className="space-y-2 text-sm leading-relaxed text-foreground/90 md:text-base">
                          {block.items.map((item, itemIndex) => (
                            <li key={itemIndex} className="flex gap-2.5">
                              <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white", palette.dot)}>
                                {itemIndex + 1}
                              </span>
                              <span><LinkifiedText text={item} locale={locale} /></span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <ul key={blockIndex} className="space-y-1.5 text-sm leading-relaxed text-foreground/90 md:text-base">
                          {block.items.map((item, itemIndex) => (
                            <li key={itemIndex} className="flex gap-2.5">
                              <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", palette.dot)} />
                              <span><LinkifiedText text={item} locale={locale} /></span>
                            </li>
                          ))}
                        </ul>
                      );
                    case "table":
                      return (
                        <div key={blockIndex} className="overflow-auto rounded-xl border border-border/80 bg-background/70">
                          <table className="w-full text-left text-sm">
                            <thead className={cn("text-xs uppercase tracking-wide", palette.bg, palette.text)}>
                              <tr>
                                {block.headers.map((header, headerIndex) => (
                                  <th key={headerIndex} className="px-3 py-3 font-semibold">{t(header, locale)}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {block.rows.map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-t border-border/50 hover:bg-muted/30">
                                  {row.map((cell, cellIndex) => (
                                    <td key={cellIndex} className="px-3 py-2.5"><LinkifiedText text={cell} locale={locale} /></td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    case "quote":
                      return (
                        <blockquote
                          key={blockIndex}
                          className="rounded-xl border-l-4 border-primary/60 bg-muted/30 px-4 py-3 text-sm italic text-muted-foreground md:text-base"
                        >
                          <LinkifiedText text={block.text} locale={locale} />
                        </blockquote>
                      );
                    case "callout": {
                      const style = CALLOUT_STYLES[block.tone];
                      const CalloutIcon = style.icon;
                      return (
                        <div key={blockIndex} className={cn("flex gap-3 rounded-xl border p-4", style.classes)}>
                          <CalloutIcon className="mt-0.5 h-4.5 w-4.5 shrink-0" />
                          <div className="space-y-1">
                            {block.title && <p className="text-sm font-semibold">{t(block.title, locale)}</p>}
                            <p className="text-sm leading-relaxed md:text-base"><LinkifiedText text={block.text} locale={locale} /></p>
                          </div>
                        </div>
                      );
                    }
                    case "faq":
                      return (
                        <div key={blockIndex} className="rounded-xl border border-border/70 bg-background/70 p-4 transition-colors hover:border-border">
                          <p className="flex items-center gap-2 text-sm font-semibold text-foreground md:text-base">
                            <HelpCircle className={cn("h-4 w-4", palette.text)} />
                            <LinkifiedText text={block.question} locale={locale} />
                          </p>
                          <p className="mt-1.5 pl-6 text-sm text-muted-foreground md:text-base"><LinkifiedText text={block.answer} locale={locale} /></p>
                        </div>
                      );
                    default:
                      return null;
                  }
                })}
              </div>
            </section>
          );
        })}
      </article>
    </div>
  );
}
