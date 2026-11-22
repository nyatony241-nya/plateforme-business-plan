import { describe, expect, it } from "vitest";
import { addUsage, aiCostUsd, usageFrom, usageFromError } from "@/lib/ai/pricing";

const MODEL = "google/gemini-3.8-flash";

describe("coût réel de l'IA", () => {
  const usage = usageFrom({
    inputTokens: 2_000,
    outputTokens: 8_000,
    inputTokenDetails: { cacheReadTokens: 0 },
    outputTokenDetails: { reasoningTokens: 3_000 },
  });

  it("lit la réflexion cachée, comprise dans la sortie facturée", () => {
    expect(usage).toEqual({ inputTokens: 2_000, cachedInputTokens: 0, outputTokens: 8_000, reasoningTokens: 3_000 });
  });

  it("applique le tarif du jour : lancement en 2026, doublé en 2027", () => {
    // 2 000 × 0,75 $ + 8 000 × 3,75 $ par million.
    expect(aiCostUsd(MODEL, usage, new Date("2026-11-22T12:00:00Z"))).toBeCloseTo(0.0315, 6);
    expect(aiCostUsd(MODEL, usage, new Date("2027-01-01T00:00:00Z"))).toBeCloseTo(0.063, 6);
  });

  it("facture moins cher l'entrée relue depuis le cache", () => {
    const cached = { ...usage, cachedInputTokens: 1_000 };
    expect(aiCostUsd(MODEL, cached, new Date("2026-11-22T12:00:00Z"))).toBeCloseTo(0.030825, 6);
  });

  it("additionne les essais et garde l'usage des appels échoués", () => {
    const total = addUsage(usage, usage);
    expect(total.outputTokens).toBe(16_000);
    expect(usageFromError(Object.assign(new Error("x"), { usage: total }))).toEqual(total);
    expect(usageFromError(new Error("x")).inputTokens).toBeNull();
  });

  it("ne devine pas le coût d'un modèle sans tarif connu", () => {
    expect(aiCostUsd("autre/modele", usage)).toBeNull();
  });
});
