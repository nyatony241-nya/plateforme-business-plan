import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { PlanResult } from "@/engine";
import { MODE_LABEL, STAFF_LABEL, type ProjectContext } from "@/lib/ai/generate-assumptions";
import { DEFAULT_MODEL, lightThinking, resolveModel } from "@/lib/ai/model";
import { addUsage, usageFrom } from "@/lib/ai/pricing";
import { INVESTMENT_KINDS, type Assumptions } from "@/lib/assumptions";
import { CHANNELS, planDocumentSchema, type PlanDocument } from "@/lib/business-plan";
import { formatMonth } from "@/lib/format";

/** Premières pages : rédigées pour tous, même sans paiement. */
const previewSchema = z.object({
  resume: z.string().describe("Résumé du projet pour un banquier, 4 à 6 phrases."),
  projet: z.string().describe("L'offre, les clients visés, ce qui distingue le projet. 2 courts paragraphes."),
  photos: z
    .object({
      motsCles: z
        .array(z.string())
        .describe(
          "2 à 4 mots ANGLAIS qui désignent ce que l'entreprise vend, au singulier et au pluriel. Ex. chaussettes : [\"sock\", \"socks\"] ; salon de tresses : [\"hair\", \"braids\", \"hairdresser\"] ; boulangerie : [\"bread\", \"bakery\"].",
        ),
      categorie: z
        .string()
        .describe(
          "1 ou 2 mots ANGLAIS pour le lieu du commerce, facile à photographier. Ex. chaussettes : « clothing shop » ; tresses : « hair salon » ; pain : « bakery ».",
        ),
      metier: z
        .array(z.string())
        .describe(
          "3 à 6 mots ANGLAIS que l'on voit sur les photos de ce commerce. Ex. chaussettes : [\"clothing\", \"clothes\", \"fabric\", \"textile\", \"fashion\"] ; tresses : [\"hair\", \"salon\", \"hairdresser\", \"braids\"].",
        ),
      couverture: z.string().describe("L'activité en action : le vendeur ou l'artisan avec le produit, dans sa boutique, son étal ou son atelier."),
      projet: z.string().describe("Le produit ou le service lui-même, bien visible, en gros plan."),
      marche: z.string().describe("Des clients qui achètent ou utilisent ce produit ou ce service."),
      marketing: z.string().describe("La promotion de ce produit : smartphone qui le montre, vitrine, affiche, publication."),
    })
    .describe(
      "Recherches de photos libres de droit, EN ANGLAIS, 3 à 6 mots, une scène concrète. Chaque recherche contient l'un des mots-clés (le produit ou le service vendu) et, sauf pour « projet », le mot « african ». Exemples pour des chaussettes : « african man selling socks shop », « colorful socks display », « african woman buying socks », « socks product photo smartphone ». Aucune marque.",
    ),
});

