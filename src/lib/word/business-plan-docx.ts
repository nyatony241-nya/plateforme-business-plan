import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ExternalHyperlink,
  HeadingLevel,
  HeightRule,
  type IParagraphOptions,
  ImageRun,
  LevelFormat,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import type { PhotoSlot, PlanPhoto } from "@/lib/business-plan";
import { SECTIONS, buildPlanView, paragraphs, photoSourceName, photoSourceUrl, stars, type PlanViewInput } from "@/lib/business-plan-view";
import { brand } from "@/config/brand";
import { reportDownload } from "@/lib/images/photos";
import { WORD_FONT, getPlanDesign, patternBandColors, type PlanDesign } from "@/lib/plan-designs";

const MUTED = "6B7280";
const LINE = "D9D3C7";

/** Couleurs (hex sans #), polices et styles Word du design choisi. */
type WordTheme = {
  id: string;
  primary: string;
  accent: string;
  soft: string;
  ink: string;
  paper: string;
  highlight: string;
  display: string;
  body: string;
  heading: PlanDesign["heading"];
  cover: PlanDesign["cover"];
  kpi: PlanDesign["kpi"];
  table: PlanDesign["table"];
  band: string[];
};

const hex = (c: string) => c.replace("#", "").toUpperCase();

function wordTheme(d: PlanDesign): WordTheme {
  return {
    id: d.id,
    primary: hex(d.primary),
    accent: hex(d.accent),
    soft: hex(d.soft),
    ink: hex(d.ink),
    paper: hex(d.paper),
    highlight: hex(d.highlight),
    display: WORD_FONT[d.display],
    body: WORD_FONT[d.body],
    heading: d.heading,
    cover: d.cover,
    kpi: d.kpi,
    table: d.table,
    band: patternBandColors(d.pattern),
  };
}

/** Mélange une couleur avec du blanc (part de la couleur entre 0 et 1). */
function tint(color: string, part: number): string {
  const c = [0, 2, 4].map((i) => parseInt(color.slice(i, i + 2), 16));
  return c.map((x) => Math.round(255 - (255 - x) * part).toString(16).padStart(2, "0")).join("").toUpperCase();
}

const KENTE_BLACK = "15120C";
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const pad = (n: number) => String(n).padStart(2, "0");

// A4 en twips (1 cm ≈ 567 twips), marges de 1,8 cm.
const PAGE = { width: 11906, height: 16838, margin: 1020 };
const CONTENT = PAGE.width - 2 * PAGE.margin;

const p = (text: string, opts: { bold?: boolean; color?: string; size?: number; after?: number } = {}) =>
  new Paragraph({
    spacing: { after: opts.after ?? 120, line: 300 },
    children: [new TextRun({ text, bold: opts.bold, color: opts.color, size: opts.size })],
  });

const prose = (text: string) => paragraphs(text).map((t) => p(t));

type RunOpts = { size?: number; color?: string; bold?: boolean; italics?: boolean; font?: string; fill?: string; spacing?: number; caps?: boolean };
const run = (text: string, o: RunOpts = {}) =>
  new TextRun({
    text,
    size: o.size,
    color: o.color,
    bold: o.bold,
    italics: o.italics,
    font: o.font,
    allCaps: o.caps,
    characterSpacing: o.spacing,
    shading: o.fill ? { type: ShadingType.CLEAR, color: "auto", fill: o.fill } : undefined,
  });

type ParaOpts = { center?: boolean; before?: number; after?: number; heading?: boolean; keepNext?: boolean };
const para = (children: TextRun[], o: ParaOpts & Omit<IParagraphOptions, "children" | "heading" | "alignment" | "keepNext" | "spacing"> = {}) => {
  const { center, before, after, heading, keepNext, ...rest } = o;
  return new Paragraph({
    ...rest,
    heading: heading ? HeadingLevel.HEADING_2 : undefined,
    alignment: center ? AlignmentType.CENTER : undefined,
    keepNext: keepNext ?? heading,
    spacing: { before, after: after ?? 120 },
    children,
  });
};

