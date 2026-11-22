import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ExternalHyperlink,
  HeadingLevel,
  HeightRule,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { PhotoSlot, PlanPhoto } from "@/lib/business-plan";
import { SECTIONS, buildPlanView, paragraphs, photoSourceName, photoSourceUrl, stars, type PlanViewInput } from "@/lib/business-plan-view";
import { reportDownload } from "@/lib/images/photos";
import { WORD_FONT, getPlanDesign, patternBandColors, type PlanDesign } from "@/lib/plan-designs";

const MUTED = "6B7280";
const LINE = "D9D3C7";

/** Couleurs (hex sans #) et polices Word du design choisi. */
type WordTheme = {
  primary: string;
  accent: string;
  soft: string;
  ink: string;
  display: string;
  body: string;
  heading: PlanDesign["heading"];
  cover: PlanDesign["cover"];
  band: string[];
};

function wordTheme(d: PlanDesign): WordTheme {
  const hex = (c: string) => c.replace("#", "").toUpperCase();
  return {
    primary: hex(d.primary),
    accent: hex(d.accent),
    soft: hex(d.soft),
    ink: hex(d.ink),
    display: WORD_FONT[d.display],
    body: WORD_FONT[d.body],
    heading: d.heading,
    cover: d.cover,
    band: patternBandColors(d.pattern),
  };
}

// A4 en twips (1 cm ≈ 567 twips), marges de 1,8 cm.
const PAGE = { width: 11906, height: 16838, margin: 1020 };
const CONTENT = PAGE.width - 2 * PAGE.margin;

const p = (text: string, opts: { bold?: boolean; color?: string; size?: number; after?: number } = {}) =>
  new Paragraph({
    spacing: { after: opts.after ?? 120, line: 300 },
    children: [new TextRun({ text, bold: opts.bold, color: opts.color, size: opts.size })],
  });

const prose = (text: string) => paragraphs(text).map((t) => p(t));

/** Titre de partie, selon le style du design : numéro, pastille ou bande. */
const h2 = (n: number, t: WordTheme) => {
  const { emoji, title } = SECTIONS[n - 1];
  const base = { heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 400, after: 160 } } as const;
  const font = t.display;
  if (t.heading === "pastille") {
    return new Paragraph({
      ...base,
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: t.primary, space: 4 } },
      children: [
        new TextRun({ text: ` ${n} `, bold: true, size: 30, color: "FFFFFF", font, shading: { type: ShadingType.CLEAR, color: "auto", fill: t.primary } }),
        new TextRun({ text: `  ${emoji} ${title}`, bold: true, size: 30, color: t.ink, font }),
      ],
    });
  }
  if (t.heading === "bande") {
    return new Paragraph({
      ...base,
      shading: { type: ShadingType.CLEAR, color: "auto", fill: t.soft },
      border: { left: { style: BorderStyle.SINGLE, size: 36, color: t.primary, space: 8 } },
      children: [
        new TextRun({ text: `${emoji}  `, size: 30 }),
        new TextRun({ text: `${n}. `, color: t.primary, bold: true, size: 30, font }),
        new TextRun({ text: title, color: t.ink, bold: true, size: 30, font }),
      ],
    });
  }
  return new Paragraph({
    ...base,
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 } },
    children: [
      new TextRun({ text: `${emoji}  `, size: 30 }),
      new TextRun({ text: `${n}. `, color: t.accent, bold: true, size: 30, font }),
      new TextRun({ text: title, color: t.primary, bold: true, size: 30, font }),
    ],
  });
};

const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE };

