import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SECTIONS } from "@/lib/business-plan-view";
import { isPaidStatus, normalizeGabonPhone, verifyChariowSignature } from "@/lib/payments/chariow-utils";
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

describe("paiement Chariow", () => {
  const secret = "whsec_test";
  const body = '{"event":"successful.sale","sale":{"id":"sal_1"}}';
  const sign = (b: string) => `sha256=${createHmac("sha256", secret).update(b).digest("hex")}`;

  it("accepte un Pulse correctement signé et refuse le reste", () => {
    expect(verifyChariowSignature(body, sign(body), secret)).toBe(true);
    expect(verifyChariowSignature(body.replace("sal_1", "sal_2"), sign(body), secret)).toBe(false);
    expect(verifyChariowSignature(body, null, secret)).toBe(false);
    expect(verifyChariowSignature(body, sign(body), undefined)).toBe(false);
    expect(verifyChariowSignature(body, "sha256=zz", secret)).toBe(false);
  });

  it("normalise les numéros Mobile Money du Gabon", () => {
    expect(normalizeGabonPhone("077 12 34 56")).toBe("077123456");
    expect(normalizeGabonPhone("+241 77 12 34 56")).toBe("77123456");
    expect(normalizeGabonPhone("00241 066 11 25 60")).toBe("066112560");
    expect(normalizeGabonPhone("12")).toBeNull();
  });

  it("ne considère payées que les ventes terminées", () => {
    expect(isPaidStatus("completed")).toBe(true);
    expect(isPaidStatus("awaiting_payment")).toBe(false);
    expect(isPaidStatus(null)).toBe(false);
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