/** Titre de partie : un style propre à chaque design, comme à l'écran. */
function h2(n: number, t: WordTheme): (Paragraph | Table)[] {
  const { emoji, title } = SECTIONS[n - 1];
  const font = t.display;
  const before = 440;
  switch (t.heading) {
    case "pastille":
      return [
        para([run(` ${n} `, { bold: true, size: 30, color: "FFFFFF", font, fill: t.primary }), run(`  ${title} ${emoji}`, { bold: true, size: 30, color: t.ink, font })], {
          heading: true,
          before,
          after: 180,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: t.highlight, space: 6 } },
        }),
      ];
    case "romain":
      return [
        para([run(`Chapitre ${ROMAN[n - 1]}`, { size: 18, bold: true, color: t.accent, caps: true, spacing: 80 })], { center: true, before, after: 40, keepNext: true }),
        para([run(`${emoji} ${title}`, { size: 34, bold: true, color: t.primary, font })], { center: true, heading: true, after: 40 }),
        para([run("────  ❦  ────", { size: 20, color: t.accent })], { center: true, after: 200, keepNext: true }),
      ];
    case "detoure":
      return [
        para([run(pad(n), { size: 64, bold: true, color: tint(t.primary, 0.35), font }), run(`  ${title} ${emoji}`, { size: 30, bold: true, color: t.ink, font })], {
          heading: true,
          before,
          after: 180,
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: tint(t.primary, 0.2), space: 4 } },
        }),
      ];
    case "etiquette":
      return [
        para([run(` ${pad(n)} `, { size: 38, color: t.highlight, font, fill: KENTE_BLACK }), run(` ${title} ${emoji} `, { size: 38, color: t.ink, font, fill: t.soft, caps: true })], {
          heading: true,
          before,
          after: 60,
        }),
        ...patternBand(t, 90, 200),
      ];
    case "zigzag":
      return [
        para([run(`${emoji}  `, { size: 32 }), run(`${n}. `, { size: 32, color: t.accent, font }), run(title, { size: 32, color: t.primary, font })], {
          heading: true,
          before,
          after: 180,
          border: { bottom: { style: BorderStyle.WAVE, size: 12, color: t.highlight, space: 6 } },
        }),
      ];
    case "ornement":
      return [
        para([run(`◆  Partie ${n}  ◆`, { size: 16, bold: true, color: t.accent, caps: true, spacing: 70 })], { center: true, before, after: 40, keepNext: true }),
        para([run(`${title} ${emoji}`, { size: 34, bold: true, color: t.primary, font })], { center: true, heading: true, after: 40 }),
        para([run("──────────  ◆  ──────────", { size: 16, color: t.highlight })], { center: true, after: 200, keepNext: true }),
      ];
    case "feuille":
      return [
        para([run(` ${n} `, { bold: true, size: 30, color: "FFFFFF", font, fill: t.primary }), run(`  ${title} ${emoji}`, { bold: true, size: 30, color: t.ink, font })], {
          heading: true,
          before,
          after: 180,
          border: { bottom: { style: BorderStyle.DOTTED, size: 8, color: t.primary, space: 6 } },
        }),
      ];
    case "surligne":
      return [
        para([run(`${n}  `, { size: 36, color: t.primary, font }), run(` ${title} `, { size: 36, color: t.ink, font, fill: tint(t.highlight, 0.7), caps: true }), run(`  ${emoji}`, { size: 30 })], {
          heading: true,
          before,
          after: 180,
        }),
      ];
    case "magazine":
      return [
        para([run(pad(n), { size: 56, color: t.primary, font }), run(`   ${title} ${emoji}`, { size: 34, color: t.ink, font })], {
          heading: true,
          before,
          after: 180,
          border: { top: { style: BorderStyle.SINGLE, size: 18, color: t.primary, space: 8 } },
        }),
      ];
    case "bandeau":
      return [
        para([run(`  ${n}  `, { bold: true, size: 26, color: t.primary, fill: "FFFFFF" }), run(`   ${title} ${emoji}`, { bold: true, size: 28, color: "FFFFFF", font })], {
          heading: true,
          before,
          after: 180,
          shading: { type: ShadingType.CLEAR, color: "auto", fill: t.primary },
          border: { top: { style: BorderStyle.SINGLE, size: 24, color: t.primary, space: 4 }, bottom: { style: BorderStyle.SINGLE, size: 24, color: t.primary, space: 4 } },
        }),
      ];
  }
}

