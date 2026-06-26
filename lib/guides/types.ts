export type Locale = "fr" | "en";

export type LocalizedText = { fr: string; en: string };

export type GuideCalloutTone = "info" | "success" | "warning" | "tip";

export type GuideBlock =
  | { type: "paragraph"; text: LocalizedText }
  | { type: "list"; ordered?: boolean; items: LocalizedText[] }
  | { type: "table"; headers: LocalizedText[]; rows: LocalizedText[][] }
  | { type: "quote"; text: LocalizedText }
  | { type: "callout"; tone: GuideCalloutTone; title?: LocalizedText; text: LocalizedText }
  | { type: "faq"; question: LocalizedText; answer: LocalizedText };

export type GuideSectionIcon =
  | "rocket"
  | "userPlus"
  | "workflow"
  | "shieldCheck"
  | "stickyNote"
  | "messageCircle"
  | "sparkles"
  | "settings"
  | "key"
  | "link"
  | "radio"
  | "flaskConical"
  | "megaphone"
  | "helpCircle"
  | "clipboardList"
  | "search"
  | "fileSpreadsheet"
  | "bellRing";

export type GuideSection = {
  heading: LocalizedText;
  icon?: GuideSectionIcon;
  blocks: GuideBlock[];
};

export type Guide = {
  title: LocalizedText;
  subtitle?: LocalizedText;
  icon?: GuideSectionIcon;
  intro: LocalizedText[];
  sections: GuideSection[];
};

export function t(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text.fr;
}
