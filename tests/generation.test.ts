import { describe, expect, it } from "vitest";
import { computeScenarios } from "@/engine";
import { buildInstructions, buildPrompt, normalizeAiOutput } from "@/lib/ai/generate-assumptions";
import { toPlanInput } from "@/lib/assumptions";
import { ownerIncome } from "@/lib/owner-income";
import { budgetLabel } from "@/lib/project-options";
import { projectContextSchema } from "@/lib/validation";
import { TEST_PARAMS } from "./engine/fixtures";

const meta = { model: "test", generatedAt: "2026-11-21T10:00:00.000Z", startMonth: "2026-12" };

/** Réponse type de l'IA, avec quelques valeurs hors bornes à corriger. */
function aiOutput() {
  return {
    summary: "Boutique de chaussettes à Akanda, vente au détail.",
    investments: [
      { label: "Étagères", kind: "materiel", amount: 450_000.7, lifeYears: 5, rationale: "Mobilier simple." },
      { label: "Caution", kind: "caution", amount: 300_000, lifeYears: 3, rationale: "Deux mois de loyer." },
      { label: "Inconnu", kind: "fusee", amount: 1, lifeYears: 1, rationale: "" },
    ],
    offers: [
      {
        label: "Paire de chaussettes",
        type: "produit" as "produit" | "service",
        unitPrice: 2_500,
        unitCost: 1_000,
        monthlyVolume: 600,
        rampUpMonths: 99,
        annualVolumeGrowth: 3,
        rationale: "Prix courant en boutique.",
      },
    ],
    staff: [{ label: "Vendeuse", monthlyGross: 90_000, headcount: 1, startMonth: 1, rationale: "Temps plein." }],
    fixedCosts: [{ label: "Loyer", monthly: 150_000, rationale: "Petit local." }],
    financing: { equity: 9_000_000, grants: 0, loans: [], rationale: "Apport personnel." },
    customerDays: 0,
    supplierDays: 30,
    warnings: ["Vérifier le loyer auprès des bailleurs du quartier."],
  };
}

describe("normalisation de la réponse de l'IA", () => {
  const a = normalizeAiOutput(aiOutput(), { budget: 3_000_000 }, 150_000, meta);

  it("arrondit, borne et écarte les types inconnus", () => {
    expect(a.investments).toHaveLength(2);
    expect(a.investments[0].amount).toBe(450_001);
    expect(a.investments[1].lifeYears).toBe(0); // caution : non amortie
    expect(a.offers[0].rampUpMonths).toBe(24);
    expect(a.offers[0].annualVolumeGrowth).toBe(0.5);
  });

  it("applique le salaire minimum et plafonne l'apport au budget", () => {
    expect(a.staff[0].monthlyGross).toBe(150_000);
    expect(a.financing.equity).toBe(3_000_000);
  });

  it("garde l'explication de chaque ligne et la trace de génération", () => {
    expect(a.offers[0].note).toBe("Prix courant en boutique.");
    expect(a.generation?.warnings).toHaveLength(1);
    expect(a.generation?.model).toBe("test");
  });

  it("produit des hypothèses que le moteur calcule", () => {
    const results = computeScenarios(toPlanInput(a, TEST_PARAMS));
    expect(results.realiste.years[0].revenue).toBeGreaterThan(0);
    expect(results.prudent.years[0].revenue).toBeLessThan(results.realiste.years[0].revenue);
  });

  it("relève un coût d'achat invraisemblable et le signale", () => {
    const out = aiOutput();
    out.offers = [
      { ...out.offers[0], label: "Pack de 5 paires de marque", unitPrice: 10_000, unitCost: 500 },
      { ...out.offers[0], label: "Retouche", type: "service" as const, unitPrice: 2_000, unitCost: 300 },
    ];
    const r = normalizeAiOutput(out, { budget: 3_000_000 }, 150_000, meta);
    expect(r.offers[0].unitCost).toBe(3_500); // 35 % du prix pour un produit revendu
    expect(r.offers[1].unitCost).toBe(300); // service : coût faible accepté
    expect(r.generation?.warnings[0]).toContain("Pack de 5 paires de marque");
  });

  it("refuse une réponse sans aucune vente", () => {
    expect(() => normalizeAiOutput({ ...aiOutput(), offers: [] }, { budget: null }, 150_000, meta)).toThrow();
  });
});

describe("consignes envoyées à l'IA", () => {
  it("interdisent les calculs et les statistiques inventées, et fixent le salaire minimum", () => {
    const text = buildInstructions(150_000);
    expect(text).toContain("tu ne calcules ni");
    expect(text).toContain("Tu n'inventes ni statistique");
    expect(text).toContain("150000");
  });

  it("transmettent le lieu, l'idée et le budget choisi", () => {
    const prompt = buildPrompt(
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
      TEST_PARAMS,
    );
    expect(prompt).toContain("Quartier envisagé : Akanda");
    expect(prompt).toContain("1 à 3 millions FCFA");
    expect(prompt).toContain("sans salarié");
  });
});

describe("choix demandés avant la génération", () => {
  it("acceptent uniquement les tranches proposées", () => {
    const ok = projectContextSchema.safeParse({ budget: "3000000", mode: "local", staffing: "seul" });
    expect(ok.success && ok.data.budget).toBe(3_000_000);
    expect(projectContextSchema.safeParse({ budget: "1234", mode: "local", staffing: "seul" }).success).toBe(false);
    expect(projectContextSchema.safeParse({ mode: "local", staffing: "seul" }).success).toBe(false);
  });

  it("affichent la tranche de budget", () => {
    expect(budgetLabel(10_000_000)).toBe("3 à 10 millions FCFA");
    expect(budgetLabel(null)).toBeNull();
  });
});

describe("rémunération de l'entrepreneur seul", () => {
  const year = (netResult: number) => ({ netResult }) as Parameters<typeof ownerIncome>[0][number];

  it("ramène le résultat net à une moyenne mensuelle comparée au salaire minimum", () => {
    const rows = ownerIncome([year(705_672), year(2_400_000), year(-50_000)], 150_000);
    expect(rows[0]).toEqual({ year: 1, monthly: 58_806, loss: false, belowMinimum: true });
    expect(rows[1].belowMinimum).toBe(false);
    expect(rows[2]).toMatchObject({ monthly: 0, loss: true });
  });
});
