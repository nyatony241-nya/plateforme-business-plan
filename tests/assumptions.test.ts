import { describe, expect, it } from "vitest";
import { computePlan } from "@/engine";
import { assumptionsSchema, defaultAssumptions, nextMonth, toPlanInput, type Assumptions } from "@/lib/assumptions";
import { formatCompactXaf, formatMonth, parseInteger, parsePercent } from "@/lib/format";
import { TEST_PARAMS } from "./engine/fixtures";

describe("hypothèses par défaut", () => {
  it("démarrent le mois suivant, y compris en décembre", () => {
    expect(nextMonth(new Date("2026-11-21T12:00:00Z"))).toBe("2026-12");
    expect(nextMonth(new Date("2026-12-05T12:00:00Z"))).toBe("2027-01");
  });

  it("sont valides et calculables tout de suite", () => {
    const a = defaultAssumptions(new Date("2026-11-21T12:00:00Z"));
    expect(assumptionsSchema.safeParse(a).success).toBe(true);
    const plan = computePlan(toPlanInput(a, TEST_PARAMS));
    expect(plan.years[0].revenue).toBe(0);
  });
});

describe("conversion vers le moteur", () => {
  const a: Assumptions = {
    ...defaultAssumptions(new Date("2026-11-21T12:00:00Z")),
    startMonth: "2027-01",
    offers: [{ id: "o", label: "", unitPrice: 10_000, unitCost: 4_000, monthlyVolume: 100, rampUpMonths: 0, annualVolumeGrowth: 0 }],
    fixedCosts: [{ id: "c", label: "Loyer", monthly: 300_000 }],
    staff: [{ id: "s", label: "Vendeur", monthlyGross: 200_000, headcount: 1, startMonth: 1 }],
    investments: [{ id: "i", label: "Matériel", kind: "materiel", amount: 1_200_000, lifeYears: 5 }],
    financing: { equity: 2_000_000, grants: 0, loans: [] },
  };

  it("donne les mêmes résultats que le cas de référence calculé à la main", () => {
    const plan = computePlan(toPlanInput(a, TEST_PARAMS));
    expect(plan.years[0].resultBeforeTax).toBe(480_000);
    expect(plan.years[0].netResult).toBe(336_000);
  });

  it("nomme les lignes laissées sans libellé", () => {
    expect(toPlanInput(a, TEST_PARAMS).offers[0].label).toBe("Vente");
  });

  it("refuse une valeur hors bornes à l'enregistrement", () => {
    const bad = { ...a, years: 4 };
    expect(assumptionsSchema.safeParse(bad).success).toBe(false);
  });
});

describe("formats français", () => {
  it("lit les montants saisis avec espaces ou points", () => {
    expect(parseInteger("1 200 000")).toBe(1_200_000);
    expect(parseInteger("1.200.000 FCFA")).toBe(1_200_000);
    expect(parseInteger("")).toBe(0);
  });

  it("lit les pourcentages avec virgule", () => {
    expect(parsePercent("12,5")).toBeCloseTo(0.125, 10);
    expect(parsePercent("8")).toBeCloseTo(0.08, 10);
  });

  it("abrège les montants des axes", () => {
    expect(formatCompactXaf(1_250_000)).toBe("1,3 M");
    expect(formatCompactXaf(-850_000)).toBe("−850 k");
  });

  it("écrit les mois en français", () => {
    expect(formatMonth("2027-01")).toBe("janv. 2027");
  });
});