const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE };

/** Bande de motif (kente, bogolan, adire, wax) : une rangée de cases colorées. */
function patternBand(t: WordTheme, height = 160, after = 160) {
  if (t.band.length === 0) return [];
  const col = Math.round(CONTENT / t.band.length);
  return [
    new Table({
      width: { size: CONTENT, type: WidthType.DXA },
      columnWidths: t.band.map(() => col),
      rows: [
        new TableRow({
          height: { value: height, rule: HeightRule.EXACT },
          children: t.band.map(
            (fill) =>
              new TableCell({
                width: { size: col, type: WidthType.DXA },
                borders: NO_BORDERS,
                shading: { type: ShadingType.CLEAR, color: "auto", fill },
                children: [new Paragraph({ children: [new TextRun({ text: "", size: 2 })] })],
              }),
          ),
        }),
      ],
    }),
    new Paragraph({ spacing: { after }, children: [] }),
  ];
}

type Border = { style: (typeof BorderStyle)[keyof typeof BorderStyle]; size: number; color: string };
const line = (style: Border["style"], size: number, color: string): Border => ({ style, size, color });
const all = (b: Border) => ({ top: b, bottom: b, left: b, right: b });

/** Encadré d'une seule case (couvertures). */
function box(
  children: (Paragraph | Table)[],
  o: { fill?: string; borders?: ReturnType<typeof all> | typeof NO_BORDERS; margin?: number; width?: number } = {},
) {
  const width = o.width ?? CONTENT;
  const m = o.margin ?? 400;
  return new Table({
    width: { size: width, type: WidthType.DXA },
    columnWidths: [width],
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: width, type: WidthType.DXA },
            borders: o.borders ?? NO_BORDERS,
            shading: o.fill ? { type: ShadingType.CLEAR, color: "auto", fill: o.fill } : undefined,
            margins: { top: m, bottom: m, left: m, right: m },
            children,
          }),
        ],
      }),
    ],
  });
}

// Photos : 16:7 environ, sur toute la largeur du texte (en pixels à 96 ppp).
const IMAGE_WIDTH = 640;

const PHOTO_HOSTS = ["https://images.unsplash.com/", "https://images.pexels.com/"];

