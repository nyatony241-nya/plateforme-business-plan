import { describe, expect, it } from "vitest";
import { SECTIONS } from "@/lib/business-plan-view";
import { PAWAPAY_COUNTRIES, depositOutcome, isPawapayCountry } from "@/lib/payments/pawapay-utils";
import { LOCKED_CONTENTS, PREVIEW_SECTIONS, previewDocument } from "@/lib/plan-preview";
import { SAMPLE_DOC } from "./plan-doc-fixture";

describe("aperçu gratuit", () => {
  it("ne garde que le résumé et le projet : le reste n'est jamais envoyé", () => {
    const p = previewDocument(SAMPLE_DOC);
    expect(p.resume).toBe(SAMPLE_DOC.resume);
    expect(p.projet).toBe(SAMPLE_DOC.projet);
    const hidden = JSON.stringify({ ...p, resume: "", projet: "" });
    for (const secret of [SAMPLE_DOC.marche.clientele, SAMPLE_DOC.conclusion, SAMPLE_DOC.risques[0].parade]) {
      expect(hidden).not.toContain(secret);
    }
    expect(p.marketing.calendrier).toHaveLength(0);
    expect(p.demarches).toHaveLength(0);
    expect(Object.keys(p.photos ?? {}).every((k) => k === "couverture" || k === "projet")).toBe(true);
  });

  it("annonce le contenu de chaque partie verrouillée", () => {
    for (let n = PREVIEW_SECTIONS + 1; n <= SECTIONS.length; n++) {
      expect(LOCKED_CONTENTS[n]?.length).toBeGreaterThan(0);
    }
  });
});

describe("paiement pawaPay", () => {
  it("ne crédite qu'un dépôt terminé, au bon montant et en francs CFA", () => {
    expect(depositOutcome({ status: "COMPLETED", amount: "4900", currency: "XAF" }, 4900)).toBe("paid");
    expect(depositOutcome({ status: "COMPLETED", amount: "4900.00", currency: "XOF" }, 4900)).toBe("paid");
    expect(depositOutcome({ status: "COMPLETED", amount: "100", currency: "XAF" }, 4900)).toBe("failed");
    expect(depositOutcome({ status: "COMPLETED", amount: "4900", currency: "USD" }, 4900)).toBe("failed");
    expect(depositOutcome({ status: "FAILED", amount: "4900", currency: "XAF" }, 4900)).toBe("failed");
    expect(depositOutcome({ status: "ACCEPTED", amount: "4900", currency: "XAF" }, 4900)).toBe("pending");
    expect(depositOutcome({ status: "PROCESSING" }, 4900)).toBe("pending");
    expect(depositOutcome(null, 4900)).toBe("pending");
  });

  it("couvre le Gabon et paie chaque pays dans sa devise", () => {
    expect(isPawapayCountry("GA")).toBe(true);
    expect(PAWAPAY_COUNTRIES.GA).toMatchObject({ iso3: "GAB", currency: "XAF" });
    expect(PAWAPAY_COUNTRIES.CI).toMatchObject({ iso3: "CIV", currency: "XOF" });
    expect(isPawapayCountry("TG")).toBe(false);
    expect(isPawapayCountry("toString")).toBe(false);
    expect(isPawapayCountry(undefined)).toBe(false);
  });
});

describe("aperçu rédigé à moitié", () => {
  it("accepte un document dont seules les premières pages sont rédigées", async () => {
    const { planDocumentSchema, isCompleteDocument } = await import("@/lib/business-plan");
    const doc = planDocumentSchema.parse({
      ...previewDocument(SAMPLE_DOC),
      stage: "apercu",
    });
    expect(isCompleteDocument(doc)).toBe(false);
    expect(isCompleteDocument(SAMPLE_DOC)).toBe(true);
  });

  it("nettoie la suite rédigée après paiement", async () => {
    const { restFields } = await import("@/lib/ai/generate-plan-document");
    const rest = restFields({
      marche: { clientele: "a", concurrence: "b", tendances: "c" },
      emplacement: { analyse: "d", criteres: [{ critere: "Passage", note: 9, commentaire: "x" }] },
      marketing: { message: "m", canaux: [{ canal: SAMPLE_DOC.marketing.canaux[0].canal, action: "y", part: 33.6 }], calendrier: [] },
      risques: [{ risque: "r", parade: "p" }],
      demarches: ["s"],
      conclusion: "fin",
    });
    expect(rest.emplacement.criteres[0].note).toBe(5);
    expect(rest.marketing.canaux[0].part).toBe(34);
  });
});
