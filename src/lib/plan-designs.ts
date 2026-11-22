/**
 * Les 10 designs du business plan : couleurs, polices, couverture, titres et motif.
 * Un même design s'applique à l'écran, au PDF (impression) et au fichier Word.
 * Couleurs choisies pour rester lisibles : texte blanc sur `primary`, `accent` et `ink` sur blanc.
 */

export type PlanFont = "exo" | "fraunces" | "manrope" | "montserrat" | "playfair";
export type PlanCover = "classique" | "bandeau" | "pleine";
export type PlanHeading = "numero" | "pastille" | "bande";
export type PlanPattern = "kente" | "bogolan" | "adire" | "wax";

export type PlanDesign = {
  id: string;
  name: string;
  description: string;
  primary: string;
  accent: string;
  soft: string;
  ink: string;
  display: PlanFont;
  body: PlanFont;
  cover: PlanCover;
  heading: PlanHeading;
  pattern?: { kind: PlanPattern; colors: string[] };
};

export const PLAN_DESIGNS: PlanDesign[] = [
  {
    id: "flamme",
    name: "Flamme",
    description: "Orange et gris, moderne",
    primary: "#d2390c",
    accent: "#c2410c",
    soft: "#fff1e9",
    ink: "#23242a",
    display: "exo",
    body: "manrope",
    cover: "bandeau",
    heading: "pastille",
  },
  {
    id: "foret",
    name: "Forêt",
    description: "Vert profond et or, classique",
    primary: "#0f4d3a",
    accent: "#8f6418",
    soft: "#e7efea",
    ink: "#14201b",
    display: "fraunces",
    body: "manrope",
    cover: "classique",
    heading: "numero",
  },
  {
    id: "ocean",
    name: "Océan",
    description: "Bleu atlantique, net",
    primary: "#0b4f8a",
    accent: "#0a6f7e",
    soft: "#e8f2fa",
    ink: "#10223a",
    display: "montserrat",
    body: "manrope",
    cover: "pleine",
    heading: "bande",
  },
  {
    id: "kente",
    name: "Kente",
    description: "Or, vert et rouge, motif tissé",
    primary: "#8a5a00",
    accent: "#1d6b38",
    soft: "#fbf3dc",
    ink: "#1f1a10",
    display: "montserrat",
    body: "manrope",
    cover: "bandeau",
    heading: "bande",
    pattern: { kind: "kente", colors: ["#e0a91b", "#1d6b38", "#b3261e", "#1b1b1b"] },
  },
  {
    id: "terre",
    name: "Terre cuite",
    description: "Ocre et brun, motif bogolan",
    primary: "#a2461f",
    accent: "#7a4a1e",
    soft: "#f7ece3",
    ink: "#2a1a12",
    display: "fraunces",
    body: "manrope",
    cover: "pleine",
    heading: "numero",
    pattern: { kind: "bogolan", colors: ["#efe3cf", "#5a3519"] },
  },
  {
    id: "nuit",
    name: "Nuit et or",
    description: "Bleu nuit et doré, prestige",
    primary: "#1b2a4a",
    accent: "#8a6510",
    soft: "#eef1f7",
    ink: "#141c2e",
    display: "playfair",
    body: "manrope",
    cover: "bandeau",
    heading: "pastille",
  },
  {
    id: "savane",
    name: "Savane",
    description: "Olive et ocre, naturel",
    primary: "#56651b",
    accent: "#97600f",
    soft: "#f3f2e2",
    ink: "#1f2410",
    display: "exo",
    body: "manrope",
    cover: "classique",
    heading: "bande",
  },
  {
    id: "corail",
    name: "Corail",
    description: "Rouge corail et turquoise, motif wax",
    primary: "#b8372a",
    accent: "#0f6f73",
    soft: "#fdeeec",
    ink: "#2a1715",
    display: "montserrat",
    body: "manrope",
    cover: "bandeau",
    heading: "pastille",
    pattern: { kind: "wax", colors: ["#b8372a", "#0f6f73", "#f2b632"] },
  },
  {
    id: "ebene",
    name: "Ébène",
    description: "Noir et blanc, sobre",
    primary: "#1c1c1f",
    accent: "#5c5c64",
    soft: "#f1f1f3",
    ink: "#111113",
    display: "montserrat",
    body: "manrope",
    cover: "classique",
    heading: "numero",
  },
  {
    id: "indigo",
    name: "Indigo",
    description: "Bleu indigo, motif adire",
    primary: "#2e3a8c",
    accent: "#5a3fae",
    soft: "#eceefa",
    ink: "#161a3a",
    display: "fraunces",
    body: "manrope",
    cover: "pleine",
    heading: "bande",
    pattern: { kind: "adire", colors: ["#2e3a8c", "#ffffff"] },
  },
];

