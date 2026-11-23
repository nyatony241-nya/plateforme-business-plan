/**
 * Les 10 designs du business plan : chacun a sa couverture, ses titres, ses encadrés,
 * ses tableaux, ses polices et ses couleurs.
 * Un même design s'applique à l'écran, au PDF (impression) et au fichier Word.
 * Couleurs choisies pour rester lisibles : texte blanc sur `primary`, `accent` et `ink` sur blanc.
 */

export type PlanFont = "exo" | "fraunces" | "manrope" | "montserrat" | "playfair" | "bebas" | "dmserif";
/** Couverture : une mise en page propre à chaque design. */
export type PlanCover =
  | "arcs"
  | "cadre"
  | "partage"
  | "kente"
  | "bogolan"
  | "etoile"
  | "organique"
  | "geometrique"
  | "magazine"
  | "adire";
/** Titres de partie : un style propre à chaque design. */
export type PlanHeading =
  | "pastille"
  | "romain"
  | "detoure"
  | "etiquette"
  | "zigzag"
  | "ornement"
  | "feuille"
  | "surligne"
  | "magazine"
  | "bandeau";
/** Encadrés des chiffres clés. */
export type PlanKpi = "carte" | "contour" | "barre" | "sombre" | "tampon" | "dore" | "pastel" | "sommet" | "filet" | "plein";
/** En-têtes de tableaux : fond clair, fond foncé ou simples filets. */
export type PlanTable = "doux" | "fonce" | "filet";
export type PlanPattern = "kente" | "bogolan" | "adire" | "wax";

export type PlanDesign = {
  id: string;
  name: string;
  description: string;
  /** Signature visuelle en quelques mots (affichée dans le choix du design). */
  signature: string;
  primary: string;
  accent: string;
  soft: string;
  ink: string;
  /** Fond des pages du document. */
  paper: string;
  /** Couleur vive des ornements (jamais pour du texte sur fond clair). */
  highlight: string;
  display: PlanFont;
  body: PlanFont;
  cover: PlanCover;
  heading: PlanHeading;
  kpi: PlanKpi;
  table: PlanTable;
  pattern?: { kind: PlanPattern; colors: string[] };
};

