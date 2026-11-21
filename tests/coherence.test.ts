import { describe, expect, it } from "vitest";
import { computeScenarios } from "@/engine";
import { defaultAssumptions, toPlanInput, type Assumptions } from "@/lib/assumptions";
import { checkPlanCoherence } from "@/lib/coherence";
import { TEST_PARAMS } from "./engine/fixtures";

function plan(offers: Assumptions["offers"], fixedMonthly = 300_000): Assumptions {
  return {
    ...defaultAssumptions(new Date("2026-11-21T12:00:00Z")),
    offers,
    fixedCosts: [{ id: "c", label: "Loyer et charges", monthly: fixedMonthly }],
    financing: { equity: 3_000_000, grants: 0, loans: [] },
  };
}
const offer = (o: Partial<Assumptions["offers"][number]>): Assumptions["offers"][number] => ({
  id: "o",
  label: "Pack de 5 paires",
  nature: "produit",
  unitPrice: 10_000,
  unitCost: 5_000,
  monthlyVolume: 100,
  rampUpMonths: 3,
  annualVolumeGrowth: 0,
  ...o,
});
const check = (a: Assumptions, budget: number | null = 3_000_000) =>
  checkPlanCoherence(a, computeScenarios(toPlanInput(a, TEST_PARAMS)), budget);

describe("contrôle de cohérence du plan", () => {
  it("accepte un plan vraisemblable", () => {
    expect(check(plan([offer({})]))).toEqual([]);
  });

  it("repère un produit revendu presque gratuitement (le cas des chaussettes à 500 FCFA)", () => {
    const issues = check(plan([offer({ unitCost: 500 })]));
    expect(issues.some((i) => i.includes("coûte seulement 5 %"))).toBe(true);
  });

  it("accepte un service à faible coût", () => {
    expect(check(plan([offer({ nature: "service", unitCost: 500, monthlyVolume: 40 })], 250_000)).some((i) => i.includes("coûte seulement"))).toBe(false);
  });

  it("repère une vente à perte", () => {
    expect(check(plan([offer({ unitCost: 12_000 })])).some((i) => i.includes("vendu à perte"))).toBe(true);
  });

  it("repère un bénéfice anormalement élevé", () => {
    const issues = check(plan([offer({ nature: "service", unitCost: 500 })], 20_000));
    expect(issues.some((i) => i.includes("anormalement élevé"))).toBe(true);
  });

  it("repère des ventes hors de proportion avec le budget", () => {
    const issues = check(plan([offer({ monthlyVolume: 1_000 })]), 500_000);
    expect(issues.some((i) => i.includes("fois le budget"))).toBe(true);
  });
});
