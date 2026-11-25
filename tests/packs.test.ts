import { describe, expect, it } from "vitest";
import { bestPerPlan, perPlan, saving, singlePrice } from "@/lib/packs";

const PACKS = [
  { credits: 1, price_xaf: 4900 },
  { credits: 3, price_xaf: 12900 },
  { credits: 5, price_xaf: 19900 },
  { credits: 10, price_xaf: 34900 },
];

describe("formules", () => {
  it("chaque plan coûte moins cher quand on en achète plus", () => {
    const prices = PACKS.map(perPlan);
    expect(prices).toEqual([4900, 4300, 3980, 3490]);
    expect([...prices].sort((a, b) => b - a)).toEqual(prices);
  });

  it("affiche l'économie par rapport au plan seul", () => {
    expect(singlePrice(PACKS)).toBe(4900);
    expect(PACKS.map((p) => saving(p, PACKS))).toEqual([0, 12, 19, 29]);
    expect(bestPerPlan(PACKS)).toBe(3490);
    expect(bestPerPlan([])).toBeNull();
  });

  it("garde au moins 90 % de marge sur chaque plan payé, même au prix le plus bas", () => {
    // Coût d'un plan payé : aperçu + suite + couverture IA ≈ 75 FCFA (tarifs Google 2027), paiement ≈ 3 %.
    const costPerPlan = 75;
    for (const p of PACKS) {
      const margin = 1 - (costPerPlan + 0.03 * perPlan(p)) / perPlan(p);
      expect(margin).toBeGreaterThanOrEqual(0.9);
    }
  });
});
