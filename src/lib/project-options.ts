/**
 * Choix proposés à l'entrepreneur : il sélectionne, il ne saisit aucun chiffre.
 * Pour le budget, on enregistre le haut de la tranche choisie.
 */
export const BUDGET_OPTIONS = [
  { value: 500_000, label: "Moins de 500 000 FCFA" },
  { value: 1_000_000, label: "500 000 à 1 million FCFA" },
  { value: 3_000_000, label: "1 à 3 millions FCFA" },
  { value: 10_000_000, label: "3 à 10 millions FCFA" },
  { value: 30_000_000, label: "10 à 30 millions FCFA" },
  { value: 100_000_000, label: "Plus de 30 millions FCFA" },
] as const;

export const MODE_OPTIONS = [
  { value: "local", label: "Dans un local (boutique, atelier, salon…)" },
  { value: "en_ligne", label: "En ligne ou à domicile, sans local" },
  { value: "mixte", label: "Les deux" },
] as const;

export const STAFFING_OPTIONS = [
  { value: "seul", label: "Seul au départ" },
  { value: "recruter", label: "Avec du personnel" },
] as const;

export type ProjectMode = (typeof MODE_OPTIONS)[number]["value"];
export type ProjectStaffing = (typeof STAFFING_OPTIONS)[number]["value"];

/** Libellé de la tranche de budget (ou montant exact si hors tranche). */
export function budgetLabel(budget: number | null) {
  if (budget == null) return null;
  return BUDGET_OPTIONS.find((o) => o.value === budget)?.label ?? `${budget} FCFA`;
}
