import { jsPDF } from "jspdf";
import { t, type Guide, type GuideBlock, type GuideCalloutTone, type Locale } from "./types";

const PAGE_MARGIN = 16;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
// Interligne ~1.5x la taille de police courante (10.5pt -> ~3.7mm) pour aerer le texte.
const LINE_HEIGHT = 7.4;
const FOOTER_HEIGHT = 10;

const COLORS = {
  primary: [47, 103, 246] as const,
  secondary: [91, 92, 226] as const,
  accent: [14, 165, 233] as const,
  dark: [15, 23, 42] as const,
  text: [18, 26, 43] as const,
  textLight: [103, 117, 143] as const,
  success: [22, 163, 74] as const,
  warning: [180, 83, 9] as const,
  border: [226, 232, 240] as const,
  panelBg: [241, 245, 255] as const,
  white: [255, 255, 255] as const,
  coverIntro: [203, 213, 225] as const,
  coverMeta: [148, 163, 184] as const,
};

const SECTION_PALETTE = [COLORS.primary, COLORS.secondary, COLORS.accent];

const CALLOUT_COLORS: Record<GuideCalloutTone, readonly [number, number, number]> = {
  info: COLORS.accent,
  success: COLORS.success,
  warning: COLORS.warning,
  tip: COLORS.primary,
};

const LOGO_PATH = "/img/Logo_AERIXA_light.png";
const LOGO_ASPECT_RATIO = 12000 / 21334;

const FONT_FAMILY = "Grift";
const FONT_FILES: Record<"normal" | "bold" | "italic", string> = {
  normal: "/fonts/grift/grift-regular.ttf",
  bold: "/fonts/grift/grift-bold.ttf",
  italic: "/fonts/grift/grift-italic.ttf",
};

let cachedLogoDataUrl: Promise<string | null> | null = null;
let cachedFontRegistration: Promise<boolean> | null = null;

function loadLogoDataUrl(): Promise<string | null> {
  if (!cachedLogoDataUrl) {
    cachedLogoDataUrl = fetch(LOGO_PATH)
      .then((response) => response.blob())
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.onerror = () => reject(new Error("Impossible de lire le logo AERIXA"));
            reader.readAsDataURL(blob);
          }),
      )
      .catch(() => null);
  }
  return cachedLogoDataUrl;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function registerGriftFont(doc: jsPDF): Promise<boolean> {
  if (!cachedFontRegistration) {
    cachedFontRegistration = (async () => {
      try {
        const entries = await Promise.all(
          (Object.entries(FONT_FILES) as Array<[keyof typeof FONT_FILES, string]>).map(async ([style, path]) => {
            const response = await fetch(path);
            const buffer = await response.arrayBuffer();
            return [style, arrayBufferToBase64(buffer)] as const;
          }),
        );
        for (const [style, base64] of entries) {
          const fileName = `Grift-${style}.ttf`;
          doc.addFileToVFS(fileName, base64);
          doc.addFont(fileName, FONT_FAMILY, style === "italic" ? "italic" : style);
        }
        return true;
      } catch {
        return false;
      }
    })();
  }
  return cachedFontRegistration;
}

