import type { ScenarioFactors, ScenarioId } from "./types";

/** Version du moteur, enregistrée avec chaque calcul et chaque export. */
export const ENGINE_VERSION = "1.1.0";

/**
 * Coefficients par défaut des scénarios, appliqués au scénario réaliste.
 * Ce sont des hypothèses de travail, modifiables par l'utilisateur.
 */
export const DEFAULT_SCENARIOS: Record<ScenarioId, ScenarioFactors> = {
  prudent: { volume: 0.8, price: 1, unitCost: 1.05, fixedCosts: 1.05 },
  realiste: { volume: 1, price: 1, unitCost: 1, fixedCosts: 1 },
  optimiste: { volume: 1.15, price: 1, unitCost: 0.98, fixedCosts: 1 },
};

export const SCENARIO_LABEL: Record<ScenarioId, string> = {
  prudent: "Prudent",
  realiste: "Réaliste",
  optimiste: "Optimiste",
};

/** Ces postes ne s'amortissent pas : ils sont soit récupérables, soit consommés. */
export const NON_DEPRECIABLE = new Set(["caution", "stock_initial", "frais_creation"]);