/** Télécharge les photos pour les intégrer au fichier ; une photo indisponible est omise. */
async function loadPhotos(photos: Partial<Record<PhotoSlot, PlanPhoto>>) {
  const loaded: Partial<Record<PhotoSlot, { photo: PlanPhoto; data: Uint8Array }>> = {};
  await Promise.all(
    Object.entries(photos).map(async ([slot, photo]) => {
      if (!photo || !PHOTO_HOSTS.some((host) => photo.src.startsWith(host))) return;
      try {
        const res = await fetch(photo.src, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return;
        loaded[slot as PhotoSlot] = { photo, data: new Uint8Array(await res.arrayBuffer()) };
        await reportDownload(photo);
      } catch {
        // Photo omise.
      }
    }),
  );
  return loaded;
}

function photoBlock(item?: { photo: PlanPhoto; data: Uint8Array }, o: { width?: number; ratio?: number; center?: boolean; light?: boolean } = {}) {
  if (!item) return [];
  const width = o.width ?? IMAGE_WIDTH;
  const ratio = o.ratio ?? 627 / 1200;
  const credit = o.light ? "E5E7EB" : MUTED;
  const alignment = o.center ? AlignmentType.CENTER : undefined;
  return [
    new Paragraph({
      keepNext: true,
      alignment,
      spacing: { before: 120, after: 40 },
      children: [
        new ImageRun({
          type: "jpg",
          data: item.data,
          transformation: { width, height: Math.round(width * ratio) },
          altText: { name: "Photo", description: item.photo.alt || "Photo", title: "Photo" },
        }),
      ],
    }),
    new Paragraph({
      alignment,
      spacing: { after: 160 },
      children: [
        new TextRun({ text: "📷 Photo de ", size: 16, color: credit }),
        new ExternalHyperlink({
          link: item.photo.photographerUrl,
          children: [new TextRun({ text: item.photo.photographer, size: 16, color: credit, underline: {} })],
        }),
        new TextRun({ text: " sur ", size: 16, color: credit }),
        new ExternalHyperlink({
          link: photoSourceUrl(item.photo),
          children: [new TextRun({ text: photoSourceName(item.photo), size: 16, color: credit, underline: {} })],
        }),
      ],
    }),
  ];
}

const h3 = (title: string) =>
  new Paragraph({
    keepNext: true,
    spacing: { before: 160, after: 80 },
    children: [new TextRun({ text: title, bold: true, size: 22 })],
  });

const bullet = (text: string) =>
  new Paragraph({ numbering: { reference: "puces", level: 0 }, spacing: { after: 60 }, children: [new TextRun(text)] });

const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const borders = { top: border, bottom: border, left: border, right: border };

/** Tableau : première ligne en en-tête si `header`, au style du design ; colonnes numériques à droite. */
function table(
  rows: string[][],
  widths: number[],
  t: WordTheme,
  opts: { header?: boolean; numeric?: number[]; boldLast?: boolean } = {},
) {
  const total = widths.reduce((sum, w) => sum + w, 0);
  const cols = widths.map((w) => Math.round((w / total) * CONTENT));
  const heavy = line(BorderStyle.SINGLE, 12, t.ink);
  const cellBorders = (r: number) => {
    if (t.table !== "filet") return borders;
    return {
      top: r === 0 ? heavy : NONE,
      bottom: r === rows.length - 1 || (opts.header && r === 0) ? heavy : border,
      left: NONE,
      right: NONE,
    };
  };
  const headFill = t.table === "fonce" ? t.primary : t.table === "doux" ? t.soft : undefined;
  const headColor = t.table === "fonce" ? "FFFFFF" : t.table === "filet" ? t.ink : MUTED;
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: cols,
    rows: rows.map((cells, r) => {
      const head = opts.header && r === 0;
      const zebra = !head && r % 2 === (opts.header ? 0 : 1);
      return new TableRow({
        cantSplit: true,
        tableHeader: head,
        children: cells.map(
          (text, c) =>
            new TableCell({
              width: { size: cols[c], type: WidthType.DXA },
              borders: cellBorders(r),
              shading: head && headFill ? { type: ShadingType.CLEAR, color: "auto", fill: headFill } : zebra ? { type: ShadingType.CLEAR, color: "auto", fill: tint(t.soft, 0.5) } : undefined,
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: opts.numeric?.includes(c) ? AlignmentType.RIGHT : AlignmentType.LEFT,
                  children: [
                    new TextRun({
                      text,
                      allCaps: head && t.table === "filet",
                      size: 19,
                      bold: head || (opts.boldLast && r === rows.length - 1),
                      color: head ? headColor : undefined,
                    }),
                  ],
                }),
              ],
            }),
        ),
      });
    }),
  });
}

const spacer = (after = 120) => new Paragraph({ spacing: { after }, children: [] });

