/**
 * Coût réel des appels à l'IA. Le prix de sortie inclut la « réflexion » du modèle
 * (thinking tokens), que le fournisseur compte déjà dans les jetons de sortie.
 */

/** Jetons d'un appel, tels que le fournisseur les facture. */
export type AiUsage = {
  inputTokens: number | null;
  /** Dont jetons d'entrée relus depuis le cache (facturés moins cher). */
  cachedInputTokens: number | null;
  /** Total de sortie, réflexion comprise. */
  outputTokens: number | null;
  /** Dont réflexion cachée du modèle. */
  reasoningTokens: number | null;
};

export const EMPTY_USAGE: AiUsage = { inputTokens: null, cachedInputTokens: null, outputTokens: null, reasoningTokens: null };

type SdkUsage = {
  inputTokens?: number;
  outputTokens?: number;
  inputTokenDetails?: { cacheReadTokens?: number };
  outputTokenDetails?: { reasoningTokens?: number };
};

/** Lit l'usage renvoyé par le SDK d'IA. */
export function usageFrom(usage: SdkUsage | undefined | null): AiUsage {
  if (!usage) return EMPTY_USAGE;
  return {
    inputTokens: usage.inputTokens ?? null,
    cachedInputTokens: usage.inputTokenDetails?.cacheReadTokens ?? null,
    outputTokens: usage.outputTokens ?? null,
    reasoningTokens: usage.outputTokenDetails?.reasoningTokens ?? null,
  };
}

/** Jetons consommés par un appel qui a échoué (le SDK les joint souvent à l'erreur). */
export function usageFromError(error: unknown): AiUsage {
  const usage = (error as { usage?: SdkUsage | AiUsage } | null)?.usage;
  if (!usage || typeof usage !== "object") return EMPTY_USAGE;
  // Usage déjà cumulé par nos soins (plusieurs essais) ou usage brut du SDK.
  return "reasoningTokens" in usage ? (usage as AiUsage) : usageFrom(usage as SdkUsage);
}

/** Additionne deux usages (plusieurs essais pour une même génération). */
export function addUsage(a: AiUsage, b: AiUsage): AiUsage {
  const sum = (x: number | null, y: number | null) => (x === null && y === null ? null : (x ?? 0) + (y ?? 0));
  return {
    inputTokens: sum(a.inputTokens, b.inputTokens),
    cachedInputTokens: sum(a.cachedInputTokens, b.cachedInputTokens),
    outputTokens: sum(a.outputTokens, b.outputTokens),
    reasoningTokens: sum(a.reasoningTokens, b.reasoningTokens),
  };
}

/** Tarifs en dollars par million de jetons, avec leur date d'effet (tarif payant standard). */
const RATES: Record<string, { from: string; input: number; cachedInput: number; output: number }[]> = {
  // Google : tarif de lancement jusqu'au 31/12/2026, doublé à partir du 01/01/2027.
  "google/gemini-3.8-flash": [
    { from: "2026-09-02", input: 0.75, cachedInput: 0.075, output: 3.75 },
    { from: "2027-01-01", input: 1.5, cachedInput: 0.15, output: 7.5 },
  ],
};

/** Coût d'un appel en dollars, au tarif en vigueur à la date donnée ; null si le modèle n'a pas de tarif connu. */
export function aiCostUsd(model: string, usage: AiUsage, at: Date = new Date()): number | null {
  const rates = RATES[model];
  if (!rates || usage.inputTokens === null || usage.outputTokens === null) return null;
  const day = at.toISOString().slice(0, 10);
  const rate = [...rates].reverse().find((r) => r.from <= day) ?? rates[0];
  const cached = Math.min(usage.cachedInputTokens ?? 0, usage.inputTokens);
  const cost =
    ((usage.inputTokens - cached) * rate.input + cached * rate.cachedInput + usage.outputTokens * rate.output) / 1e6;
  return Math.round(cost * 1e6) / 1e6;
}
