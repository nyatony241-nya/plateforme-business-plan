import { computeScenarios } from "@/engine";
import { generateAssumptions } from "@/lib/ai/generate-assumptions";
import { toPlanInput } from "@/lib/assumptions";
import { checkPlanCoherence } from "@/lib/coherence";

export const maxDuration = 120;

// Route d'essai, uniquement sur les déploiements de prévisualisation.
export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") return new Response("Introuvable", { status: 404 });
  const q = new URL(request.url).searchParams;
  const params = {
    currency: "XAF" as const, corporateTaxRate: 0.3, minimumTaxRate: 0.01, minimumTaxFloor: 500_000,
    minimumTaxExemptYears: 0, employerContributions: [{ label: "Cotisations", rate: 0.221, monthlyCeiling: 1_500_000 }],
    lossCarryForwardYears: 5,
  };
  const ctx = {
    name: q.get("nom") ?? "tchock's", countryName: "Gabon", city: "Libreville", district: "akanda",
    sector: q.get("secteur") ?? "pret a porter", idea: q.get("idee") ?? "boutique de vente de chaussettes de marques",
    budget: Number(q.get("budget") ?? 500_000), mode: (q.get("mode") ?? "en_ligne") as "en_ligne", staffing: (q.get("staff") ?? "seul") as "seul",
  };
  try {
    const result = await generateAssumptions(ctx, params, []);
    const plan = computeScenarios(toPlanInput(result.assumptions, params));
    const y = plan.realiste.years[0];
    return Response.json({
      durationMs: result.durationMs,
      usage: result.usage,
      offres: result.assumptions.offers.map((o) => ({ label: o.label, nature: o.nature, prix: o.unitPrice, cout: o.unitCost, part: Math.round((o.unitCost / o.unitPrice) * 100) + " %", volume: o.monthlyVolume })),
      charges: result.assumptions.fixedCosts.map((c) => `${c.label}: ${c.monthly}`),
      an1: { ventes: y.revenue, benefice: y.netResult, marge: Math.round((y.netResult / y.revenue) * 100) + " %" },
      controleFinal: checkPlanCoherence(result.assumptions, plan, ctx.budget),
      avertissements: result.assumptions.generation?.warnings,
    });
  } catch (error) {
    return Response.json({ erreur: String(error) }, { status: 500 });
  }
}
