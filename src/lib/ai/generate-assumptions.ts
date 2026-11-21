import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { CountryParams } from "@/engine";
import { assumptionsSchema, INVESTMENT_KINDS, nextMonth, type Assumptions } from "@/lib/assumptions";
import { DEFAULT_MODEL, resolveModel } from "@/lib/ai/model";
import type { ParamProvenance } from "@/lib/data/country-params";
import { budgetLabel } from "@/lib/project-options";

/** Modèle utilisé pour produire les hypothèses. */
export const ASSUMPTIONS_MODEL = DEFAULT_MODEL;

export type ProjectContext = {
  name: string;
  countryName: string;
  city: string | null;
  district: string | null;
  sector: string | null;
  idea: string | null;
  budget: number | null;
  mode: "local" | "en_ligne" | "mixte" | null;
  staffing: "seul" | "recruter" | null;
};

const why = z.string().describe("Pourquoi ce chiffre, en une phrase simple (moins de 200 caractères).");

/** Réponse attendue de l'IA : uniquement des hypothèses, jamais de résultats calculés. */
const aiOutputSchema = z.object({
  summary: z.string().describe("Le modèle économique retenu, en 2 à 4 phrases simples."),
  investments: z.array(
    z.object({
      label: z.string(),
      kind: z.enum(INVESTMENT_KINDS.map((k) => k.value) as [string, ...string[]]),
      amount: z.number().describe("FCFA hors taxes"),
      lifeYears: z.number().describe("Durée d'utilisation en années ; 0 pour caution, stock initial, frais de création"),
      rationale: why,
    }),
  ),
  offers: z.array(
    z.object({
      label: z.string(),
      unitPrice: z.number().describe("Prix de vente unitaire, FCFA hors taxes"),
      unitCost: z.number().describe("Coût variable par vente, FCFA hors taxes"),
      monthlyVolume: z.number().describe("Ventes par mois une fois l'activité installée"),
      rampUpMonths: z.number().describe("Mois pour atteindre ce rythme"),
      annualVolumeGrowth: z.number().describe("Croissance annuelle des ventes à partir de l'an 2, en fraction (0,05 = 5 %)"),
      rationale: why,
    }),
  ),
  staff: z.array(
    z.object({
      label: z.string(),
      monthlyGross: z.number().describe("Salaire brut mensuel, FCFA"),
      headcount: z.number(),
      startMonth: z.number().describe("Mois d'embauche, 1 = ouverture"),
      rationale: why,
    }),
  ),
  fixedCosts: z.array(z.object({ label: z.string(), monthly: z.number().describe("FCFA par mois"), rationale: why })),
  financing: z.object({
    equity: z.number().describe("Apport personnel, FCFA"),
    grants: z.number(),
    loans: z.array(
      z.object({
        label: z.string(),
        principal: z.number(),
        annualRate: z.number().describe("Taux annuel en fraction (0,12 = 12 %)"),
        months: z.number(),
        deferralMonths: z.number(),
        rationale: why,
      }),
    ),
    rationale: why,
  }),
  customerDays: z.number().describe("Délai de paiement des clients en jours, 0 si comptant"),
  supplierDays: z.number().describe("Délai de paiement des fournisseurs en jours"),
  warnings: z.array(z.string()).describe("2 à 5 points à vérifier en priorité par l'entrepreneur"),
});

type AiOutput = z.infer<typeof aiOutputSchema>;

export const MODE_LABEL = { local: "dans un local commercial", en_ligne: "en ligne, sans local commercial", mixte: "avec un local et en ligne" };
export const STAFF_LABEL = { seul: "seul, sans salarié au départ", recruter: "avec du personnel" };

