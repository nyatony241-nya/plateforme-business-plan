import { describe, expect, it } from "vitest";
import { computeScenarios } from "@/engine";
import { buildPrompt, normalizeAiOutput } from "@/lib/ai/generate-assumptions";
import { defaultAssumptions, toPlanInput } from "@/lib/assumptions";
import { checkPlanCoherence } from "@/lib/coherence";
import { pickReferences, referenceText, type LocalReference } from "@/lib/local-references";
import { TEST_PARAMS } from "./engine/fixtures";

const ref = (r: Partial<LocalReference>): LocalReference => ({
  indicator: "loyer_local_commercial_mois",
  value: 300_000,
  min: 200_000,
  max: 500_000,
  unit: "FCFA par mois",
  city: "Libreville",
  method: "Relevé d'annonces.",
  source: { title: "Annonces", publisher: "gabonhome.com", url: "https://gabonhome.com/bien.php?bien=8" },
  checkedAt: "2026-11-21",
  ...r,
});

const ROWS = [
  ref({}),
  ref({ city: "Akanda", value: 200_000, min: 100_000, max: 450_000 }),
  ref({ indicator: "salaire_poste_peu_qualifie_mois", value: 100_000, min: 70_000, max: 300_000 }),
  ref({ indicator: "electricite_prix_kwh", value: 125, min: 100, max: 145, unit: "FCFA par kWh", city: null }),
  ref({ indicator: "loyer_local_commercial_mois", city: "Franceville", value: 50_000 }),
];

const meta = { model: "test", generatedAt: "2026-11-21T10:00:00.000Z", startMonth: "2026-12" };
const aiOutput = (rent: number) => ({
  summary: "Salon de coiffure à Akanda.",
  investments: [],
  offers: [
    {
      label: "Tresses",
      type: "service" as const,
      unitPrice: 10_000,
      unitCost: 2_000,
      monthlyVolume: 80,
      rampUpMonths: 4,
      annualVolumeGrowth: 0.1,
      rationale: "Prix courant.",
    },
  ],
  staff: [],
  fixedCosts: [
    { label: "Loyer du salon", monthly: rent, rationale: "Petit local." },
    { label: "Électricité", monthly: 40_000, rationale: "Séchoirs." },
  ],
  financing: { equity: 2_000_000, grants: 0, loans: [], rationale: "Apport." },
  customerDays: 0,
  supplierDays: 0,
  warnings: [],
});

describe("repères locaux", () => {
  it("prennent le relevé de la commune, sinon Libreville, sinon le pays", () => {
    const akanda = pickReferences(ROWS, "Akanda");
    expect(akanda.map((r) => [r.indicator, r.city])).toEqual([
      ["loyer_local_commercial_mois", "Akanda"],
      ["salaire_poste_peu_qualifie_mois", "Libreville"],
      ["electricite_prix_kwh", null],
    ]);
    const owendo = pickReferences(ROWS, "Owendo");
    expect(owendo[0].city).toBe("Libreville");
    expect(referenceText(owendo[0], "Owendo")).toContain("pas encore de relevé à Owendo");
  });

  it("sont transmis à l'IA avec la consigne de s'y tenir", () => {
    const refs = pickReferences(ROWS, "Akanda");
    const prompt = buildPrompt(
      {
        name: "Salon",
        countryName: "Gabon",
        city: "Akanda",
        district: null,
        sector: "coiffure",
        idea: null,
        budget: 3_000_000,
        mode: "local",
        staffing: "seul",
      },
      TEST_PARAMS,
      refs,
      150_000,
    );
    expect(prompt).toContain("Loyer d'un local commercial à Akanda");
    expect(prompt).toContain("minimum légal de 150000 FCFA");
    const bare = { name: "x", countryName: "Gabon", city: null, district: null, sector: null, idea: null, budget: null, mode: null, staffing: null };
    expect(buildPrompt(bare, TEST_PARAMS)).toContain("aucun pour l'instant");
  });

  it("remontent un loyer de local trop bas et sont recopiés dans le plan", () => {
    const refs = pickReferences(ROWS, "Akanda");
    const a = normalizeAiOutput(aiOutput(40_000), { budget: 3_000_000, mode: "local", city: "Akanda" }, 150_000, meta, refs);
    expect(a.fixedCosts[0].monthly).toBe(100_000);
    expect(a.fixedCosts[1].monthly).toBe(40_000);
    expect(a.generation?.warnings[0]).toContain("Loyer relevé au bas des annonces");
    expect(a.generation?.references?.[0].text).toContain("Akanda");
    expect(a.generation?.references?.[0].source).toContain("gabonhome.com");

    const fine = normalizeAiOutput(aiOutput(250_000), { budget: 3_000_000, mode: "local", city: "Akanda" }, 150_000, meta, refs);
    expect(fine.fixedCosts[0].monthly).toBe(250_000);

    const online = normalizeAiOutput(aiOutput(40_000), { budget: 3_000_000, mode: "en_ligne", city: "Akanda" }, 150_000, meta, refs);
    expect(online.fixedCosts[0].monthly).toBe(40_000);
  });
});