/** Le reste du business plan : rédigé seulement une fois le plan débloqué. */
const restSchema = z.object({
  marche: z.object({
    clientele: z.string().describe("Qui achète, pourquoi, à quelle fréquence. Sans statistique."),
    concurrence: z.string().describe("Types de concurrents probables dans la zone et comment se distinguer."),
    tendances: z.string().describe("Habitudes d'achat locales utiles au projet, formulées avec prudence."),
  }),
  emplacement: z.object({
    analyse: z.string().describe("Intérêt du quartier indiqué pour ce projet, et ce qu'il faut vérifier sur place."),
    criteres: z
      .array(
        z.object({
          critere: z.string(),
          note: z.number().describe("Note de 1 à 5, appréciation prudente"),
          commentaire: z.string(),
        }),
      )
      .describe("4 ou 5 critères : passage, accessibilité, concurrence proche, coût du local, sécurité…"),
  }),
  marketing: z.object({
    message: z.string().describe("Le message principal à faire passer aux clients, en une ou deux phrases."),
    canaux: z
      .array(
        z.object({
          canal: z.enum(CHANNELS),
          action: z.string().describe("Ce qu'on fait concrètement sur ce canal"),
          part: z.number().describe("Part du budget marketing mensuel, en pourcentage entier"),
        }),
      )
      .describe("3 à 5 canaux ; les parts totalisent 100"),
    calendrier: z
      .array(z.object({ periode: z.string().describe("Ex. « Semaines 1 et 2 »"), actions: z.array(z.string()) }))
      .describe("Calendrier des 90 premiers jours, en 6 périodes de 2 semaines"),
  }),
  risques: z.array(z.object({ risque: z.string(), parade: z.string() })).describe("3 à 5 risques principaux"),
  swot: z
    .object({
      forces: z.array(z.string()).describe("3 forces internes du projet (savoir-faire, emplacement, offre…)"),
      faiblesses: z.array(z.string()).describe("3 faiblesses internes honnêtes (jeune entreprise, moyens limités…)"),
      opportunites: z.array(z.string()).describe("3 opportunités du marché local et des habitudes des clients"),
      menaces: z.array(z.string()).describe("3 menaces extérieures (concurrence, prix d'achat, saison, réglementation…)"),
    })
    .describe("Analyse SWOT, des phrases courtes (15 mots au plus), sans aucun chiffre ni montant"),
  demarches: z
    .array(z.string())
    .describe("Étapes pour créer l'entreprise et ouvrir, dans l'ordre, sans frais ni délais ni téléphone"),
  conclusion: z.string().describe("Conclusion en 3 ou 4 phrases."),
});

/** Mots-clés nettoyés et recherches qui nomment toutes le produit ou service vendu. */
export function photoBrief(photos: {
  motsCles: string[];
  categorie?: string;
  metier?: string[];
  couverture: string;
  projet: string;
  marche: string;
  marketing: string;
}) {
  const words = (list: string[] = []) =>
    [
      ...new Set(
        list.map((k) => k.toLowerCase().replace(/[^a-z\s-]/g, "").trim()).filter((k) => k.length >= 3 && k.length <= 30),
      ),
    ].slice(0, 6);
  const keywords = words(photos.motsCles);
  const trade = words(photos.metier);
  const withSubject = (query: string) => {
    const q = clean(query, 80);
    if (keywords.length === 0 || keywords.some((k) => q.toLowerCase().includes(k))) return q;
    return clean(`${keywords[0]} ${q}`, 80);
  };
  const category = (photos.categorie ?? "").toLowerCase().replace(/[^a-z\s-]/g, "").trim().slice(0, 40);
  return {
    photoKeywords: keywords,
    ...(category.length >= 3 ? { photoCategory: category } : {}),
    ...(trade.length > 0 ? { photoTrade: trade } : {}),
    photoQueries: {
      couverture: withSubject(photos.couverture),
      projet: withSubject(photos.projet),
      marche: withSubject(photos.marche),
      marketing: withSubject(photos.marketing),
    },
  };
}

export function buildDocumentInstructions() {
  return [
    "Tu rédiges un business plan clair et professionnel, en français simple, pour un entrepreneur africain et son banquier.",
    "Règles :",
    "- N'écris AUCUN montant, prix, pourcentage ni chiffre financier dans le texte : les tableaux chiffrés sont produits séparément par un moteur de calcul. Seules exceptions : les parts du budget marketing et les notes des critères, dans leurs champs dédiés.",
    "- N'invente ni statistique, ni étude, ni source, ni nom d'entreprise, de marque ou de concurrent. Seul organisme cité : l'organisme de création d'entreprise indiqué dans le contexte.",
    "- Pour les démarches, n'indique ni frais, ni délais, ni adresse, ni téléphone : ils seront vérifiés séparément.",
    "- Ce que tu ne sais pas avec certitude est présenté comme à vérifier sur le terrain. N'affirme pas l'absence de concurrents ni la sécurité d'un quartier : tu ne les connais pas.",
    "- Emplacement : chaque note est une appréciation a priori ; chaque commentaire dit ce qu'il faut vérifier sur place.",
    "- Sépare les paragraphes par un saut de ligne.",
    "- Phrases courtes, pas de jargon, pas d'emphase publicitaire.",
  ].join("\n");
}

