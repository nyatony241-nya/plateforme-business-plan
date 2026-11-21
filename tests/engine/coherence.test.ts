import { describe, expect, it } from "vitest";
import { computePlan, type PlanInput } from "@/engine";
import { TEST_PARAMS } from "./fixtures";

/** Un plan volontairement chargé : tout est activé pour vérifier que les comptes tombent juste. */
const complexPlan: PlanInput = {
  startMonth: "2027-04",
  years: 5,
  investments: [
    { label: "Travaux", kind: "travaux", amount: 3_333_333, lifeYears: 7 },
    { label: "Ordinateurs", kind: "informatique", amount: 1_250_000, lifeYears: 3, month: 6 },
    { label: "Caution", kind: "caution", amount: 600_000, lifeYears: 0 },
    { label: "Stock", kind: "stock_initial", amount: 900_000, lifeYears: 0 },
    { label: "Création", kind: "frais_creation", amount: 350_000, lifeYears: 0 },
  ],
  offers: [
    {
      label: "Coupe",
      unitPrice: 7_000,
      unitCost: 1_300,
      monthlyVolume: 333,
      rampUpMonths: 7,
      seasonality: [0.9, 0.8, 1, 1, 1, 1, 1.1, 1.2, 1, 1, 1.1, 1.6],
      annualVolumeGrowth: 0.07,
      annualPriceIncrease: 0.03,
    },
    { label: "Produits", unitPrice: 12_500, unitCost: 8_100, monthlyVolume: 47, rampUpMonths: 3 },
  ],
  staff: [
    { label: "Coiffeuse", monthlyGross: 175_000, headcount: 3, annualRaise: 0.04 },
    { label: "Caissière", monthlyGross: 150_000, headcount: 1, startMonth: 9 },
  ],
  fixedCosts: [
    { label: "Loyer", monthly: 450_000, annualIncrease: 0.05 },
    { label: "Électricité", monthly: 137_500 },
    { label: "Marketing", monthly: 100_000, startMonth: 2 },
  ],
  financing: {
    equity: 2_500_000,
    grants: 0,
    loans: [{ label: "Banque", principal: 4_000_000, annualRate: 0.135, months: 36, deferralMonths: 6 }],
  },
  workingCapital: { customerDays: 7, supplierDays: 30 },
  params: TEST_PARAMS,
};

describe("cohérence comptable d'un plan complet", () => {
  const plan = computePlan(complexPlan);

  it("produit des montants entiers", () => {
    for (const row of plan.months) {
      for (const value of Object.values(row)) {
        if (typeof value === "number") expect(Number.isInteger(value)).toBe(true);
      }
      for (const value of Object.values(row.cash)) expect(Number.isInteger(value)).toBe(true);
    }
  });

  it("relie chaque ligne du compte de résultat", () => {
    for (const r of plan.months) {
      expect(r.grossMargin).toBe(r.revenue - r.variableCosts);
      expect(r.ebitda).toBe(r.grossMargin - r.staffCost - r.fixedCosts - r.setupCosts);
      expect(r.operatingResult).toBe(r.ebitda - r.depreciation);
      expect(r.resultBeforeTax).toBe(r.operatingResult - r.interest);
      expect(r.netResult).toBe(r.resultBeforeTax - r.incomeTax);
    }
  });

  it("boucle la trésorerie mois par mois", () => {
    let previous = 0;
    for (const r of plan.months) {
      const c = r.cash;
      expect(c.net).toBe(
        c.operating - c.workingCapitalChange - c.investments + c.financingIn - c.loanRepayment - c.taxPaid,
      );
      expect(c.end).toBe(previous + c.net);
      previous = c.end;
    }
  });

  it("fait de chaque total annuel la somme exacte de ses 12 mois", () => {
    plan.years.forEach((y, i) => {
      const rows = plan.months.slice(i * 12, i * 12 + 12);
      expect(y.revenue).toBe(rows.reduce((t, r) => t + r.revenue, 0));
      expect(y.netResult).toBe(rows.reduce((t, r) => t + r.netResult, 0));
      expect(y.cashEnd).toBe(rows[11].cash.end);
    });
  });

  it("rembourse exactement l'emprunt dans la période", () => {
    expect(plan.months.reduce((t, r) => t + r.cash.loanRepayment, 0)).toBe(4_000_000);
  });

  it("n'enregistre l'impôt qu'en fin d'exercice", () => {
    for (const r of plan.months) {
      if (r.index % 12 !== 0) expect(r.incomeTax).toBe(0);
    }
  });

  it("est déterministe", () => {
    expect(computePlan(complexPlan)).toEqual(plan);
  });

  it("indique la version du moteur", () => {
    expect(plan.engineVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
