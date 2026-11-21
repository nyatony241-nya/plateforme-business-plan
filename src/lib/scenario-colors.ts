import type { ScenarioId } from "@/engine";

/** Couleurs validées (séparation daltonisme et vision normale) ; étiquetées en bout de courbe. */
export const SCENARIO_COLOR: Record<ScenarioId, string> = {
  realiste: "#2a78d6",
  prudent: "#eb6834",
  optimiste: "#1baf7a",
};

export const SCENARIO_ORDER: ScenarioId[] = ["prudent", "realiste", "optimiste"];
