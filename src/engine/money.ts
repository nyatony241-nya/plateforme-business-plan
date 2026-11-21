/**
 * Arrondi au franc CFA le plus proche (0,5 → vers le haut en valeur absolue).
 * Chaque ligne mensuelle est arrondie une seule fois ; les totaux sont des sommes
 * de lignes arrondies, ce qui garantit des tableaux qui tombent juste.
 */
export function roundXaf(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError(`Montant invalide : ${value}`);
  const rounded = Math.sign(value) * Math.round(Math.abs(value));
  return rounded === 0 ? 0 : rounded;
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Ajoute n mois à une date AAAA-MM. */
export function addMonths(start: string, offset: number): string {
  const [y, m] = start.split("-").map(Number);
  const total = y * 12 + (m - 1) + offset;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Numéro du mois calendaire (1 = janvier) d'une date AAAA-MM. */
export function calendarMonth(month: string): number {
  return Number(month.split("-")[1]);
}
