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
    expect(text).toContain("organisme de création d'entreprise indiqué dans le contexte");
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

describe("où vont les ventes", () => {
  it("répartit 100 FCFA de ventes entre achats, charges, impôts et bénéfice", async () => {
    const { salesBreakdown } = await import("@/lib/sales-breakdown");
    const year = {
      revenue: 1000, variableCosts: 520, staffCost: 100, fixedCosts: 80, setupCosts: 10, depreciation: 10, interest: 0,
      incomeTax: 84, netResult: 196,
    } as Parameters<typeof salesBreakdown>[0];
    const b = salesBreakdown(year)!;
    expect(b.parts.map((p) => p.share)).toEqual([52, 20, 8, 20]);
    expect(b.parts.reduce((t, p) => t + p.share, 0)).toBe(100);
    expect(b.loss).toBe(0);
  });

  it("isole la perte", async () => {
    const { salesBreakdown } = await import("@/lib/sales-breakdown");
    const b = salesBreakdown({ revenue: 1000, variableCosts: 600, staffCost: 300, fixedCosts: 200, setupCosts: 0, depreciation: 0, interest: 0, incomeTax: 0, netResult: -100 } as Parameters<typeof salesBreakdown>[0])!;
    expect(b.loss).toBe(100);
    expect(b.parts.find((p) => p.key === "benefice")!.share).toBe(0);
  });
});
