import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ExternalHyperlink,
  HeadingLevel,
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
import { SECTIONS, buildPlanView, paragraphs, stars, type PlanViewInput } from "@/lib/business-plan-view";

const FOREST = "0F4D3A";
const GOLD = "A8771F";
const MUTED = "6B7280";
const LINE = "D9D3C7";
const FONT = "Arial";

// A4 en twips (1 cm ≈ 567 twips), marges de 1,8 cm.
const PAGE = { width: 11906, height: 16838, margin: 1020 };
const CONTENT = PAGE.width - 2 * PAGE.margin;

const p = (text: string, opts: { bold?: boolean; color?: string; size?: number; after?: number } = {}) =>
  new Paragraph({
    spacing: { after: opts.after ?? 120, line: 300 },
    children: [new TextRun({ text, bold: opts.bold, color: opts.color, size: opts.size })],
  });

const prose = (text: string) => paragraphs(text).map((t) => p(t));

const h2 = (n: number) => {
  const { emoji, title } = SECTIONS[n - 1];
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    keepNext: true,
    spacing: { before: 400, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 } },
    children: [
      new TextRun({ text: `${emoji}  `, size: 30 }),
      new TextRun({ text: `${n}. `, color: GOLD, bold: true, size: 30 }),
      new TextRun({ text: title, color: FOREST, bold: true, size: 30 }),
    ],
  });
};

// Photos : 16:7 environ, sur toute la largeur du texte (en pixels à 96 ppp).
const IMAGE_WIDTH = 640;

/** Télécharge les photos Pexels pour les intégrer au fichier ; une photo indisponible est omise. */
async function loadPhotos(photos: Partial<Record<PhotoSlot, PlanPhoto>>) {
  const loaded: Partial<Record<PhotoSlot, { photo: PlanPhoto; data: Uint8Array }>> = {};
  await Promise.all(
    Object.entries(photos).map(async ([slot, photo]) => {
      if (!photo || !photo.src.startsWith("https://images.pexels.com/")) return;
      try {
        const res = await fetch(photo.src, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return;
        loaded[slot as PhotoSlot] = { photo, data: new Uint8Array(await res.arrayBuffer()) };
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
        new TextRun({ text: "📷 Photo : ", size: 16, color: MUTED }),
        new ExternalHyperlink({
          link: item.photo.photographerUrl,
          children: [new TextRun({ text: item.photo.photographer, size: 16, color: MUTED, underline: {} })],
        }),
        new TextRun({ text: " sur ", size: 16, color: MUTED }),
        new ExternalHyperlink({
          link: item.photo.pageUrl,
          children: [new TextRun({ text: "Pexels", size: 16, color: MUTED, underline: {} })],
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
function table(rows: string[][], widths: number[], opts: { header?: boolean; numeric?: number[]; boldLast?: boolean } = {}) {
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
                shading: opts.header && r === 0 ? { type: ShadingType.CLEAR, color: "auto", fill: "F3EFE6" } : undefined,
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

/** Encadrés des chiffres clés : une ligne de 4 cases sur fond vert pâle. */
function kpiTable(kpis: { emoji: string; label: string; value: string }[]) {
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
              shading: { type: ShadingType.CLEAR, color: "auto", fill: "E7F0EC" },
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              children: [
                new Paragraph({ children: [new TextRun({ text: k.emoji, size: 28 })] }),
                new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: k.label, size: 16, color: "3F4A45", bold: true })] }),
                new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: k.value, size: 22, bold: true })] }),
              ],
            }),
        ),
      }),
    ],
  });
}

/** Fichier Word du business plan, identique au contenu de la page et du PDF. */
export async function businessPlanDocx(input: PlanViewInput): Promise<Buffer> {
  const { doc } = input;
  const v = buildPlanView(input);
  const photos = await loadPhotos(v.photos);

  const children = [
    ...photoBlock(photos.couverture),
    p("🚀 BUSINESS PLAN", { bold: true, color: GOLD, size: 18, after: 120 }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 160 },
      children: [new TextRun({ text: v.title, bold: true, size: 52, color: "14201B" })],
    }),
    p(v.subtitle, { size: 24, color: "3F4A45", after: 80 }),
    p(v.dateLine, { size: 18, color: MUTED, after: 240 }),
    kpiTable(v.kpis),

    h2(1),
    ...prose(doc.resume),

    h2(2),
    ...prose(doc.projet),
    ...photoBlock(photos.projet),
    h3("🛍️ Ce que nous vendons"),
    ...v.offers.map(bullet),

    h2(3),
    ...photoBlock(photos.marche),
    h3("🧑‍🤝‍🧑 Clientèle"),
    ...prose(doc.marche.clientele),
    h3("🏪 Concurrence"),
    ...prose(doc.marche.concurrence),
    h3("🛒 Habitudes d'achat"),
    ...prose(doc.marche.tendances),

    h2(4),
    ...prose(doc.emplacement.analyse),
    ...(doc.emplacement.criteres.length > 0
      ? [
          table(
            [["Critère", "Note", "Commentaire"], ...doc.emplacement.criteres.map((c) => [c.critere, stars(c.note), c.commentaire])],
            [3, 1.7, 5.5],
            { header: true },
          ),
        ]
      : []),
    p("ℹ️ Notes indicatives, à confirmer par une visite sur place.", { size: 17, color: MUTED }),

    h2(5),
    h3("🧱 Investissements de départ"),
    table(
      [...v.investments.map((inv) => [`${inv.label} (${inv.kind})`, inv.amount]), ["Total", v.investmentsTotal]],
      [7, 3],
      { numeric: [1], boldLast: true },
    ),
    h3("🏦 Financement"),
    p(v.financing),
    ...(v.shortfall ? [p(v.shortfall, { bold: true, color: "B42318" })] : []),
    h3(v.forecastTitle),
    table(
      [["En FCFA", ...v.forecastYears], ...v.forecastRows.map((row) => [row.label, ...row.values])],
      [4, ...v.forecastYears.map(() => 2)],
      { header: true, numeric: v.forecastYears.map((_, i) => i + 1) },
    ),
    h3("🔀 Trois scénarios pour la première année"),
    table(
      [["Scénario", "Ventes", "Bénéfice"], ...v.scenarios.map((s) => [s.label, s.revenue, s.net])],
      [4, 3, 3],
      { header: true, numeric: [1, 2] },
    ),
    spacer(),
    p(`👉 ${v.outlook}`),

    h2(6),
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({ text: "🎯 Message : ", bold: true }), new TextRun(doc.marketing.message)],
    }),
    ...photoBlock(photos.marketing),
    table(
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

    h2(7),
    ...doc.risques.flatMap((x) => [p(`🔸 ${x.risque}`, { bold: true, after: 40 }), p(`✅ ${x.parade}`, { color: "3F4A45" })]),

    h2(8),
    ...doc.demarches.map(
      (d) =>
        new Paragraph({ numbering: { reference: "etapes", level: 0 }, spacing: { after: 60 }, children: [new TextRun(d)] }),
    ),
    p("ℹ️ Frais, délais et pièces à confirmer auprès de l'ANPI-Gabon.", { size: 18, color: MUTED }),

    h2(9),
    ...prose(doc.conclusion),

    new Paragraph({
      spacing: { before: 480 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 8 } },
      children: [new TextRun({ text: v.footer, size: 16, color: MUTED })],
    }),
  ];

  const document = new Document({
    creator: "Business plan",
    title: `Business plan — ${v.title}`,
    styles: { default: { document: { run: { font: FONT, size: 21, color: "14201B" } } } },
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