export function buildInstructions(minimumWage: number) {
  return [
    "Tu es analyste financier, spécialiste de la création de petites entreprises en Afrique centrale.",
    "Tu prépares les HYPOTHÈSES d'un business plan. Un moteur de calcul séparé produit tous les résultats : tu ne calcules ni chiffre d'affaires total, ni résultat, ni rentabilité.",
    "Règles :",
    "- Montants en francs CFA hors taxes, nombres entiers, adaptés au pays, à la ville et au quartier indiqués.",
    "- Tu n'inventes ni statistique, ni enquête, ni source. Tu ne prétends pas connaître le marché local avec précision. Chaque chiffre est un ordre de grandeur prudent, expliqué simplement dans « rationale ».",
    "- Ne cite aucun nom d'entreprise, de marque, de fournisseur ou d'organisme, sauf l'ANPI-Gabon : écris « électricité et eau », pas le nom d'un fournisseur.",
    "- Préfère la prudence : volumes modestes au démarrage, montée en charge de 3 à 9 mois, coûts complets.",
    `- Aucun salaire brut inférieur à ${minimumWage} FCFA par mois.`,
    "- Si l'entrepreneur travaille seul : aucune ligne de personnel ; sa rémunération viendra du bénéfice.",
    "- Activité en local : prévois loyer, caution, aménagement, électricité. Activité en ligne : pas de local commercial, mais publicité en ligne et livraison.",
    "- Inclus toujours des frais de création d'entreprise (type frais_creation), marqués à vérifier auprès de l'ANPI-Gabon.",
    "- Adapte la taille du projet au budget : l'apport ne dépasse jamais le budget. Si le budget ne couvre pas les investissements et 3 mois de charges, réduis d'abord l'ampleur du projet ; ne propose un prêt bancaire que s'il reste raisonnable, avec un taux indicatif expliqué comme estimation.",
    "- Si le budget n'est pas précisé, dimensionne un projet modeste et signale-le dans les points à vérifier.",
    "- Libellés courts et concrets en français. Explications en français simple, sans jargon.",
  ].join("\n");
}

export function buildPrompt(ctx: ProjectContext, params: CountryParams) {
  const lines = [
    `Projet : ${ctx.name}`,
    `Pays : ${ctx.countryName}`,
    `Ville : ${ctx.city ?? "non précisée"}`,
    `Quartier envisagé : ${ctx.district || "non précisé"}`,
    `Secteur : ${ctx.sector || "non précisé"}`,
    `Idée décrite par l'entrepreneur : ${ctx.idea || "non précisée"}`,
    `Budget de départ : ${ctx.budget ? `${budgetLabel(ctx.budget)} (apport maximum : ${ctx.budget} FCFA)` : "non précisé"}`,
    `Mode d'activité : ${ctx.mode ? MODE_LABEL[ctx.mode] : "non précisé"}`,
    `Organisation : ${ctx.staffing ? STAFF_LABEL[ctx.staffing] : "non précisée"}`,
    "",
    "Données locales vérifiées disponibles pour ce secteur et cette zone : aucune pour l'instant. Tes chiffres seront affichés comme hypothèses à vérifier.",
    `Cadre fiscal utilisé par le moteur (pour information) : impôt sur les sociétés ${Math.round(params.corporateTaxRate * 100)} %, cotisations patronales appliquées automatiquement aux salaires.`,
    "",
    "Propose les hypothèses complètes du plan.",
  ];
  return lines.join("\n");
}

const clampInt = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(Number.isFinite(value) ? value : 0)));
const clampRate = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));
const text = (value: string, max: number) => value.trim().slice(0, max);

/**
 * Transforme la réponse de l'IA en hypothèses enregistrables : bornes, entiers,
 * plancher de salaire, apport plafonné au budget. Le moteur refait ensuite tous les calculs.
 */
