import { describe, expect, it } from "vitest";
import { computeScenarios } from "@/engine";
import { defaultAssumptions, toPlanInput } from "@/lib/assumptions";
import { buildPlanView } from "@/lib/business-plan-view";
import { procedureDetailsSchema, recommendLegalForm } from "@/lib/creation-guide";
import { TEST_PARAMS } from "./engine/fixtures";
import { SAMPLE_DOC } from "./plan-doc-fixture";

describe("forme juridique conseillée", () => {
  it("entreprise individuelle pour un entrepreneur seul au petit budget", () => {
    expect(recommendLegalForm({ staffing: "seul", budget: 3_000_000 }).form).toBe("EI");
    expect(recommendLegalForm({ staffing: null, budget: null }).form).toBe("EI");
  });

  it("société dès qu'il y a du personnel ou un gros budget", () => {
    expect(recommendLegalForm({ staffing: "recruter", budget: 1_000_000 }).form).toBe("SOCIETE");
    expect(recommendLegalForm({ staffing: "seul", budget: 30_000_000 }).form).toBe("SOCIETE");
  });
});

describe("détails d'une démarche", () => {
  it("lit le format enregistré en base (frais, délai, sources)", () => {
    const parsed = procedureDetailsSchema.parse({
      pieces: ["Copie de la pièce d'identité"],
      frais: [
        {
          libelle: "Création",
          gabonais: 85000,
          non_gabonais: 135000,
          statut: "estimation",
          note: "Charte approximative.",
          source_id: "0bf9c430-c866-4f50-83e9-2f79f618896e",
        },
      ],
      delai: { texte: "48 à 72 heures", statut: "estimation", source_id: "b4021ef3-aa2c-48b3-b587-9867f160589c" },
    });
    expect(parsed.frais[0].gabonais).toBe(85000);
    expect(parsed.avantages).toEqual([]);
  });

  it("refuse un statut inconnu", () => {
    expect(
      procedureDetailsSchema.safeParse({ frais: [{ libelle: "x", gabonais: 1, non_gabonais: 1, statut: "certain" }] })
        .success,
    ).toBe(false);
  });
});

describe("démarches dans le business plan", () => {
  const a = { ...defaultAssumptions(new Date("2026-11-21T12:00:00Z")) };
  const base = {
    doc: SAMPLE_DOC,
    a,
    results: computeScenarios(toPlanInput(a, TEST_PARAMS)),
    project: { name: "x", sector: null, district: null, city: null, country: "Gabon" },
    minimumWage: 150_000,
  };

  it("affiche la forme conseillée, les frais et le guichet officiels", () => {
    const v = buildPlanView({
      ...base,
      creation: {
        form: "Entreprise individuelle",
        fee: 85000,
        delay: "48 à 72 heures ouvrables",
        website: "https://www.gni-anpigabon.com",
        phone: "+241 66 11 25 60",
      },
    });
    expect(v.creationLines[0]).toContain("Entreprise individuelle");
    expect(v.creationLines.join(" ")).toContain("www.gni-anpigabon.com · +241 66 11 25 60");
  });

  it("n'affiche rien sans données officielles", () => {
    expect(buildPlanView(base).creationLines).toEqual([]);
  });
});