function setColor(doc: jsPDF, target: "fill" | "text" | "draw", rgb: readonly [number, number, number]) {
  if (target === "fill") doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  else if (target === "text") doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  else doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

function setFont(doc: jsPDF, fontReady: boolean, style: "normal" | "bold" | "italic") {
  if (fontReady) {
    doc.setFont(FONT_FAMILY, style === "italic" ? "italic" : "normal", style === "bold" ? "bold" : undefined);
  } else {
    doc.setFont("helvetica", style);
  }
}

function addFooter(doc: jsPDF, pageNumber: number, title: string, fontReady: boolean) {
  const y = PAGE_HEIGHT - FOOTER_HEIGHT + 2;
  setColor(doc, "draw", COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(PAGE_MARGIN, y - 4, PAGE_WIDTH - PAGE_MARGIN, y - 4);
  doc.setFontSize(8);
  setColor(doc, "text", COLORS.textLight);
  setFont(doc, fontReady, "normal");
  doc.text("AERIXA", PAGE_MARGIN, y);
  doc.text(title, PAGE_WIDTH / 2, y, { align: "center" });
  doc.text(String(pageNumber), PAGE_WIDTH - PAGE_MARGIN, y, { align: "right" });
}

function newPageState(doc: jsPDF, title: string, pageNumberRef: { value: number }, fontReady: boolean): number {
  pageNumberRef.value += 1;
  addFooter(doc, pageNumberRef.value, title, fontReady);
  return PAGE_MARGIN;
}

function addPageIfNeeded(doc: jsPDF, cursorY: number, neededHeight: number, title: string, pageNumberRef: { value: number }, fontReady: boolean): number {
  if (cursorY + neededHeight > PAGE_HEIGHT - PAGE_MARGIN - FOOTER_HEIGHT) {
    doc.addPage();
    return newPageState(doc, title, pageNumberRef, fontReady);
  }
  return cursorY;
}

function writeParagraph(
  doc: jsPDF,
  text: string,
  cursorY: number,
  title: string,
  pageNumberRef: { value: number },
  fontReady: boolean,
  options?: { indent?: number; fontStyle?: "normal" | "bold" | "italic"; color?: readonly [number, number, number] },
): number {
  setFont(doc, fontReady, options?.fontStyle ?? "normal");
  setColor(doc, "text", options?.color ?? COLORS.text);
  const indent = options?.indent ?? 0;
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH - indent);
  let y = cursorY;
  for (const line of lines) {
    y = addPageIfNeeded(doc, y, LINE_HEIGHT, title, pageNumberRef, fontReady);
    doc.text(line, PAGE_MARGIN + indent, y);
    y += LINE_HEIGHT;
  }
  return y;
}

function writeBlock(
  doc: jsPDF,
  block: GuideBlock,
  cursorY: number,
  accent: readonly [number, number, number],
  title: string,
  pageNumberRef: { value: number },
  locale: Locale,
  fontReady: boolean,
): number {
  let y = cursorY;
  doc.setFontSize(10.5);

  switch (block.type) {
    case "paragraph": {
      y = writeParagraph(doc, t(block.text, locale), y, title, pageNumberRef, fontReady);
      y += 3;
      break;
    }
    case "list": {
      block.items.forEach((item, index) => {
        y = addPageIfNeeded(doc, y, LINE_HEIGHT, title, pageNumberRef, fontReady);
        if (block.ordered) {
          setColor(doc, "fill", accent);
          doc.circle(PAGE_MARGIN + 1.6, y - 1.8, 2.4, "F");
          doc.setFontSize(7);
          setColor(doc, "text", COLORS.white);
          doc.text(String(index + 1), PAGE_MARGIN + 1.6, y - 1.4, { align: "center" });
          doc.setFontSize(10.5);
        } else {
          setColor(doc, "fill", accent);
          doc.circle(PAGE_MARGIN + 1.6, y - 2, 1, "F");
        }
        y = writeParagraph(doc, t(item, locale), y, title, pageNumberRef, fontReady, { indent: 6 });
      });
      y += 3;
      break;
    }
    case "quote": {
      y = addPageIfNeeded(doc, y, LINE_HEIGHT * 2, title, pageNumberRef, fontReady);
      setFont(doc, fontReady, "italic");
      const lines = doc.splitTextToSize(t(block.text, locale), CONTENT_WIDTH - 8);
      const blockHeight = lines.length * LINE_HEIGHT + 5;
      setColor(doc, "fill", COLORS.panelBg);
      doc.rect(PAGE_MARGIN, y - 4, CONTENT_WIDTH, blockHeight, "F");
      setColor(doc, "fill", accent);
      doc.rect(PAGE_MARGIN, y - 4, 1.2, blockHeight, "F");
      setColor(doc, "text", COLORS.textLight);
      let lineY = y;
      for (const line of lines) {
        doc.text(line, PAGE_MARGIN + 5, lineY);
        lineY += LINE_HEIGHT;
      }
      y = lineY + 4;
      break;
    }
    case "callout": {
      const color = CALLOUT_COLORS[block.tone];
      const lines = doc.splitTextToSize(t(block.text, locale), CONTENT_WIDTH - 8);
      const titleLines = block.title ? 1 : 0;
      const blockHeight = (lines.length + titleLines) * LINE_HEIGHT + 6;
      y = addPageIfNeeded(doc, y, blockHeight, title, pageNumberRef, fontReady);
      setColor(doc, "fill", color);
      doc.setGState(doc.GState({ opacity: 0.08 }));
      doc.roundedRect(PAGE_MARGIN, y - 4, CONTENT_WIDTH, blockHeight, 2, 2, "F");
      doc.setGState(doc.GState({ opacity: 1 }));
      setColor(doc, "draw", color);
      doc.setLineWidth(0.4);
      doc.roundedRect(PAGE_MARGIN, y - 4, CONTENT_WIDTH, blockHeight, 2, 2, "S");
      let lineY = y + 1;
      if (block.title) {
        setFont(doc, fontReady, "bold");
        setColor(doc, "text", color);
        doc.text(t(block.title, locale), PAGE_MARGIN + 4, lineY);
        lineY += LINE_HEIGHT;
      }
      setFont(doc, fontReady, "normal");
      setColor(doc, "text", COLORS.text);
      for (const line of lines) {
        doc.text(line, PAGE_MARGIN + 4, lineY);
        lineY += LINE_HEIGHT;
      }
      y = lineY + 4;
      break;
    }
    case "faq": {
      y = addPageIfNeeded(doc, y, LINE_HEIGHT * 2, title, pageNumberRef, fontReady);
      y = writeParagraph(doc, t(block.question, locale), y, title, pageNumberRef, fontReady, { fontStyle: "bold", color: accent });
      y = writeParagraph(doc, t(block.answer, locale), y, title, pageNumberRef, fontReady, { indent: 2, color: COLORS.textLight });
      y += 3;
      break;
    }
    case "table": {
      const colWidth = CONTENT_WIDTH / block.headers.length;
      y = addPageIfNeeded(doc, y, LINE_HEIGHT * 2, title, pageNumberRef, fontReady);
      setColor(doc, "fill", accent);
      doc.rect(PAGE_MARGIN, y - 4.5, CONTENT_WIDTH, LINE_HEIGHT + 1.5, "F");
      setFont(doc, fontReady, "bold");
      setColor(doc, "text", COLORS.white);
      block.headers.forEach((header, index) => {
        doc.text(t(header, locale), PAGE_MARGIN + 2 + index * colWidth, y);
      });
      y += LINE_HEIGHT + 1;
      setFont(doc, fontReady, "normal");
      block.rows.forEach((row, rowIndex) => {
        const cellLines = row.map((cell) => doc.splitTextToSize(t(cell, locale), colWidth - 4));
        const rowHeight = Math.max(...cellLines.map((lines) => lines.length)) * LINE_HEIGHT;
        y = addPageIfNeeded(doc, y, rowHeight, title, pageNumberRef, fontReady);
        if (rowIndex % 2 === 0) {
          setColor(doc, "fill", COLORS.panelBg);
          doc.rect(PAGE_MARGIN, y - 4, CONTENT_WIDTH, rowHeight, "F");
        }
        setColor(doc, "text", COLORS.text);
        cellLines.forEach((lines, index) => {
          doc.text(lines, PAGE_MARGIN + 2 + index * colWidth, y);
        });
        y += rowHeight;
      });
      y += 4;
      break;
    }
  }

  return y;
}

export async function generateGuidePdf(guide: Guide, locale: Locale): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageNumberRef = { value: 0 };
  const title = t(guide.title, locale);
  const fontReady = await registerGriftFont(doc);

  // Page de garde
  setColor(doc, "fill", COLORS.dark);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F");
  setColor(doc, "fill", COLORS.primary);
  doc.setGState(doc.GState({ opacity: 0.25 }));
  doc.circle(PAGE_WIDTH - 20, 30, 60, "F");
  setColor(doc, "fill", COLORS.secondary);
  doc.circle(10, PAGE_HEIGHT - 40, 50, "F");
  doc.setGState(doc.GState({ opacity: 1 }));

  const logoDataUrl = await loadLogoDataUrl();
  if (logoDataUrl) {
    const logoWidth = 32;
    const logoHeight = logoWidth * LOGO_ASPECT_RATIO;
    doc.addImage(logoDataUrl, "PNG", PAGE_MARGIN, 16, logoWidth, logoHeight);
  } else {
    doc.setFontSize(13);
    setFont(doc, fontReady, "bold");
    setColor(doc, "text", COLORS.white);
    doc.text("AERIXA", PAGE_MARGIN, 28);
  }

  doc.setFontSize(24);
  setFont(doc, fontReady, "bold");
  setColor(doc, "text", COLORS.white);
  const titleLines = doc.splitTextToSize(title, CONTENT_WIDTH);
  let titleY = PAGE_HEIGHT / 2 - (titleLines.length * 10) / 2;
  for (const line of titleLines) {
    doc.text(line, PAGE_MARGIN, titleY);
    titleY += 10;
  }

  doc.setFontSize(12);
  setFont(doc, fontReady, "normal");
  setColor(doc, "text", COLORS.coverIntro);
  let introY = titleY + 8;
  for (const paragraph of guide.intro) {
    const lines = doc.splitTextToSize(t(paragraph, locale), CONTENT_WIDTH);
    for (const line of lines) {
      doc.text(line, PAGE_MARGIN, introY);
      introY += 7.5;
    }
  }

  doc.setFontSize(9);
  setFont(doc, fontReady, "normal");
  setColor(doc, "text", COLORS.coverMeta);
  const generatedLabel = locale === "fr" ? "Genere le" : "Generated on";
  doc.text(`${generatedLabel} ${new Date().toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US")}`, PAGE_MARGIN, PAGE_HEIGHT - PAGE_MARGIN);

  // Contenu
  doc.addPage();
  let y = newPageState(doc, title, pageNumberRef, fontReady);

  guide.sections.forEach((section, sectionIndex) => {
    const accent = SECTION_PALETTE[sectionIndex % SECTION_PALETTE.length];
    y = addPageIfNeeded(doc, y, 14, title, pageNumberRef, fontReady);

    setColor(doc, "fill", accent);
    doc.circle(PAGE_MARGIN + 3, y - 1.5, 3, "F");
    doc.setFontSize(14);
    setFont(doc, fontReady, "bold");
    setColor(doc, "text", COLORS.dark);
    doc.text(t(section.heading, locale), PAGE_MARGIN + 9, y);
    y += 4;
    setColor(doc, "draw", accent);
    doc.setLineWidth(0.6);
    doc.line(PAGE_MARGIN, y, PAGE_MARGIN + 30, y);
    y += 7;

    for (const block of section.blocks) {
      y = writeBlock(doc, block, y, accent, title, pageNumberRef, locale, fontReady);
    }
    y += 4;
  });

  return doc;
}

export async function downloadGuidePdf(guide: Guide, locale: Locale, fileName: string): Promise<void> {
  const doc = await generateGuidePdf(guide, locale);
  doc.save(fileName);
}
