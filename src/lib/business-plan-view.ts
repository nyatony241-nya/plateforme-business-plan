import { SCENARIO_LABEL, type PlanResult, type ScenarioId } from "@/engine";
import { INVESTMENT_KINDS, type Assumptions } from "@/lib/assumptions";
import { PHOTO_SOURCES, monthlyMarketingBudget, splitBudget, type PlanDocument, type PlanPhoto } from "@/lib/business-plan";
import { formatDateFr } from "@/lib/data-status";
import { formatMonth, formatXaf } from "@/lib/format";
import { ownerIncome } from "@/lib/owner-income";

/** Titres des parties, avec leur émoticône (même ordre que le document). */
export const SECTIONS = [
  { emoji: "📌", title: "Résumé" },
  { emoji: "💡", title: "Le projet" },
  { emoji: "👥", title: "Le marché" },
  { emoji: "📍", title: "L'emplacement" },
  { emoji: "💰", title: "Le plan financier" },
  { emoji: "📣", title: "Le marketing" },
  { emoji: "⚠️", title: "Les risques" },
  { emoji: "🧾", title: "Les démarches" },
  { emoji: "✅", title: "Conclusion" },
] as const;

const CHANNEL_EMOJI: Record<string, string> = {
  Facebook: "📘",
  TikTok: "🎵",
  WhatsApp: "💬",
  Instagram: "📸",
  "Bouche-à-oreille": "🗣️",
  Affichage: "🪧",
  Autre: "✨",
};

/** Note sur 5 en étoiles : ★★★★☆ */
export const stars = (note: number) => "★".repeat(note) + "☆".repeat(Math.max(0, 5 - note));

/** Nom de la banque d'images d'une photo (Unsplash, Pexels). */
export const photoSourceName = (photo: PlanPhoto) => PHOTO_SOURCES[photo.source];

export type PlanViewInput = {
  doc: PlanDocument;
  a: Assumptions;
  results: Record<ScenarioId, PlanResult>;
  project: { name: string; sector: string | null; district: string | null; city: string | null; country: string };
  minimumWage: number;
  /** Démarches officielles (module « Créer mon entreprise »), quand elles existent pour le pays. */
  creation?: { form: string; fee: number | null; delay: string | null; website: string | null; phone: string | null };
};

/**
 * Tout ce que le business plan affiche, déjà calculé et mis en forme.
 * Utilisé à l'identique par la page (et donc le PDF) et par l'export Word.
 */
export function buildPlanView({ doc, a, results, project, minimumWage, creation }: PlanViewInput) {
  const r = results.realiste;
  const kind = (k: string) => INVESTMENT_KINDS.find((x) => x.value === k)?.label ?? k;
  const budget = monthlyMarketingBudget(a);
  const amounts = splitBudget(budget, doc.marketing.canaux);
  const be = r.indicators.breakEvenMonth;
  const pay = a.staff.length === 0 ? ownerIncome(r.years, minimumWage)[0] : null;
  const res = r.financing.resources;

  const financing = [
    `Argent nécessaire au départ, y compris les premiers mois d'activité : ${formatXaf(r.financing.totalNeed)}.`,
    `Financement prévu : ${formatXaf(res.total)} (apport ${formatXaf(res.equity)}${
      res.loans > 0 ? `, prêts ${formatXaf(res.loans)}` : ""
    }${res.grants > 0 ? `, aides ${formatXaf(res.grants)}` : ""}).`,
  ].join(" ");

  const outlook = [
    be
      ? `Dans le scénario réaliste, l'activité devient rentable en ${formatMonth(r.months[be - 1].month)}.`
      : "Dans le scénario réaliste, l'activité n'atteint pas la rentabilité sur la période étudiée.",
    pay
      ? pay.loss
        ? "La première année est en perte : l'entrepreneur ne pourra pas se verser de salaire."
        : `Travaillant seul, l'entrepreneur pourra se verser environ ${formatXaf(
            Math.round(pay.monthly / 1000) * 1000,
          )} par mois la première année.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const sources = [...new Set(Object.values(doc.photos ?? {}).map((ph) => photoSourceName(ph)))];

  const kpis = [
    { emoji: "💵", label: "Ventes la 1re année", value: formatXaf(r.years[0].revenue) },
    { emoji: "📈", label: "Bénéfice la 1re année", value: formatXaf(r.years[0].netResult) },
    { emoji: "🏦", label: "Argent nécessaire au départ", value: formatXaf(r.financing.totalNeed) },
    { emoji: "🎯", label: "Rentable dès", value: be ? formatMonth(r.months[be - 1].month) : "Après 3 ans" },
  ];

  return {
    title: project.name,
    kpis,
    photos: doc.photos ?? {},
    subtitle: [project.sector, [project.district, project.city, project.country].filter(Boolean).join(", ")]
      .filter(Boolean)
      .join(" · "),
    dateLine: `Document établi le ${formatDateFr(doc.generation.generatedAt)}`,
    offers: a.offers.map((o) => `${o.label} — ${formatXaf(o.unitPrice)}`),
    investments: a.investments.map((inv) => ({ label: inv.label, kind: kind(inv.kind), amount: formatXaf(inv.amount) })),
    investmentsTotal: formatXaf(r.financing.investmentsTotal),
    financing,
    shortfall:
      r.financing.shortfall > 0
        ? `Il manque ${formatXaf(r.financing.shortfall)} pour passer le mois le plus difficile.`
        : null,
    forecastTitle: `Prévisions sur ${r.years.length} ans (scénario réaliste)`,
    forecastYears: r.years.map((y) => `An ${y.year}`),
    forecastRows: (
      [
        ["Ventes", "revenue"],
        ["Bénéfice", "netResult"],
        ["Argent en caisse en fin d'année", "cashEnd"],
      ] as const
    ).map(([label, key]) => ({ label, values: r.years.map((y) => formatXaf(y[key])) })),
    scenarios: (["prudent", "realiste", "optimiste"] as const).map((id) => ({
      label: SCENARIO_LABEL[id],
      revenue: formatXaf(results[id].years[0].revenue),
      net: formatXaf(results[id].years[0].netResult),
    })),
    outlook,
    marketing: doc.marketing.canaux.map((c, i) => ({
      canal: c.canal,
      emoji: CHANNEL_EMOJI[c.canal] ?? "✨",
      action: c.action,
      budget: budget > 0 ? formatXaf(amounts[i]) : "—",
    })),
    marketingWithoutBudget: budget === 0,
    creationLines: creation
      ? [
          `Forme juridique conseillée : ${creation.form}.`,
          creation.fee !== null
            ? `Frais de création à l'ANPI : environ ${formatXaf(creation.fee)} (charte officielle, à confirmer au paiement).`
            : null,
          creation.delay ? `Délai indicatif : ${creation.delay}.` : null,
          creation.website
            ? `Création en ligne : ${creation.website.replace(/^https?:\/\//, "")}${creation.phone ? ` · ${creation.phone}` : ""}.`
            : null,
        ].filter((x): x is string => Boolean(x))
      : [],
    footer:
      (sources.length > 0 ? `Photos fournies par ${sources.join(" et ")}. ` : "") +
      "Les chiffres de ce document sont des hypothèses proposées automatiquement puis calculées par un moteur financier ; ils ne proviennent pas d'une étude de terrain et doivent être vérifiés. Montants en francs CFA, hors taxes.",
  };
}

export type PlanView = ReturnType<typeof buildPlanView>;

/** Découpe un texte rédigé en paragraphes. */
export function paragraphs(text: string) {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}