export const DEFAULT_PLAN_DESIGN = "flamme";

export function getPlanDesign(id: string | null | undefined): PlanDesign {
  return PLAN_DESIGNS.find((d) => d.id === id) ?? PLAN_DESIGNS[0];
}

export function isPlanDesignId(id: string): boolean {
  return PLAN_DESIGNS.some((d) => d.id === id);
}

/** Polices de l'écran et du PDF. */
export const FONT_STACK: Record<PlanFont, string> = {
  exo: '"Exo 2 Variable", "Manrope Variable", sans-serif',
  fraunces: '"Fraunces Variable", Georgia, serif',
  manrope: '"Manrope Variable", system-ui, sans-serif',
  montserrat: '"Montserrat Variable", "Manrope Variable", sans-serif',
  playfair: '"Playfair Display Variable", Georgia, serif',
};

/** Polices du fichier Word : présentes sur les ordinateurs équipés d'Office. */
export const WORD_FONT: Record<PlanFont, string> = {
  exo: "Trebuchet MS",
  fraunces: "Georgia",
  manrope: "Calibri",
  montserrat: "Century Gothic",
  playfair: "Garamond",
};

/** Motif en bande (SVG), répété horizontalement en haut de la couverture et en pied de document. */
export function patternSvg(pattern: PlanDesign["pattern"]): string | null {
  if (!pattern) return null;
  const [a, b, c = b, d = a] = pattern.colors;
  switch (pattern.kind) {
    case "kente": {
      const widths = [12, 4, 8, 4, 12, 4, 8, 12];
      const colors = [a, d, b, d, c, a, b, d];
      let x = 0;
      const rects = widths
        .map((w, i) => {
          const r = `<rect x="${x}" y="0" width="${w}" height="14" fill="${colors[i]}"/>`;
          x += w;
          return r;
        })
        .join("");
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${x}" height="14">${rects}<rect y="6" width="${x}" height="2" fill="${a}" fill-opacity="0.7"/></svg>`;
    }
    case "bogolan":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="14"><rect width="28" height="14" fill="${a}"/><polyline points="0,11 7,3 14,11 21,3 28,11" fill="none" stroke="${b}" stroke-width="2"/><circle cx="7" cy="11" r="1.4" fill="${b}"/><circle cx="21" cy="11" r="1.4" fill="${b}"/></svg>`;
    case "adire":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="14"><rect width="20" height="14" fill="${a}"/><circle cx="10" cy="7" r="4.5" fill="none" stroke="${b}" stroke-width="1.4"/><circle cx="10" cy="7" r="1.3" fill="${b}"/><circle cx="0" cy="0" r="1.2" fill="${b}"/><circle cx="20" cy="14" r="1.2" fill="${b}"/></svg>`;
    case "wax":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="14"><rect width="28" height="14" fill="${a}"/><circle cx="7" cy="7" r="5.5" fill="${c}"/><circle cx="7" cy="7" r="3" fill="${b}"/><circle cx="21" cy="7" r="5.5" fill="${b}"/><circle cx="21" cy="7" r="3" fill="${c}"/></svg>`;
  }
}

/** Le motif en valeur CSS `background-image`. */
export function patternCss(pattern: PlanDesign["pattern"]): string | undefined {
  const svg = patternSvg(pattern);
  return svg ? `url("data:image/svg+xml,${encodeURIComponent(svg)}")` : undefined;
}

/** Couleurs du motif pour une bande de cases colorées dans Word (hex sans #). */
export function patternBandColors(pattern: PlanDesign["pattern"]): string[] {
  if (!pattern) return [];
  const hex = pattern.colors.map((c) => c.replace("#", "").toUpperCase());
  const sequence = pattern.kind === "kente" ? [0, 3, 1, 3, 2, 0, 1, 3] : [0, 1, 0, 1, 0, 1, 0, 1];
  return Array.from({ length: 16 }, (_, i) => hex[sequence[i % sequence.length] % hex.length]);
}
