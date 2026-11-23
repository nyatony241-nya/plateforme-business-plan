import { usageFrom } from "@/lib/ai/pricing";
import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL, resolveModel } from "@/lib/ai/model";
import { BUDGET_OPTIONS, type ProjectMode, type ProjectStaffing } from "@/lib/project-options";

/** Ce que l'assistant a compris de l'idée ; null = information absente, à demander. */
export type IdeaAnalysis = {
  summary: string;
  name: string;
  sector: string;
  cityId: string | null;
  district: string;
  budget: number | null;
  mode: ProjectMode | null;
  staffing: ProjectStaffing | null;
  /** Question à poser si l'idée est trop vague pour faire un plan. */
  clarification: string | null;
};

const aiSchema = z.object({
  clear: z.boolean().describe("true si l'on comprend ce que l'entrepreneur veut vendre et à qui"),
  clarification: z.string().describe("Si clear est false : une seule question courte pour préciser l'idée. Sinon chaîne vide."),
  summary: z.string().describe("L'idée reformulée en une ou deux phrases simples, à la deuxième personne (« Vous voulez… »)."),
  name: z.string().describe("Nom du projet : celui donné par l'entrepreneur, sinon un nom court et descriptif (2 à 5 mots)."),
  sector: z.string().describe("Secteur d'activité en quelques mots (ex. « Prêt-à-porter », « Restauration »)."),
  city: z.string().describe("Ville citée, parmi la liste fournie ; chaîne vide si aucune n'est citée."),
  country: z
    .string()
    .describe("Pays cité, ou pays de la ville citée, tel qu'écrit dans la liste fournie ; chaîne vide si rien n'est dit."),
  district: z.string().describe("Quartier ou lieu précis cité ; chaîne vide sinon."),
  budget: z.number().describe("Budget de départ en FCFA s'il est cité (convertis « 2 millions » en 2000000) ; 0 sinon."),
  mode: z.enum(["local", "en_ligne", "mixte", "inconnu"]).describe("local : boutique, atelier, salon… ; en_ligne : sans local ; mixte : les deux ; inconnu si rien n'est dit."),
  staffing: z.enum(["seul", "recruter", "inconnu"]).describe("seul ou avec du personnel ; inconnu si rien n'est dit."),
});

export type AiIdea = z.infer<typeof aiSchema>;

const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s'’-]+/g, "")
    .trim();

/** Plus petite tranche de budget qui contient le montant cité. */
export function budgetBucket(amount: number): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return BUDGET_OPTIONS.find((o) => amount <= o.value)?.value ?? BUDGET_OPTIONS[BUDGET_OPTIONS.length - 1].value;
}

/** Transforme la réponse de l'IA : ville reconnue dans la liste, budget ramené à une tranche, textes bornés. */
export function normalizeIdea(
  out: AiIdea,
  cities: { id: string; name: string; countryName?: string }[],
): IdeaAnalysis {
  // Même nom de ville dans deux pays : le pays cité départage.
  const sameName = cities.filter((c) => out.city && strip(c.name) === strip(out.city));
  const city =
    sameName.find((c) => out.country && c.countryName && strip(c.countryName) === strip(out.country)) ?? sameName[0];
  // Un quartier qui porte le nom d'une ville pilote (ex. « Akanda ») désigne cette ville.
  const cityFromDistrict = !city ? cities.find((c) => out.district && strip(c.name) === strip(out.district)) : undefined;
  const clarification = out.clear ? null : out.clarification.trim().slice(0, 300) || "Que voulez-vous vendre, et à qui ?";
  return {
    summary: out.summary.trim().slice(0, 600),
    name: (out.name.trim() || "Mon projet").slice(0, 120),
    sector: out.sector.trim().slice(0, 120),
    cityId: (city ?? cityFromDistrict)?.id ?? null,
    district: cityFromDistrict ? "" : out.district.trim().slice(0, 120),
    budget: budgetBucket(out.budget),
    mode: out.mode === "inconnu" ? null : out.mode,
    staffing: out.staffing === "inconnu" ? null : out.staffing,
    clarification,
  };
}

/** Lit l'idée décrite librement et en tire les informations du projet. */
export async function analyzeIdea(idea: string, cities: { id: string; name: string; countryName?: string }[]) {
  const started = Date.now();
  const result = await generateText({
    model: resolveModel(DEFAULT_MODEL),
    instructions: [
      "Tu aides un entrepreneur africain à cadrer son projet. Il a décrit son idée librement, parfois avec des fautes ou en langage oral.",
      "Extrais uniquement ce qu'il a dit ; n'invente ni ville, ni quartier, ni budget, ni organisation. Ce qui n'est pas dit reste vide ou « inconnu ».",
      `Villes possibles (pays) : ${cities.map((c) => (c.countryName ? `${c.name} (${c.countryName})` : c.name)).join(", ")}.`,
    ].join("\n"),
    prompt: `Idée de l'entrepreneur :\n${idea}`,
    output: Output.object({ schema: aiSchema }),
    maxRetries: 1,
    timeout: 45_000,
  });
  return {
    analysis: normalizeIdea(result.output, cities),
    durationMs: Date.now() - started,
    usage: usageFrom(result.usage),
  };
}
