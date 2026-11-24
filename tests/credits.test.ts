import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SECTIONS } from "@/lib/business-plan-view";
import { SASPAY_COUNTRIES, isSaspayCountry, sessionOutcome, unwrap, verifySaspaySignature } from "@/lib/payments/saspay-utils";
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

describe("paiement SasPay", () => {
  const paymentId = "6f1e2b3a-8c4d-4a2f-9e1b-2d3c4f5a6b7c";
  const expected = { amount: 4900, paymentId };
  const paid = { status: "PAID", transaction_status: "SUCCESS" };
  const detail = { amount: "4900.00", currency: "XAF", metadata: { payment_id: paymentId } };

  it("ne crédite qu'une session payée, au bon montant, en FCFA et pour ce paiement", () => {
    expect(sessionOutcome(paid, detail, expected)).toBe("paid");
    expect(sessionOutcome(paid, { ...detail, currency: "XOF" }, expected)).toBe("paid");
    expect(sessionOutcome(paid, { ...detail, amount: "100.00" }, expected)).toBe("failed");
    expect(sessionOutcome(paid, { ...detail, currency: "USD" }, expected)).toBe("failed");
    expect(sessionOutcome(paid, { ...detail, metadata: { payment_id: "autre" } }, expected)).toBe("failed");
    expect(sessionOutcome({ status: "PENDING", transaction_status: "FAILED" }, null, expected)).toBe("pending");
    expect(sessionOutcome({ status: "EXPIRED" }, null, expected)).toBe("failed");
    expect(sessionOutcome(paid, null, expected)).toBe("pending");
    expect(sessionOutcome(null, null, expected)).toBe("pending");
  });

  it("accepte un webhook correctement signé et récent, refuse le reste", () => {
    const secret = "whsec_test";
    const body = '{"event":"transaction.success","data":{"id":"7c1a"}}';
    const now = 1_795_000_000_000;
    const ts = String(now / 1000);
    const sign = (t: string, b: string) => createHmac("sha256", secret).update(`${t}.${b}`).digest("hex");
    expect(verifySaspaySignature(body, sign(ts, body), ts, secret, now)).toBe(true);
    expect(verifySaspaySignature(body.replace("7c1a", "9999"), sign(ts, body), ts, secret, now)).toBe(false);
    expect(verifySaspaySignature(body, sign(ts, body), ts, secret, now + 600_000)).toBe(false);
    expect(verifySaspaySignature(body, null, ts, secret, now)).toBe(false);
    expect(verifySaspaySignature(body, sign(ts, body), ts, undefined, now)).toBe(false);
    expect(verifySaspaySignature(body, "zz", ts, secret, now)).toBe(false);
  });

  it("lit les réponses enveloppées ou non, et refuse les erreurs", () => {
    expect(unwrap({ success: true, data: { id: "a" }, code: 200 })).toEqual({ id: "a" });
    expect(unwrap({ id: "a" })).toEqual({ id: "a" });
    expect(unwrap({ success: false, error: { message: "x" } })).toBeNull();
    expect(unwrap(null)).toBeNull();
  });

  it("couvre le Gabon et paie chaque pays dans sa devise", () => {
    expect(SASPAY_COUNTRIES.GA.currency).toBe("XAF");
    expect(SASPAY_COUNTRIES.CI.currency).toBe("XOF");
    expect(isSaspayCountry("GA")).toBe(true);
    expect(isSaspayCountry("toString")).toBe(false);
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