/** Bande de motif (kente, bogolan, adire, wax) : une rangée de cases colorées. */
function patternBand(t: WordTheme) {
  if (t.band.length === 0) return [];
  const col = Math.round(CONTENT / t.band.length);
  return [
    new Table({
      width: { size: CONTENT, type: WidthType.DXA },
      columnWidths: t.band.map(() => col),
      rows: [
        new TableRow({
          height: { value: 160, rule: HeightRule.EXACT },
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
    new Paragraph({ spacing: { after: 160 }, children: [] }),
  ];
}

/** Bandeau de couverture : titre en blanc sur la couleur principale. */
function coverBand(t: WordTheme, v: { title: string; subtitle: string; dateLine: string }) {
  const white = (text: string, size: number, bold = false, font?: string) =>
    new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text, size, bold, color: "FFFFFF", font })] });
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: [CONTENT],
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: CONTENT, type: WidthType.DXA },
            borders: NO_BORDERS,
            shading: { type: ShadingType.CLEAR, color: "auto", fill: t.primary },
            margins: { top: 360, bottom: 360, left: 360, right: 360 },
            children: [
              white("🚀 BUSINESS PLAN", 18, true),
              white(v.title, 52, true, t.display),
              white(v.subtitle, 24),
              white(v.dateLine, 18),
            ],
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

function photoBlock(item?: { photo: PlanPhoto; data: Uint8Array }, ratio = 627 / 1200) {
  if (!item) return [];
  return [
    new Paragraph({
      keepNext: true,
      spacing: { before: 120, after: 40 },
      children: [
        new ImageRun({
          type: "jpg",
          data: item.data,
          transformation: { width: IMAGE_WIDTH, height: Math.round(IMAGE_WIDTH * ratio) },
          altText: { name: "Photo", description: item.photo.alt || "Photo", title: "Photo" },
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({ text: "📷 Photo de ", size: 16, color: MUTED }),
        new ExternalHyperlink({
          link: item.photo.photographerUrl,
          children: [new TextRun({ text: item.photo.photographer, size: 16, color: MUTED, underline: {} })],
        }),
        new TextRun({ text: " sur ", size: 16, color: MUTED }),
        new ExternalHyperlink({
          link: photoSourceUrl(item.photo),
          children: [new TextRun({ text: photoSourceName(item.photo), size: 16, color: MUTED, underline: {} })],
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

/** Tableau simple : première ligne en en-tête si `header` ; colonnes numériques alignées à droite. */
function table(
  rows: string[][],
  widths: number[],
  opts: { header?: boolean; numeric?: number[]; boldLast?: boolean; fill?: string } = {},
) {
  const total = widths.reduce((t, w) => t + w, 0);
  const cols = widths.map((w) => Math.round((w / total) * CONTENT));
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: cols,
    rows: rows.map(
      (cells, r) =>
        new TableRow({
          cantSplit: true,
          tableHeader: opts.header && r === 0,
          children: cells.map(
            (text, c) =>
              new TableCell({
                width: { size: cols[c], type: WidthType.DXA },
                borders,
                shading: opts.header && r === 0 ? { type: ShadingType.CLEAR, color: "auto", fill: opts.fill ?? "F3EFE6" } : undefined,
                margins: { top: 60, bottom: 60, left: 100, right: 100 },
                children: [
                  new Paragraph({
                    alignment: opts.numeric?.includes(c) ? AlignmentType.RIGHT : AlignmentType.LEFT,
                    children: [
                      new TextRun({
                        text,
                        size: 19,
                        bold: (opts.header && r === 0) || (opts.boldLast && r === rows.length - 1),
                        color: opts.header && r === 0 ? MUTED : undefined,
                      }),
                    ],
                  }),
                ],
              }),
          ),
        }),
    ),
  });
}

const spacer = () => new Paragraph({ spacing: { after: 120 }, children: [] });

/** Encadrés des chiffres clés : une ligne de 4 cases sur le fond clair du design. */
function kpiTable(kpis: { emoji: string; label: string; value: string }[], t: WordTheme) {
  const col = Math.round(CONTENT / kpis.length);
  const white = { style: BorderStyle.SINGLE, size: 12, color: "FFFFFF" };
  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: kpis.map(() => col),
    rows: [
      new TableRow({
        cantSplit: true,
        children: kpis.map(
          (k) =>
            new TableCell({
              width: { size: col, type: WidthType.DXA },
              borders: { top: white, bottom: white, left: white, right: white },
              shading: { type: ShadingType.CLEAR, color: "auto", fill: t.soft },
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              children: [
                new Paragraph({ children: [new TextRun({ text: k.emoji, size: 28 })] }),
                new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: k.label, size: 16, color: "3F4A45", bold: true })] }),
                new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: k.value, size: 22, bold: true, color: t.ink, font: t.display })] }),
              ],
            }),
        ),
      }),
    ],
  });
}

