import type { PlanResult, ScenarioId } from "@/engine";
import type { Assumptions } from "@/lib/assumptions";

/** Seuils de vraisemblance d'un plan de petite entreprise. */
export const COHERENCE = {
  /** Part minimale du coût dans le prix d'un produit revendu. */
  minProductCostShare: 0.35,
  /** Bénéfice net de la 1re année au-delà duquel le plan est jugé trop beau (scénario réaliste). */
  maxNetMarginYear1: 0.4,
  /** Ventes de la 1re année au-delà de ce multiple du budget de départ. */
  maxRevenueToBudget: 30,
} as const;

const pct = (x: number) => `${Math.round(x * 100)} %`;

/**
 * Contrôle de cohérence d'un plan calculé. Renvoie les anomalies en français, assez précises
 * pour être corrigées par l'IA et compréhensibles par l'entrepreneur. Liste vide = plan vraisemblable.
 */
export function checkPlanCoherence(
  a: Assumptions,
  results: Record<ScenarioId, PlanResult>,
  budget: number | null,
  context: { mode?: "local" | "en_ligne" | "mixte" | null } = {},
): string[] {
  const issues: string[] = [];

  if ((context.mode === "local" || context.mode === "mixte") && !a.fixedCosts.some((c) => /loyer/i.test(c.label))) {
    issues.push("L'activité se fait dans un local, mais aucun loyer n'est prévu dans les charges mensuelles.");
  }

  for (const o of a.offers) {
    if (o.unitPrice <= 0) continue;
    const share = o.unitCost / o.unitPrice;
    if (o.unitCost >= o.unitPrice) {
      issues.push(`« ${o.label} » est vendu à perte : coût ${o.unitCost} FCFA pour un prix de ${o.unitPrice} FCFA.`);
    } else if (o.nature === "produit" && share < COHERENCE.minProductCostShare) {
      issues.push(
        `« ${o.label} » coûte seulement ${pct(share)} de son prix de vente : pour un produit revendu, comptez 40 à 70 %.`,
      );
    }
  }

  const y1 = results.realiste.years[0];
  if (y1.revenue > 0 && y1.netResult / y1.revenue > COHERENCE.maxNetMarginYear1) {
    issues.push(
      `Le bénéfice de la 1re année atteint ${pct(y1.netResult / y1.revenue)} des ventes : c'est anormalement élevé pour une petite entreprise (vérifiez coûts d'achat, charges et volumes).`,
    );
  }

  if (budget && budget > 0 && y1.revenue > budget * COHERENCE.maxRevenueToBudget) {
    issues.push(
      `Les ventes de la 1re année (${y1.revenue} FCFA) dépassent ${COHERENCE.maxRevenueToBudget} fois le budget de départ : volumes probablement trop élevés pour ce budget.`,
    );
  }

  return issues;
}
