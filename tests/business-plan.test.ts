import { describe, expect, it } from "vitest";
import { computeScenarios } from "@/engine";
import { buildDocumentInstructions, buildDocumentPrompt, prose } from "@/lib/ai/generate-plan-document";
import { defaultAssumptions, toPlanInput, type Assumptions } from "@/lib/assumptions";
import { monthlyMarketingBudget, splitBudget } from "@/lib/business-plan";
import { TEST_PARAMS } from "./engine/fixtures";

const a: Assumptions = {
  ...defaultAssumptions(new Date("2026-11-21T12:00:00Z")),
  offers: [{ id: "o", label: "Paire de chaussettes", unitPrice: 1500, unitCost: 600, monthlyVolume: 250, rampUpMonths: 3, annualVolumeGrowth: 0 }],
  fixedCosts: [
    { id: "c1", label: "Loyer", monthly: 125_000 },
    { id: "c2", label: "Communication et visibilité locale", monthly: 30_000 },
    { id: "c3", label: "Publicité Facebook", monthly: 20_000 },
  ],
  financing: { equity: 2_000_000, grants: 0, loans: [] },
};

describe("budget marketing", () => {
  it("additionne les charges de marketing, et seulement elles", () => {
    expect(monthlyMarketingBudget(a)).toBe(50_000);
  });

  it("répartit le budget selon les parts, au franc près", () => {
    const amounts = splitBudget(50_000, [{ part: 33 }, { part: 33 }, { part: 34 }]);
    expect(amounts.reduce((t, x) => t + x, 0)).toBe(50_000);
    expect(amounts[2]).toBe(17_000);
  });

  it("donne zéro sans budget ou sans parts", () => {
    expect(splitBudget(0, [{ part: 50 }])).toEqual([0]);
    expect(splitBudget(10_000, [{ part: 0 }])).toEqual([0]);
  });
});

describe("consignes de rédaction", () => {
  it("interdisent les montants, les statistiques et les noms inventés", () => {
    const text = buildDocumentInstructions();
    expect(text).toContain("AUCUN montant");
    expect(text).toContain("N'invente ni statistique");
    expect(text).toContain("ANPI-Gabon");
  });

  it("décrivent le modèle sans transmettre de montant", () => {
    const results = computeScenarios(toPlanInput(a, TEST_PARAMS));
    const prompt = buildDocumentPrompt(
      {
        name: "tchock's",
        countryName: "Gabon",
        city: "Libreville",
        district: "Akanda",
        sector: "prêt-à-porter",
        idea: "Boutique de chaussettes",
        budget: 3_000_000,
        mode: "local",
        staffing: "seul",
      },
      a,
      results.realiste,
    );
    expect(prompt).toContain("Akanda, Libreville, Gabon");
    expect(prompt).toContain("Paire de chaussettes");
    expect(prompt).not.toMatch(/\d{3}\s?000/);
  });
});

describe("mise en paragraphes", () => {
  it("sépare deux phrases collées sans toucher aux sigles", () => {
    expect(prose("des cadeaux.Le projet", 100)).toBe("des cadeaux.\nLe projet");
    expect(prose("une S.A.R.L. Elle vend", 100)).toBe("une S.A.R.L. Elle vend");
  });
});

describe("affichage des montants", () => {
  it("n'affiche jamais « -0 »", async () => {
    const { formatXaf } = await import("@/lib/format");
    expect(formatXaf(-0)).toBe(formatXaf(0));
    expect(formatXaf(-0.4)).toBe(formatXaf(0));
  });
});
