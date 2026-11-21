import { computeScenarios } from "@/engine";
import { generateAssumptions } from "@/lib/ai/generate-assumptions";
import { toPlanInput } from "@/lib/assumptions";

export const maxDuration = 120;

// Route d'essai, uniquement sur les déploiements de prévisualisation.
export async function GET(request: Request) {
  const model = new URL(request.url).searchParams.get("model") ?? undefined;
  if (process.env.VERCEL_ENV !== "preview") return new Response("Introuvable", { status: 404 });
  const params = {
    currency: "XAF" as const,
    corporateTaxRate: 0.3,
    minimumTaxRate: 0.01,
    minimumTaxFloor: 500_000,
    minimumTaxExemptYears: 0,
    employerContributions: [{ label: "Cotisations", rate: 0.221, monthlyCeiling: 1_500_000 }],
    lossCarryForwardYears: 5,
  };
  try {
    const result = await generateAssumptions(
      {
        name: "tchock's",
        countryName: "Gabon",
        city: "Libreville",
        district: "akanda",
        sector: "pret a porter",
        idea: "boutique de chaussettes",
        budget: 3_000_000,
        mode: "local",
        staffing: "seul",
      },
      params,
      [],
      model,
    );
    const plan = computeScenarios(toPlanInput(result.assumptions, params));
    return Response.json({
      model: result.assumptions.generation?.model,
      durationMs: result.durationMs,
      usage: result.usage,
      assumptions: result.assumptions,
      an1: Object.fromEntries(
        Object.entries(plan).map(([k, r]) => [k, { ca: r.years[0].revenue, resultat: r.years[0].netResult, tresoFin: r.years[0].cashEnd }]),
      ),
      besoin: plan.realiste.financing,
    });
  } catch (error) {
    return Response.json({ erreur: String(error) }, { status: 500 });
  }
}