export const PLAN_DESIGNS: PlanDesign[] = [
  {
    id: "flamme",
    name: "Flamme",
    description: "Orange et gris, moderne",
    signature: "Arcs orange, pastilles dégradées",
    primary: "#d2390c",
    accent: "#c2410c",
    soft: "#fff1e9",
    ink: "#23242a",
    paper: "#ffffff",
    highlight: "#ff7a1f",
    display: "exo",
    body: "manrope",
    cover: "arcs",
    heading: "pastille",
    kpi: "carte",
    table: "doux",
  },
  {
    id: "foret",
    name: "Forêt",
    description: "Vert profond et or, classique",
    signature: "Double cadre, chapitres romains",
    primary: "#0f4d3a",
    accent: "#8f6418",
    soft: "#efe8d6",
    ink: "#14201b",
    paper: "#f8f4ea",
    highlight: "#c9a227",
    display: "fraunces",
    body: "manrope",
    cover: "cadre",
    heading: "romain",
    kpi: "contour",
    table: "filet",
  },
  {
    id: "ocean",
    name: "Océan",
    description: "Bleu atlantique, net",
    signature: "Couverture coupée en deux, grands numéros",
    primary: "#0b4f8a",
    accent: "#0a6f7e",
    soft: "#e8f2fa",
    ink: "#10223a",
    paper: "#ffffff",
    highlight: "#2fa7d8",
    display: "montserrat",
    body: "manrope",
    cover: "partage",
    heading: "detoure",
    kpi: "barre",
    table: "fonce",
  },
  {
    id: "kente",
    name: "Kente",
    description: "Noir et or, motif tissé",
    signature: "Fond noir, bandes de kente, étiquettes",
    primary: "#8a5a00",
    accent: "#1d6b38",
    soft: "#fbf3dc",
    ink: "#1f1a10",
    paper: "#ffffff",
    highlight: "#e0a91b",
    display: "bebas",
    body: "manrope",
    cover: "kente",
    heading: "etiquette",
    kpi: "sombre",
    table: "fonce",
    pattern: { kind: "kente", colors: ["#e0a91b", "#1d6b38", "#b3261e", "#1b1b1b"] },
  },
  {
    id: "terre",
    name: "Terre cuite",
    description: "Ocre et brun, motif bogolan",
    signature: "Cadre bogolan, soulignés en zigzag",
    primary: "#a2461f",
    accent: "#7a4a1e",
    soft: "#f7ece3",
    ink: "#2a1a12",
    paper: "#fcf7f1",
    highlight: "#d9884a",
    display: "dmserif",
    body: "manrope",
    cover: "bogolan",
    heading: "zigzag",
    kpi: "tampon",
    table: "doux",
    pattern: { kind: "bogolan", colors: ["#efe3cf", "#5a3519"] },
  },
  {
    id: "nuit",
    name: "Nuit et or",
    description: "Bleu nuit et doré, prestige",
    signature: "Bleu nuit, filets dorés, ornements",
    primary: "#1b2a4a",
    accent: "#8a6510",
    soft: "#eef1f7",
    ink: "#141c2e",
    paper: "#ffffff",
    highlight: "#d4af37",
    display: "playfair",
    body: "manrope",
    cover: "etoile",
    heading: "ornement",
    kpi: "dore",
    table: "fonce",
  },
  {
    id: "savane",
    name: "Savane",
    description: "Olive et ocre, naturel",
    signature: "Formes organiques, pastilles en feuille",
    primary: "#56651b",
    accent: "#97600f",
    soft: "#f3f2e2",
    ink: "#1f2410",
    paper: "#fdfcf6",
    highlight: "#c99a2e",
    display: "fraunces",
    body: "manrope",
    cover: "organique",
    heading: "feuille",
    kpi: "pastel",
    table: "doux",
  },
  {
    id: "corail",
    name: "Corail",
    description: "Corail, turquoise et jaune, motif wax",
    signature: "Mosaïque géométrique, titres surlignés",
    primary: "#b8372a",
    accent: "#0f6f73",
    soft: "#fdeeec",
    ink: "#2a1715",
    paper: "#ffffff",
    highlight: "#f2b632",
    display: "bebas",
    body: "manrope",
    cover: "geometrique",
    heading: "surligne",
    kpi: "sommet",
    table: "doux",
    pattern: { kind: "wax", colors: ["#b8372a", "#0f6f73", "#f2b632"] },
  },
  {
    id: "ebene",
    name: "Ébène",
    description: "Noir et blanc, éditorial",
    signature: "Mise en page de magazine, grands chiffres",
    primary: "#1c1c1f",
    accent: "#5c5c64",
    soft: "#f1f1f3",
    ink: "#111113",
    paper: "#ffffff",
    highlight: "#b9b9c0",
    display: "dmserif",
    body: "manrope",
    cover: "magazine",
    heading: "magazine",
    kpi: "filet",
    table: "filet",
  },
  {
    id: "indigo",
    name: "Indigo",
    description: "Bleu indigo, motif adire",
    signature: "Fond adire, carte blanche, bandeaux",
    primary: "#2e3a8c",
    accent: "#5a3fae",
    soft: "#eceefa",
    ink: "#161a3a",
    paper: "#ffffff",
    highlight: "#8f9be0",
    display: "montserrat",
    body: "manrope",
    cover: "adire",
    heading: "bandeau",
    kpi: "plein",
    table: "fonce",
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
  bebas: '"Bebas Neue", Impact, "Arial Narrow", sans-serif',
  dmserif: '"DM Serif Display", Georgia, serif',
};

/** Polices du fichier Word : présentes sur les ordinateurs équipés d'Office. */
export const WORD_FONT: Record<PlanFont, string> = {
  exo: "Trebuchet MS",
  fraunces: "Georgia",
  manrope: "Calibri",
  montserrat: "Century Gothic",
  playfair: "Garamond",
  bebas: "Impact",
  dmserif: "Georgia",
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
  return svg ? svgUrl(svg) : undefined;
}

export const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

/** Fond adire plein (couverture Indigo) : motif tie-dye répété sur toute la surface. */
export function adireTileCss(dark: string, light: string): string {
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="${dark}"/>` +
      `<g fill="none" stroke="${light}" stroke-opacity="0.55"><circle cx="16" cy="16" r="10" stroke-width="1.6"/><circle cx="16" cy="16" r="5" stroke-width="1.2"/>` +
      `<circle cx="48" cy="48" r="10" stroke-width="1.6"/><circle cx="48" cy="48" r="5" stroke-width="1.2"/>` +
      `<path d="M38 10l20 0M38 16l20 0M38 22l20 0M6 42l20 0M6 48l20 0M6 54l20 0" stroke-width="1.4" stroke-linecap="round"/></g>` +
      `<g fill="${light}" fill-opacity="0.7"><circle cx="16" cy="16" r="1.6"/><circle cx="48" cy="48" r="1.6"/><circle cx="48" cy="16" r="1.2"/><circle cx="16" cy="48" r="1.2"/></g></svg>`,
  );
}

/** Ligne en zigzag (titres Terre cuite), répétée horizontalement. */
export function zigzagCss(color: string): string {
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="8"><polyline points="0,7 4,1 8,7 12,1 16,7" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  );
}

/** Couleurs du motif pour une bande de cases colorées dans Word (hex sans #). */
export function patternBandColors(pattern: PlanDesign["pattern"]): string[] {
  if (!pattern) return [];
  const hex = pattern.colors.map((c) => c.replace("#", "").toUpperCase());
  const sequence = pattern.kind === "kente" ? [0, 3, 1, 3, 2, 0, 1, 3] : [0, 1, 0, 1, 0, 1, 0, 1];
  return Array.from({ length: 16 }, (_, i) => hex[sequence[i % sequence.length] % hex.length]);
}