/** Chiffres clés : une ligne de 4 cases, au style du design. */
function kpiTable(kpis: { emoji: string; label: string; value: string }[], t: WordTheme) {
  const col = Math.round(CONTENT / kpis.length);
  const white = line(BorderStyle.SINGLE, 12, "FFFFFF");
  type Look = { fill?: string; borders: ReturnType<typeof all>; label: string; value: string; center?: boolean; caps?: boolean };
  const look = (i: number): Look => {
    switch (t.kpi) {
      case "carte":
        return { fill: t.soft, borders: { ...all(white), top: line(BorderStyle.SINGLE, 24, t.highlight) }, label: "3F4A45", value: t.ink };
      case "contour":
        return { borders: all(line(BorderStyle.SINGLE, 6, t.accent)), label: t.accent, value: t.primary, center: true, caps: true };
      case "barre":
        return { fill: t.soft, borders: { ...all(white), left: line(BorderStyle.SINGLE, 36, t.primary) }, label: "3F4A45", value: t.primary };
      case "sombre":
        return { fill: KENTE_BLACK, borders: all(line(BorderStyle.SINGLE, 12, "3A3326")), label: "E5E7EB", value: t.highlight };
      case "tampon":
        return { borders: all(line(BorderStyle.DASHED, 12, t.accent)), label: t.accent, value: t.primary, caps: true };
      case "dore":
        return { fill: t.primary, borders: { ...all(line(BorderStyle.SINGLE, 12, t.primary)), top: line(BorderStyle.SINGLE, 18, t.highlight) }, label: t.highlight, value: "FFFFFF", center: true, caps: true };
      case "pastel":
        return { fill: tint([t.primary, t.highlight, t.accent, t.primary][i % 4], 0.14), borders: all(white), label: "3F4A45", value: t.ink };
      case "sommet":
        return { borders: { ...all(border), top: line(BorderStyle.SINGLE, 48, [t.primary, t.accent, t.highlight, t.primary][i % 4]) }, label: "3F4A45", value: t.ink, caps: true };
      case "filet":
        return {
          borders: { top: line(BorderStyle.SINGLE, 12, t.ink), bottom: line(BorderStyle.SINGLE, 12, t.ink), left: i === 0 ? NONE : line(BorderStyle.SINGLE, 4, LINE), right: NONE },
          label: MUTED,
          value: t.ink,
          caps: true,
        };
      case "plein":
        return { fill: t.primary, borders: all(white), label: "E5E7EB", value: "FFFFFF" };
    }
  };
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: kpis.map(() => col),
    rows: [
      new TableRow({
        cantSplit: true,
        children: kpis.map((k, i) => {
          const l = look(i);
          const alignment = l.center ? AlignmentType.CENTER : undefined;
          return new TableCell({
            width: { size: col, type: WidthType.DXA },
            borders: l.borders,
            shading: l.fill ? { type: ShadingType.CLEAR, color: "auto", fill: l.fill } : undefined,
            margins: { top: 140, bottom: 140, left: 140, right: 140 },
            children: [
              new Paragraph({ alignment, children: [new TextRun({ text: k.emoji, size: 28 })] }),
              new Paragraph({ alignment, spacing: { before: 60 }, children: [run(k.label, { size: 16, color: l.label, bold: true, caps: l.caps })] }),
              new Paragraph({ alignment, spacing: { before: 40 }, children: [run(k.value, { size: 24, bold: true, color: l.value, font: t.display })] }),
            ],
          });
        }),
      }),
    ],
  });
}

type Loaded = Awaited<ReturnType<typeof loadPhotos>>;
type CoverText = { title: string; subtitle: string; dateLine: string };