export function buildDocumentPrompt(ctx: ProjectContext, a: Assumptions, realiste: PlanResult) {
  const kind = (k: string) => INVESTMENT_KINDS.find((x) => x.value === k)?.label ?? k;
  const be = realiste.indicators.breakEvenMonth;
  return [
    `Projet : ${ctx.name}`,
    `Lieu : ${[ctx.district, ctx.city, ctx.countryName].filter(Boolean).join(", ")}`,
    `Organisme de création d'entreprise : ${ctx.creationAgency ?? "le guichet unique de création d'entreprise"}`,
    `Secteur : ${ctx.sector || "non précisé"}`,
    `Idée de l'entrepreneur : ${ctx.idea || "non précisée"}`,
    `Mode d'activité : ${ctx.mode ? MODE_LABEL[ctx.mode] : "non précisé"}`,
    `Organisation : ${ctx.staffing ? STAFF_LABEL[ctx.staffing] : "non précisée"}`,
    "",
    "Modèle économique retenu dans le plan financier :",
    `- Offres : ${a.offers.map((o) => o.label).join(" ; ")}`,
    `- Investissements : ${a.investments.map((i) => `${i.label} (${kind(i.kind)})`).join(" ; ") || "aucun"}`,
    `- Charges mensuelles : ${a.fixedCosts.map((c) => c.label).join(" ; ") || "aucune"}`,
    `- Personnel : ${a.staff.map((s) => `${s.headcount} × ${s.label}`).join(" ; ") || "aucun salarié"}`,
    `- Financement : ${a.financing.loans.length ? "apport personnel et prêt bancaire" : "apport personnel, sans prêt"}`,
    `- Scénario réaliste : ${realiste.years[0].netResult >= 0 ? "bénéficiaire" : "en perte"} la première année${
      be ? `, premier mois bénéficiaire en ${formatMonth(realiste.months[be - 1].month)}` : ""
    }.`,
    a.generation?.summary ? `- Résumé du modèle : ${a.generation.summary}` : "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

const clean = (value: string, max: number) => value.trim().slice(0, max);
/** Texte en paragraphes : rétablit un saut de ligne oublié entre deux phrases collées (« cadeaux.Le projet »). */
export const prose = (value: string, max: number) => clean(value.replace(/([a-zà-ÿ][.!?])(?=[A-ZÀ-Ý])/g, "$1\n"), max);

type PreviewOutput = z.infer<typeof previewSchema>;
type RestOutput = z.infer<typeof restSchema>;

/** Parties rédigées après paiement, vides dans un aperçu. */
const EMPTY_REST = {
  marche: { clientele: "", concurrence: "", tendances: "" },
  emplacement: { analyse: "", criteres: [] },
  marketing: { message: "", canaux: [], calendrier: [] },
  risques: [],
  demarches: [],
  conclusion: "",
};

function previewFields(out: PreviewOutput) {
  return { resume: prose(out.resume, 1500), projet: prose(out.projet, 2000), ...photoBrief(out.photos) };
}

const swotList = (items: string[]) => items.slice(0, 4).map((x) => clean(x, 160)).filter(Boolean);

/** Parties suivantes, bornées et nettoyées (notes 1 à 5, parts entières). */
export function restFields(out: RestOutput) {
  return {
    marche: {
      clientele: prose(out.marche.clientele, 1500),
      concurrence: prose(out.marche.concurrence, 1500),
      tendances: prose(out.marche.tendances, 1500),
    },
    emplacement: {
      analyse: prose(out.emplacement.analyse, 1500),
      criteres: out.emplacement.criteres.slice(0, 6).map((c) => ({
        critere: clean(c.critere, 80),
        note: Math.min(5, Math.max(1, Math.round(c.note))),
        commentaire: clean(c.commentaire, 300),
      })),
    },
    marketing: {
      message: clean(out.marketing.message, 600),
      canaux: out.marketing.canaux.slice(0, 6).map((c) => ({
        canal: c.canal,
        action: clean(c.action, 400),
        part: Math.min(100, Math.max(0, Math.round(c.part))),
      })),
      calendrier: out.marketing.calendrier.slice(0, 8).map((p) => ({
        periode: clean(p.periode, 40),
        actions: p.actions.slice(0, 5).map((x) => clean(x, 200)).filter(Boolean),
      })),
    },
    risques: out.risques.slice(0, 6).map((r) => ({ risque: clean(r.risque, 200), parade: clean(r.parade, 400) })),
    swot: {
      forces: swotList(out.swot.forces),
      faiblesses: swotList(out.swot.faiblesses),
      opportunites: swotList(out.swot.opportunites),
      menaces: swotList(out.swot.menaces),
    },
    demarches: out.demarches.slice(0, 8).map((d) => clean(d, 300)).filter(Boolean),
    conclusion: prose(out.conclusion, 1200),
  };
}

async function callAi<T extends z.ZodType>(schema: T, prompt: string, model: string, timeout: number, light = false) {
  const result = await generateText({
    model: resolveModel(model),
    instructions: buildDocumentInstructions(),
    prompt,
    output: Output.object({ schema }),
    providerOptions: light ? lightThinking() : undefined,
    maxRetries: 1,
    timeout,
  });
  return { output: result.output as z.infer<T>, usage: usageFrom(result.usage) };
}

/**
 * Aperçu : seuls le résumé, le projet et les recherches de photos sont rédigés.
 * Le reste ne coûte rien tant que le client n'a pas payé.
 */
export async function generatePlanPreview(ctx: ProjectContext, a: Assumptions, realiste: PlanResult, model = DEFAULT_MODEL) {
  const started = Date.now();
  const { output, usage } = await callAi(
    previewSchema,
    `${buildDocumentPrompt(ctx, a, realiste)}\nRédige seulement le résumé, la présentation du projet et les recherches de photos.`,
    model,
    60_000,
    true,
  );
  const document: PlanDocument = planDocumentSchema.parse({
    ...previewFields(output),
    ...EMPTY_REST,
    stage: "apercu",
    generation: { model, generatedAt: new Date().toISOString() },
  });
  return { document, durationMs: Date.now() - started, usage };
}

/** Rédige la suite d'un aperçu (marché, emplacement, marketing, risques, SWOT, démarches, conclusion). */
export async function generatePlanRest(
  ctx: ProjectContext,
  a: Assumptions,
  realiste: PlanResult,
  preview: Pick<PlanDocument, "resume" | "projet">,
  model = DEFAULT_MODEL,
) {
  const started = Date.now();
  const { output, usage } = await callAi(
    restSchema,
    [
      buildDocumentPrompt(ctx, a, realiste),
      "",
      "Déjà rédigé (à prolonger, sans le répéter) :",
      `Résumé : ${preview.resume}`,
      `Le projet : ${preview.projet}`,
      "",
      "Rédige maintenant le marché, l'emplacement, le marketing, les risques, l'analyse SWOT, les démarches et la conclusion.",
    ].join("\n"),
    model,
    100_000,
  );
  return { fields: restFields(output), durationMs: Date.now() - started, usage };
}

/** Business plan complet en une fois (plan déjà débloqué) : les deux rédactions en parallèle. */
export async function generatePlanDocument(ctx: ProjectContext, a: Assumptions, realiste: PlanResult, model = DEFAULT_MODEL) {
  const started = Date.now();
  const [preview, rest] = await Promise.all([
    callAi(previewSchema, `${buildDocumentPrompt(ctx, a, realiste)}\nRédige seulement le résumé, la présentation du projet et les recherches de photos.`, model, 60_000),
    callAi(
      restSchema,
      `${buildDocumentPrompt(ctx, a, realiste)}\nRédige le marché, l'emplacement, le marketing, les risques, l'analyse SWOT, les démarches et la conclusion.`,
      model,
      100_000,
    ),
  ]);
  const document: PlanDocument = planDocumentSchema.parse({
    ...previewFields(preview.output),
    ...restFields(rest.output),
    stage: "complet",
    generation: { model, generatedAt: new Date().toISOString() },
  });
  return { document, durationMs: Date.now() - started, usage: addUsage(preview.usage, rest.usage) };
}
