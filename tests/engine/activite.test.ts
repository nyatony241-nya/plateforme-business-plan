import { describe, expect, it } from "vitest";
import { computePlan, computeScenarios, EngineInputError } from "@/engine";
import { caseA } from "./fixtures";

const offer = { label: "Produit", unitPrice: 10_000, unitCost: 4_000, monthlyVolume: 100 };

describe("chiffre d'affaires", () => {
  it("applique une montée en charge linéaire", () => {
    const plan = computePlan(caseA({ offers: [{ ...offer, rampUpMonths: 4 }] }));
    expect(plan.months.slice(0, 5).map((m) => m.revenue)).toEqual([
      250_000, 500_000, 750_000, 1_000_000, 1_000_000,
    ]);
  });

  it("applique la saisonnalité au bon mois calendaire", () => {
    const seasonality = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2]; // décembre double
    const plan = computePlan(caseA({ startMonth: "2027-11", offers: [{ ...offer, seasonality }] }));
    expect(plan.months[0].month).toBe("2027-11");
    expect(plan.months[1].month).toBe("2027-12");
    expect(plan.months[1].revenue).toBe(2_000_000);
    expect(plan.months[2].revenue).toBe(1_000_000);
  });

  it("applique la croissance annuelle à partir de la 2e année", () => {
    const plan = computePlan(caseA({ offers: [{ ...offer, annualVolumeGrowth: 0.1, annualPriceIncrease: 0.05 }] }));
    expect(plan.months[11].revenue).toBe(1_000_000);
    expect(plan.months[12].revenue).toBe(1_155_000); // 110 × 10 500
    expect(plan.months[12].variableCosts).toBe(462_000); // 110 × 4 200
  });

  it("additionne plusieurs offres", () => {
    const plan = computePlan(
      caseA({ offers: [offer, { label: "Service", unitPrice: 5_000, unitCost: 0, monthlyVolume: 20 }] }),
    );
    expect(plan.months[0].revenue).toBe(1_100_000);
    expect(plan.months[0].variableCosts).toBe(400_000);
  });
});

describe("personnel et charges", () => {
  it("démarre un salaire au mois d'embauche et l'augmente chaque année", () => {
    const plan = computePlan(
      caseA({ staff: [{ label: "Vendeur", monthlyGross: 200_000, headcount: 2, startMonth: 3, annualRaise: 0.1 }] }),
    );
    expect(plan.months[1].staffCost).toBe(0);
    expect(plan.months[2].staffCost).toBe(480_000);
    expect(plan.months[12].staffCost).toBe(528_000);
  });

  it("indexe une charge fixe chaque année", () => {
    const plan = computePlan(caseA({ fixedCosts: [{ label: "Loyer", monthly: 300_000, annualIncrease: 0.05 }] }));
    expect(plan.months[12].fixedCosts).toBe(315_000);
  });
});

describe("besoin en fonds de roulement", () => {
  it("décale l'encaissement quand les clients paient à 30 jours", () => {
    const plan = computePlan(caseA({ workingCapital: { customerDays: 30, supplierDays: 0 } }));
    expect(plan.months[0].cash.workingCapitalChange).toBe(1_000_000);
    expect(plan.months[1].cash.workingCapitalChange).toBe(0);
    expect(plan.months[0].cash.end).toBe(-140_000);
    expect(plan.financing.shortfall).toBe(140_000);
  });

  it("réduit le besoin quand les fournisseurs sont payés à 30 jours", () => {
    const plan = computePlan(caseA({ workingCapital: { customerDays: 0, supplierDays: 30 } }));
    expect(plan.months[0].cash.workingCapitalChange).toBe(-400_000);
  });
});

describe("scénarios", () => {
  it("dérive les trois scénarios des mêmes hypothèses", () => {
    const all = computeScenarios(caseA());
    expect(all.realiste.months[0].revenue).toBe(1_000_000);
    expect(all.prudent.months[0].revenue).toBe(800_000);
    expect(all.prudent.months[0].variableCosts).toBe(336_000); // 80 × 4 000 × 1,05
    expect(all.prudent.months[0].fixedCosts).toBe(315_000);
    expect(all.optimiste.months[0].revenue).toBe(1_150_000);
    expect(all.prudent.years[0].netResult).toBeLessThan(all.realiste.years[0].netResult);
    expect(all.realiste.years[0].netResult).toBeLessThan(all.optimiste.years[0].netResult);
  });

  it("accepte des coefficients personnalisés", () => {
    const plan = computePlan(
      caseA({ scenarios: { prudent: { volume: 0.5, price: 0.9, unitCost: 1, fixedCosts: 1 } } }),
      "prudent",
    );
    expect(plan.months[0].revenue).toBe(450_000);
  });
});

describe("contrôles de saisie", () => {
  it("refuse un mois de démarrage invalide", () => {
    expect(() => computePlan(caseA({ startMonth: "2027-13" }))).toThrow(EngineInputError);
  });

  it("refuse une saisonnalité incomplète", () => {
    expect(() => computePlan(caseA({ offers: [{ ...offer, seasonality: [1, 1, 1] }] }))).toThrow(/12 coefficients/);
  });

  it("exige une durée d'amortissement pour le matériel", () => {
    expect(() =>
      computePlan(caseA({ investments: [{ label: "Four", kind: "materiel", amount: 500_000, lifeYears: 0 }] })),
    ).toThrow(/amortissement/);
  });

  it("refuse un montant négatif", () => {
    expect(() => computePlan(caseA({ fixedCosts: [{ label: "Loyer", monthly: -1 }] }))).toThrow(EngineInputError);
  });
});
