import { describe, expect, it } from "vitest";
import { computePlan, employerCost } from "@/engine";
import { caseA, TEST_PARAMS } from "./fixtures";

const contributions = [
  { label: "Prestations familiales", rate: 0.05, monthlyCeiling: 1_500_000 },
  { label: "Retraite", rate: 0.11, monthlyCeiling: 1_500_000 },
  { label: "Maladie", rate: 0.041, monthlyCeiling: 2_500_000 },
];

describe("cotisations patronales plafonnées", () => {
  it("applique tous les taux sous les plafonds", () => {
    // 200 000 × (5 % + 11 % + 4,1 %) = 40 200
    expect(employerCost(200_000, { employerContributions: contributions })).toBeCloseTo(240_200, 6);
  });

  it("limite chaque cotisation à son propre plafond", () => {
    // 2 000 000 + 1 500 000 × 16 % + 2 000 000 × 4,1 % = 2 000 000 + 240 000 + 82 000
    expect(employerCost(2_000_000, { employerContributions: contributions })).toBeCloseTo(2_322_000, 6);
  });

  it("s'applique dans le plan, par salarié", () => {
    const plan = computePlan(
      caseA({
        params: { ...TEST_PARAMS, employerContributions: contributions },
        staff: [{ label: "Directeur", monthlyGross: 2_000_000, headcount: 2 }],
      }),
    );
    expect(plan.months[0].staffCost).toBe(4_644_000);
  });
});

describe("dispense de minimum d'impôt", () => {
  it("n'applique pas le minimum pendant les exercices dispensés", () => {
    const params = { ...TEST_PARAMS, minimumTaxExemptYears: 1, minimumTaxFloor: 500_000 };
    const plan = computePlan(caseA({ params, fixedCosts: [{ label: "Charges", monthly: 400_000 }] }));
    expect(plan.years[0].incomeTax).toBe(0);
    expect(plan.years[1].incomeTax).toBe(500_000);
  });
});
