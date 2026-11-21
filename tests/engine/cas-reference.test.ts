import { describe, expect, it } from "vitest";
import { computePlan } from "@/engine";
import { caseA, TEST_PARAMS } from "./fixtures";

describe("cas A : activité rentable dès le premier mois (calculé à la main)", () => {
  const plan = computePlan(caseA());
  const m1 = plan.months[0];

  it("calcule le premier mois ligne par ligne", () => {
    expect(m1).toMatchObject({
      month: "2027-01",
      revenue: 1_000_000,
      variableCosts: 400_000,
      grossMargin: 600_000,
      staffCost: 240_000,
      fixedCosts: 300_000,
      ebitda: 60_000,
      depreciation: 20_000,
      resultBeforeTax: 40_000,
    });
  });

  it("calcule l'impôt et le résultat net annuels", () => {
    const y1 = plan.years[0];
    expect(y1.revenue).toBe(12_000_000);
    expect(y1.resultBeforeTax).toBe(480_000);
    expect(y1.incomeTax).toBe(144_000); // 30 % de 480 000, supérieur au minimum de 120 000
    expect(y1.netResult).toBe(336_000);
    expect(y1.grossMarginRate).toBeCloseTo(0.6, 10);
  });

  it("calcule le seuil de rentabilité annuel", () => {
    // (2 880 000 + 3 600 000 + 240 000) / 0,6
    expect(plan.years[0].breakEvenRevenue).toBe(11_200_000);
  });

  it("calcule la trésorerie de fin d'année", () => {
    // 2 000 000 − 1 200 000 + 12 × 60 000 − 144 000
    expect(plan.years[0].cashEnd).toBe(1_376_000);
    expect(plan.months[0].cash.end).toBe(860_000);
  });

  it("calcule le plan de financement", () => {
    expect(plan.financing).toMatchObject({
      investmentsTotal: 1_200_000,
      totalNeed: 1_140_000,
      resources: { equity: 2_000_000, loans: 0, grants: 0, total: 2_000_000 },
      lowestCash: 860_000,
      lowestCashMonth: 1,
      shortfall: 0,
    });
  });

  it("calcule les indicateurs", () => {
    expect(plan.indicators.breakEvenMonth).toBe(1);
    // −1 200 000 + 60 000 × 23 − 144 000 = 36 000 ≥ 0, alors que le mois 22 donne −24 000
    expect(plan.indicators.paybackMonth).toBe(23);
    expect(plan.indicators.cumulativeNetResult).toBe(1_008_000);
    expect(plan.indicators.returnOnInvestment).toBeCloseTo(0.84, 10);
  });

  it("n'amortit que les mois compris dans la projection", () => {
    expect(plan.years.reduce((t, y) => t + y.depreciation, 0)).toBe(720_000);
  });
});

describe("impôt : minimum et déficits reportables", () => {
  it("applique le minimum d'impôt quand l'activité perd de l'argent", () => {
    const plan = computePlan(caseA({ fixedCosts: [{ label: "Charges", monthly: 400_000 }] }));
    expect(plan.years[0].resultBeforeTax).toBe(-720_000);
    expect(plan.years[0].incomeTax).toBe(120_000); // 1 % de 12 000 000
  });

  it("impute le déficit de l'année 1 sur les bénéfices suivants", () => {
    const plan = computePlan(
      caseA({
        investments: [
          { label: "Matériel", kind: "materiel", amount: 1_200_000, lifeYears: 5 },
          { label: "Frais de création", kind: "frais_creation", amount: 1_000_000, lifeYears: 0 },
        ],
      }),
    );
    expect(plan.years.map((y) => y.resultBeforeTax)).toEqual([-520_000, 480_000, 480_000]);
    // Année 2 : bénéfice entièrement absorbé → minimum d'impôt.
    // Année 3 : reste 40 000 de déficit → IS sur 440 000 = 132 000.
    expect(plan.years.map((y) => y.incomeTax)).toEqual([120_000, 120_000, 132_000]);
  });

  it("ne reporte plus un déficit expiré", () => {
    const plan = computePlan(
      caseA({
        params: { ...TEST_PARAMS, lossCarryForwardYears: 1 },
        investments: [
          { label: "Matériel", kind: "materiel", amount: 1_200_000, lifeYears: 5 },
          { label: "Frais de création", kind: "frais_creation", amount: 1_000_000, lifeYears: 0 },
        ],
      }),
    );
    expect(plan.years[2].incomeTax).toBe(144_000);
  });

  it("applique le plancher du minimum d'impôt", () => {
    const plan = computePlan(caseA({ params: { ...TEST_PARAMS, minimumTaxFloor: 500_000 } }));
    expect(plan.years[0].incomeTax).toBe(500_000);
  });
});

describe("frais de création", () => {
  it("sont une charge du premier mois, pas un investissement amorti", () => {
    const plan = computePlan(
      caseA({ investments: [{ label: "Création", kind: "frais_creation", amount: 300_000, lifeYears: 0 }] }),
    );
    expect(plan.months[0].setupCosts).toBe(300_000);
    expect(plan.months[0].depreciation).toBe(0);
    expect(plan.months[0].cash.investments).toBe(0);
    expect(plan.financing.investmentsTotal).toBe(300_000);
  });
});