describe("contrôle du loyer", () => {
  it("signale une activité en local sans loyer", () => {
    const a = {
      ...defaultAssumptions(new Date("2026-11-21T12:00:00Z")),
      offers: [
        { id: "o", label: "Coupe", nature: "service" as const, unitPrice: 5_000, unitCost: 500, monthlyVolume: 100, rampUpMonths: 3, annualVolumeGrowth: 0 },
      ],
      fixedCosts: [{ id: "c", label: "Électricité", monthly: 30_000 }],
      financing: { equity: 2_000_000, grants: 0, loans: [] },
    };
    const results = computeScenarios(toPlanInput(a, TEST_PARAMS));
    expect(checkPlanCoherence(a, results, 2_000_000, { mode: "local" }).join(" ")).toContain("aucun loyer");
    expect(checkPlanCoherence(a, results, 2_000_000, { mode: "en_ligne" }).join(" ")).not.toContain("aucun loyer");
  });
});

describe("frais de création et repères utiles", () => {
  const refs = pickReferences(ROWS, "Akanda");
  const withFee = {
    ...aiOutput(250_000),
    investments: [
      { kind: "frais_creation", label: "Frais d'immatriculation", amount: 50_000, lifeYears: 0, rationale: "Estimation." },
      { kind: "materiel", label: "Fauteuils", amount: 300_000, lifeYears: 5, rationale: "Deux fauteuils." },
    ],
  };

  it("remplace l'estimation de l'IA par le tarif officiel de l'ANPI", () => {
    const a = normalizeAiOutput(withFee, { budget: 3_000_000, mode: "local", city: "Akanda" }, 150_000, meta, refs, {
      creationFee: 85_000,
    });
    const fee = a.investments.filter((i) => i.kind === "frais_creation");
    expect(fee).toHaveLength(1);
    expect(fee[0]).toMatchObject({ amount: 85_000, label: "Frais de création à l'ANPI (tarif officiel)" });
  });

  it("ajoute les frais officiels si l'IA les a oubliés", () => {
    const a = normalizeAiOutput(aiOutput(250_000), { budget: 3_000_000, mode: "local" }, 150_000, meta, [], {
      creationFee: 85_000,
    });
    expect(a.investments[0]).toMatchObject({ kind: "frais_creation", amount: 85_000 });
  });

  it("ne cite que les repères qui concernent le plan", () => {
    const local = normalizeAiOutput(aiOutput(250_000), { budget: 3_000_000, mode: "local", city: "Akanda" }, 150_000, meta, refs);
    const texts = local.generation?.references?.map((r) => r.text).join(" | ") ?? "";
    expect(texts).toContain("Loyer");
    expect(texts).toContain("électricité");
    // Pas de salarié : le repère des salaires n'est pas cité.
    expect(texts).not.toContain("Salaire");

    const online = normalizeAiOutput(
      { ...aiOutput(0), fixedCosts: [{ label: "Forfait internet", monthly: 25_000, rationale: "Box." }] },
      { budget: 500_000, mode: "en_ligne", city: "Akanda" },
      150_000,
      meta,
      refs,
    );
    expect(online.generation?.references ?? []).toHaveLength(0);
  });
});