/** Couverture Word : la mise en page propre au design, dans la limite de ce que Word sait faire. */
function wordCover(t: WordTheme, v: CoverText, photos: Loaded): (Paragraph | Table)[] {
  const photo = photos.couverture;
  const font = t.display;
  const title = (color: string, o: { size?: number; caps?: boolean; center?: boolean } = {}) =>
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: o.center ? AlignmentType.CENTER : undefined,
      spacing: { before: 120, after: 160 },
      children: [run(v.title, { size: o.size ?? 56, bold: true, color, font, caps: o.caps })],
    });
  const text = (value: string, o: RunOpts & { center?: boolean; after?: number } = {}) =>
    para([run(value, o)], { center: o.center, after: o.after ?? 100 });
  switch (t.cover) {
    case "arcs":
      return [
        text(" 🚀 BUSINESS PLAN ", { bold: true, size: 18, color: "FFFFFF", fill: t.primary, after: 160 }),
        title(t.ink),
        text("▬▬▬▬", { color: t.highlight, size: 28, after: 120 }),
        text(v.subtitle, { size: 26, color: "3F4A45" }),
        text(v.dateLine, { size: 18, color: MUTED, after: 200 }),
        ...photoBlock(photo),
      ];
    case "cadre":
      return [
        box(
          [
            text("❦", { center: true, size: 40, color: t.accent }),
            text("BUSINESS PLAN", { center: true, size: 18, bold: true, color: t.accent, spacing: 100 }),
            title(t.primary, { center: true }),
            text("────  ◆  ────", { center: true, color: t.accent }),
            text(v.subtitle, { center: true, size: 26, italics: true, color: "3F4A45", after: 160 }),
            ...photoBlock(photo, { width: 460, center: true }),
            text(v.dateLine, { center: true, size: 18, color: MUTED }),
          ],
          { borders: all(line(BorderStyle.DOUBLE, 12, t.primary)), margin: 480 },
        ),
      ];
    case "partage": {
      const half = Math.round(CONTENT / 2);
      return [
        new Table({
          width: { size: CONTENT, type: WidthType.DXA },
          columnWidths: [half, CONTENT - half],
          rows: [
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  width: { size: half, type: WidthType.DXA },
                  borders: NO_BORDERS,
                  shading: { type: ShadingType.CLEAR, color: "auto", fill: t.primary },
                  margins: { top: 480, bottom: 480, left: 400, right: 400 },
                  children: [
                    text("BUSINESS PLAN", { size: 18, bold: true, color: "E5E7EB", spacing: 60, after: 160 }),
                    title("FFFFFF", { size: 48 }),
                    text("▬▬▬", { color: t.highlight, size: 24 }),
                    text(v.subtitle, { size: 24, color: "FFFFFF" }),
                    text(v.dateLine, { size: 18, color: "E5E7EB" }),
                  ],
                }),
                new TableCell({
                  width: { size: CONTENT - half, type: WidthType.DXA },
                  borders: NO_BORDERS,
                  verticalAlign: VerticalAlign.CENTER,
                  shading: { type: ShadingType.CLEAR, color: "auto", fill: t.soft },
                  margins: { top: 0, bottom: 0, left: 0, right: 0 },
                  children: photo ? photoBlock(photo, { width: 320, ratio: 0.75, center: true }) : [new Paragraph({ children: [] })],
                }),
              ],
            }),
          ],
        }),
      ];
    }
    case "kente":
      return [
        ...patternBand(t, 360, 0),
        box(
          [
            text("BUSINESS PLAN", { size: 28, color: t.highlight, font, spacing: 120 }),
            title(t.highlight, { size: 80, caps: true }),
            text(v.subtitle, { size: 26, color: "FFFFFF" }),
            text(v.dateLine, { size: 18, color: "D1D5DB", after: 160 }),
            ...photoBlock(photo, { width: 560, light: true }),
          ],
          { fill: KENTE_BLACK, margin: 480 },
        ),
        ...patternBand(t, 360, 160),
      ];
    case "bogolan":
      return [
        ...patternBand(t, 240, 0),
        box(
          [
            ...photoBlock(photo, { width: 560 }),
            text("BUSINESS PLAN", { size: 18, bold: true, color: t.accent, spacing: 80 }),
            title(t.primary),
            text("︿﹀︿﹀︿﹀︿﹀︿﹀", { color: t.highlight, size: 22 }),
            text(v.subtitle, { size: 26, color: "3F4A45" }),
            text(v.dateLine, { size: 18, color: MUTED }),
          ],
          { fill: t.paper, borders: all(line(BorderStyle.THICK_THIN_SMALL_GAP, 24, t.accent)), margin: 400 },
        ),
        ...patternBand(t, 240, 160),
      ];
    case "etoile":
      return [
        box(
          [
            text("✦  BUSINESS PLAN  ✦", { center: true, size: 18, bold: true, color: t.highlight, spacing: 120, after: 200 }),
            title("FFFFFF", { center: true }),
            text("──────  ◆  ──────", { center: true, color: t.highlight }),
            text(v.subtitle, { center: true, size: 26, italics: true, color: "E5E7EB", after: 200 }),
            ...photoBlock(photo, { width: 300, ratio: 0.75, center: true, light: true }),
            text(v.dateLine, { center: true, size: 18, color: "D1D5DB" }),
          ],
          { fill: t.primary, borders: all(line(BorderStyle.DOUBLE, 12, t.highlight)), margin: 560 },
        ),
      ];
    case "organique":
      return [
        box(
          [
            text("🌿 Business plan", { size: 22, bold: true, color: t.accent }),
            title(t.primary),
            text(v.subtitle, { size: 26, color: "3F4A45" }),
            text(v.dateLine, { size: 18, color: MUTED }),
          ],
          { fill: tint(t.highlight, 0.18), margin: 480 },
        ),
        spacer(),
        ...photoBlock(photo),
      ];
    case "geometrique": {
      const glyphs = ["●", "▲", "◗", "◢", "≡", "○", "▼", "◖", "◣"];
      const colors = [t.primary, t.highlight, t.accent];
      const col = Math.round(CONTENT / glyphs.length);
      return [
        new Table({
          width: { size: CONTENT, type: WidthType.DXA },
          columnWidths: glyphs.map(() => col),
          rows: [
            new TableRow({
              height: { value: 900, rule: HeightRule.EXACT },
              children: glyphs.map(
                (g, i) =>
                  new TableCell({
                    width: { size: col, type: WidthType.DXA },
                    borders: NO_BORDERS,
                    verticalAlign: VerticalAlign.CENTER,
                    shading: { type: ShadingType.CLEAR, color: "auto", fill: colors[i % 3] },
                    children: [para([run(g, { size: 40, color: i % 3 === 1 ? t.primary : "FFFFFF" })], { center: true, after: 0 })],
                  }),
              ),
            }),
          ],
        }),
        spacer(200),
        text("BUSINESS PLAN", { size: 28, color: t.accent, font, spacing: 100 }),
        title(t.primary, { size: 84, caps: true }),
        text(v.subtitle, { size: 26, color: "3F4A45" }),
        text(v.dateLine, { size: 18, color: MUTED, after: 200 }),
        ...photoBlock(photo),
      ];
    }
    case "magazine":
      return [
        para([run("BUSINESS PLAN", { size: 44, color: t.ink, font, spacing: 60 }), run("\tN° 01", { size: 16, bold: true, color: MUTED })], {
          after: 60,
          tabStops: [{ type: TabStopType.RIGHT, position: CONTENT }],
          border: { top: line(BorderStyle.SINGLE, 24, t.ink), bottom: line(BorderStyle.SINGLE, 24, t.ink) },
        }),
        para([run(v.dateLine, { size: 16, color: MUTED, caps: true, spacing: 40 })], { after: 360, border: { bottom: line(BorderStyle.SINGLE, 4, LINE) } }),
        title(t.ink, { size: 88 }),
        para([run(v.subtitle, { size: 30, italics: true, color: "3F4A45" })], {
          after: 240,
          indent: { left: 240 },
          border: { left: { ...line(BorderStyle.SINGLE, 24, t.ink), space: 10 } },
        }),
        ...photoBlock(photo),
      ];
    case "adire":
      return [
        ...patternBand(t, 300, 0),
        box(
          [
            text("BUSINESS PLAN", { center: true, size: 18, bold: true, color: t.accent, spacing: 100 }),
            title(t.primary, { center: true }),
            text(v.subtitle, { center: true, size: 26, color: "3F4A45" }),
            text(v.dateLine, { center: true, size: 18, color: MUTED }),
          ],
          { borders: all(line(BorderStyle.SINGLE, 36, t.primary)), margin: 480 },
        ),
        ...patternBand(t, 300, 160),
        ...photoBlock(photo),
      ];
  }
}

