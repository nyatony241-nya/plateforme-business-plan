import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
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
import { buildPlanView, paragraphs, type PlanViewInput } from "@/lib/business-plan-view";

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

const h2 = (n: number, title: string) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    keepNext: true,
    spacing: { before: 360, after: 160 },
    children: [
      new TextRun({ text: `${n}. `, color: GOLD, bold: true, size: 30 }),
      new TextRun({ text: title, color: FOREST, bold: true, size: 30 }),
    ],
  });

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

/** Fichier Word du business plan, identique au contenu de la page et du PDF. */
export async function businessPlanDocx(input: PlanViewInput): Promise<Buffer> {
  const { doc } = input;
  const v = buildPlanView(input);

  const children = [
    p("BUSINESS PLAN", { bold: true, color: GOLD, size: 18, after: 120 }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 160 },
      children: [new TextRun({ text: v.title, bold: true, size: 52, color: "14201B" })],
    }),
    p(v.subtitle, { size: 24, color: "3F4A45", after: 80 }),
    p(v.dateLine, { size: 18, color: MUTED, after: 240 }),

    h2(1, "Résumé"),
    ...prose(doc.resume),

    h2(2, "Le projet"),
    ...prose(doc.projet),
    h3("Ce que nous vendons"),
    ...v.offers.map(bullet),

    h2(3, "Le marché"),
    h3("Clientèle"),
    ...prose(doc.marche.clientele),
    h3("Concurrence"),
    ...prose(doc.marche.concurrence),
    h3("Habitudes d'achat"),
    ...prose(doc.marche.tendances),

    h2(4, "L'emplacement"),
    ...prose(doc.emplacement.analyse),
    ...(doc.emplacement.criteres.length > 0
      ? [
          table(
            [["Critère", "Note", "Commentaire"], ...doc.emplacement.criteres.map((c) => [c.critere, `${c.note} / 5`, c.commentaire])],
            [3, 1.2, 6],
            { header: true },
          ),
        ]
      : []),
    p("Notes indicatives, à confirmer par une visite sur place.", { size: 17, color: MUTED }),

    h2(5, "Le plan financier"),
    h3("Investissements de départ"),
    table(
      [...v.investments.map((inv) => [`${inv.label} (${inv.kind})`, inv.amount]), ["Total", v.investmentsTotal]],
      [7, 3],
      { numeric: [1], boldLast: true },
    ),
    h3("Financement"),
    p(v.financing),
    ...(v.shortfall ? [p(v.shortfall, { bold: true, color: "B42318" })] : []),
    h3(v.forecastTitle),
    table(
      [["En FCFA", ...v.forecastYears], ...v.forecastRows.map((row) => [row.label, ...row.values])],
      [4, ...v.forecastYears.map(() => 2)],
      { header: true, numeric: v.forecastYears.map((_, i) => i + 1) },
    ),
    h3("Trois scénarios pour la première année"),
    table(
      [["Scénario", "Ventes", "Bénéfice"], ...v.scenarios.map((s) => [s.label, s.revenue, s.net])],
      [4, 3, 3],
      { header: true, numeric: [1, 2] },
    ),
    spacer(),
    p(v.outlook),

    h2(6, "Le marketing"),
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({ text: "Message : ", bold: true }), new TextRun(doc.marketing.message)],
    }),
    table(
      [["Canal", "Action", "Budget par mois"], ...v.marketing.map((c) => [c.canal, c.action, c.budget])],
      [2.2, 6, 2.4],
      { header: true, numeric: [2] },
    ),
    ...(v.marketingWithoutBudget ? [p("Aucun budget marketing n'est prévu dans le plan financier.", { size: 18, color: MUTED })] : []),
    h3("Les 90 premiers jours"),
    ...doc.marketing.calendrier.flatMap((period) => [
      p(period.periode, { bold: true, after: 60 }),
      ...period.actions.map(bullet),
    ]),

    h2(7, "Les risques"),
    ...doc.risques.flatMap((x) => [p(x.risque, { bold: true, after: 40 }), p(x.parade, { color: "3F4A45" })]),

    h2(8, "Les démarches"),
    ...doc.demarches.map(
      (d) =>
        new Paragraph({ numbering: { reference: "etapes", level: 0 }, spacing: { after: 60 }, children: [new TextRun(d)] }),
    ),
    p("Frais, délais et pièces à confirmer auprès de l'ANPI-Gabon.", { size: 18, color: MUTED }),

    h2(9, "Conclusion"),
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
