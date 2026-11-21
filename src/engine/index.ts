/**
 * Moteur financier déterministe : aucune IA, aucun accès réseau.
 * Mêmes hypothèses en entrée → mêmes chiffres en sortie, dans le navigateur comme sur le serveur.
 */
export { computePlan, computeScenarios, validatePlanInput, EngineInputError } from "./compute";
export { loanSchedule } from "./loan";
export { DEFAULT_SCENARIOS, ENGINE_VERSION, SCENARIO_LABEL } from "./defaults";
export { roundXaf } from "./money";
export type * from "./types";