/** Fichier Word du business plan, identique au contenu de la page et du PDF. */
export async function businessPlanDocx(input: PlanViewInput, design: PlanDesign = getPlanDesign(null)): Promise<Buffer> {
  const { doc } = input;
  const v = buildPlanView(input);
  const photos = await loadPhotos(v.photos);
  const t = wordTheme(design);
  const tbl = (rows: string[][], widths: number[], opts: { header?: boolean; numeric?: number[]; boldLast?: boolean } = {}) =>
    table(rows, widths, t, opts);

  const children = [
    ...wordCover(t, v, photos),
    spacer(200),
    kpiTable(v.kpis, t),
    new Paragraph({ children: [new PageBreak()] }),

    ...h2(1, t),
    ...prose(doc.resume),

    ...h2(2, t),
    ...prose(doc.projet),
    ...photoBlock(photos.projet),
    h3("🛍️ Ce que nous vendons"),
    ...v.offers.map(bullet),

    ...h2(3, t),
    ...photoBlock(photos.marche),
    h3("🧑‍🤝‍🧑 Clientèle"),
    ...prose(doc.marche.clientele),
    h3("🏪 Concurrence"),
    ...prose(doc.marche.concurrence),
    h3("🛒 Habitudes d'achat"),
    ...prose(doc.marche.tendances),

    ...h2(4, t),
    ...prose(doc.emplacement.analyse),
    ...(doc.emplacement.criteres.length > 0
      ? [
          tbl(
            [["Critère", "Note", "Commentaire"], ...doc.emplacement.criteres.map((c) => [c.critere, stars(c.note), c.commentaire])],
            [3, 1.7, 5.5],
            { header: true },
          ),
        ]
      : []),
    p("ℹ️ Notes indicatives, à confirmer par une visite sur place.", { size: 17, color: MUTED }),

    ...h2(5, t),
    h3("🧱 Investissements de départ"),
    tbl(
      [...v.investments.map((inv) => [`${inv.label} (${inv.kind})`, inv.amount]), ["Total", v.investmentsTotal]],
      [7, 3],
      { numeric: [1], boldLast: true },
    ),
    h3("🏦 Financement"),
    p(v.financing),
    ...(v.shortfall ? [p(v.shortfall, { bold: true, color: "B42318" })] : []),
    h3(v.forecastTitle),
    tbl(
      [["En FCFA", ...v.forecastYears], ...v.forecastRows.map((row) => [row.label, ...row.values])],
      [4, ...v.forecastYears.map(() => 2)],
      { header: true, numeric: v.forecastYears.map((_, i) => i + 1) },
    ),
    h3("🔀 Trois scénarios pour la première année"),
    tbl(
      [["Scénario", "Ventes", "Bénéfice"], ...v.scenarios.map((s) => [s.label, s.revenue, s.net])],
      [4, 3, 3],
      { header: true, numeric: [1, 2] },
    ),
    spacer(),
    ...(v.breakdownLine ? [p(`🧮 ${v.breakdownLine}`)] : []),
    ...(v.references.length > 0
      ? [
          h3("📍 Repères locaux utilisés"),
          ...v.references.map((r) => p(`${r.text}. Source : ${r.source}.`, { size: 18, after: 60 })),
        ]
      : []),
    p(`👉 ${v.outlook}`),

    ...h2(6, t),
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({ text: "🎯 Message : ", bold: true }), new TextRun(doc.marketing.message)],
    }),
    ...photoBlock(photos.marketing),
    tbl(
      [["Canal", "Action", "Budget par mois"], ...v.marketing.map((c) => [`${c.emoji} ${c.canal}`, c.action, c.budget])],
      [2.2, 6, 2.4],
      { header: true, numeric: [2] },
    ),
    ...(v.marketingWithoutBudget ? [p("Aucun budget marketing n'est prévu dans le plan financier.", { size: 18, color: MUTED })] : []),
    h3("🗓️ Les 90 premiers jours"),
    ...doc.marketing.calendrier.flatMap((period) => [
      p(`📅 ${period.periode}`, { bold: true, after: 60 }),
      ...period.actions.map(bullet),
    ]),

    ...h2(7, t),
    ...doc.risques.flatMap((x) => [p(`🔸 ${x.risque}`, { bold: true, after: 40 }), p(`✅ ${x.parade}`, { color: "3F4A45" })]),

    ...h2(8, t),
    ...v.creationLines.map((line) => p(`🏛️ ${line}`, { after: 60 })),
    ...doc.demarches.map(
      (d) =>
        new Paragraph({ numbering: { reference: "etapes", level: 0 }, spacing: { after: 60 }, children: [new TextRun(d)] }),
    ),
    p(`ℹ️ Frais, délais et pièces à confirmer auprès de ${v.agency}.`, { size: 18, color: MUTED }),

    ...h2(9, t),
    ...prose(doc.conclusion),

    new Paragraph({
      spacing: { before: 480 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 8 } },
      children: [new TextRun({ text: v.footer, size: 16, color: MUTED })],
    }),
    ...patternBand(t),
  ];

  const document = new Document({
    creator: brand.name,
    title: `Business plan — ${v.title}`,
    styles: { default: { document: { run: { font: t.body, size: 21, color: "23242A" } } } },
    ...(t.paper !== "FFFFFF" ? { background: { color: t.paper } } : {}),
    numbering: {
      config: [
        {
          reference: "puces",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 400, hanging: 260 } } },
            },
          ],
        },
        {
          reference: "etapes",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 400, hanging: 300 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE.width, height: PAGE.height },
            margin: { top: PAGE.margin, bottom: PAGE.margin, left: PAGE.margin, right: PAGE.margin },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `${v.title} · page `, size: 16, color: MUTED }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: MUTED }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}