export function normalizeAiOutput(
  out: AiOutput,
  ctx: Pick<ProjectContext, "budget">,
  minimumWage: number,
  meta: { model: string; generatedAt: string; startMonth: string },
): Assumptions {
  let n = 0;
  const id = (prefix: string) => `${prefix}-${++n}`;
  const kinds = new Set(INVESTMENT_KINDS.map((k) => k.value));
  const depreciable = new Set(INVESTMENT_KINDS.filter((k) => k.depreciable).map((k) => k.value));

  const assumptions: Assumptions = {
    startMonth: meta.startMonth,
    years: 3,
    investments: out.investments
      .filter((inv) => kinds.has(inv.kind as Assumptions["investments"][number]["kind"]))
      .slice(0, 15)
      .map((inv) => {
        const kind = inv.kind as Assumptions["investments"][number]["kind"];
        return {
          id: id("inv"),
          label: text(inv.label, 120),
          note: text(inv.rationale, 400),
          kind,
          amount: clampInt(inv.amount, 0, 1e12),
          lifeYears: depreciable.has(kind) ? clampInt(inv.lifeYears || 5, 1, 50) : 0,
        };
      }),
    offers: out.offers.slice(0, 10).map((o) => ({
      id: id("offre"),
      label: text(o.label, 120),
      note: text(o.rationale, 400),
      unitPrice: clampInt(o.unitPrice, 0, 1e12),
      unitCost: clampInt(o.unitCost, 0, 1e12),
      monthlyVolume: clampInt(o.monthlyVolume, 0, 1e9),
      rampUpMonths: clampInt(o.rampUpMonths, 0, 24),
      annualVolumeGrowth: clampRate(o.annualVolumeGrowth, 0, 0.5),
    })),
    staff: out.staff.slice(0, 10).map((s) => ({
      id: id("poste"),
      label: text(s.label, 120),
      note: text(s.rationale, 400),
      monthlyGross: Math.max(clampInt(s.monthlyGross, 0, 1e10), minimumWage),
      headcount: clampInt(s.headcount, 1, 1000),
      startMonth: clampInt(s.startMonth, 1, 36),
    })),
    fixedCosts: out.fixedCosts.slice(0, 20).map((c) => ({
      id: id("charge"),
      label: text(c.label, 120),
      note: text(c.rationale, 400),
      monthly: clampInt(c.monthly, 0, 1e11),
    })),
    financing: {
      note: text(out.financing.rationale, 400),
      equity: ctx.budget ? Math.min(clampInt(out.financing.equity, 0, 1e12), ctx.budget) : clampInt(out.financing.equity, 0, 1e12),
      grants: clampInt(out.financing.grants, 0, 1e12),
      loans: out.financing.loans.slice(0, 3).map((l) => {
        const months = clampInt(l.months, 6, 120);
        return {
          id: id("pret"),
          label: text(l.label, 120) || "Prêt bancaire",
          note: text(l.rationale, 400),
          principal: clampInt(l.principal, 0, 1e12),
          annualRate: clampRate(l.annualRate, 0, 0.3),
          months,
          deferralMonths: Math.min(clampInt(l.deferralMonths, 0, 12), months - 1),
        };
      }),
    },
    workingCapital: {
      customerDays: clampInt(out.customerDays, 0, 120),
      supplierDays: clampInt(out.supplierDays, 0, 120),
    },
    generation: {
      model: meta.model,
      generatedAt: meta.generatedAt,
      summary: text(out.summary, 1200),
      warnings: out.warnings.slice(0, 8).map((w) => text(w, 400)),
    },
  };

  if (assumptions.offers.length === 0) {
    throw new Error("L'IA n'a proposé aucune vente.");
  }
  return assumptionsSchema.parse(assumptions);
}

export type GenerationResult = {
  assumptions: Assumptions;
  usage: { inputTokens: number | null; outputTokens: number | null };
  durationMs: number;
};

/** Appelle l'IA et renvoie des hypothèses validées, prêtes pour le moteur. */
export async function generateAssumptions(
  ctx: ProjectContext,
  params: CountryParams,
  provenance: ParamProvenance[],
  model: string = ASSUMPTIONS_MODEL,
): Promise<GenerationResult> {
  const minimumWage = provenance.find((p) => p.code === "revenu_minimum_mensuel")?.value ?? 150_000;
  const started = Date.now();
  const result = await generateText({
    model: resolveModel(model),
    instructions: buildInstructions(minimumWage),
    prompt: buildPrompt(ctx, params),
    output: Output.object({ schema: aiOutputSchema }),
    maxRetries: 1,
    timeout: 110_000,
  });

  const assumptions = normalizeAiOutput(result.output, ctx, minimumWage, {
    model,
    generatedAt: new Date().toISOString(),
    startMonth: nextMonth(),
  });

  return {
    assumptions,
    usage: {
      inputTokens: result.usage?.inputTokens ?? null,
      outputTokens: result.usage?.outputTokens ?? null,
    },
    durationMs: Date.now() - started,
  };
}