/** Fichier Word du business plan, identique au contenu de la page et du PDF. */
export async function businessPlanDocx(input: PlanViewInput, design: PlanDesign = getPlanDesign(null)): Promise<Buffer> {
  const { doc } = input;
  const v = buildPlanView(input);
  const photos = await loadPhotos(v.photos);
  const t = wordTheme(design);
  const tbl = (rows: string[][], widths: number[], opts: { header?: boolean; numeric?: number[]; boldLast?: boolean } = {}) =>
    table(rows, widths, { ...opts, fill: t.soft });

  const cover =
    t.cover === "classique"
      ? [
          ...patternBand(t),
          ...photoBlock(photos.couverture),
          p("🚀 BUSINESS PLAN", { bold: true, color: t.accent, size: 18, after: 120 }),
          new Paragraph({
            heading: HeadingLevel.TITLE,
            spacing: { after: 160 },
            children: [new TextRun({ text: v.title, bold: true, size: 52, color: t.ink, font: t.display })],
          }),
          p(v.subtitle, { size: 24, color: "3F4A45", after: 80 }),
          p(v.dateLine, { size: 18, color: MUTED, after: 240 }),
        ]
      : t.cover === "pleine"
        ? [...patternBand(t), ...photoBlock(photos.couverture), coverBand(t, v), spacer()]
        : [...patternBand(t), coverBand(t, v), spacer(), ...photoBlock(photos.couverture)];

  const children = [
    ...cover,
    kpiTable(v.kpis, t),

    h2(1, t),
    ...prose(doc.resume),

    h2(2, t),
    ...prose(doc.projet),
    ...photoBlock(photos.projet),
    h3("🛍️ Ce que nous vendons"),
    ...v.offers.map(bullet),

    h2(3, t),
    ...photoBlock(photos.marche),
    h3("🧑‍🤝‍🧑 Clientèle"),
    ...prose(doc.marche.clientele),
    h3("🏪 Concurrence"),
    ...prose(doc.marche.concurrence),
    h3("🛒 Habitudes d'achat"),
    ...prose(doc.marche.tendances),

    h2(4, t),
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

    h2(5, t),
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

    h2(6, t),
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

    h2(7, t),
    ...doc.risques.flatMap((x) => [p(`🔸 ${x.risque}`, { bold: true, after: 40 }), p(`✅ ${x.parade}`, { color: "3F4A45" })]),

    h2(8, t),
    ...v.creationLines.map((line) => p(`🏛️ ${line}`, { after: 60 })),
    ...doc.demarches.map(
      (d) =>
        new Paragraph({ numbering: { reference: "etapes", level: 0 }, spacing: { after: 60 }, children: [new TextRun(d)] }),
    ),
    p("ℹ️ Frais, délais et pièces à confirmer auprès de l'ANPI-Gabon.", { size: 18, color: MUTED }),

    h2(9, t),
    ...prose(doc.conclusion),

    new Paragraph({
      spacing: { before: 480 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 8 } },
      children: [new TextRun({ text: v.footer, size: 16, color: MUTED })],
    }),
    ...patternBand(t),
  ];

  const document = new Document({
    creator: "Business plan",
    title: `Business plan — ${v.title}`,
    styles: { default: { document: { run: { font: t.body, size: 21, color: "23242A" } } } },
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
