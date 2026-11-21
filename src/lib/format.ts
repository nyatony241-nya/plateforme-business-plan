/** Formats français, communs au navigateur et au serveur. */

const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function formatNumber(value: number) {
  return integer.format(value);
}

export function formatXaf(value: number) {
  return `${integer.format(value)} FCFA`;
}

/** Montant court pour un axe : 1,2 M · 850 k · 3,4 Md. */
export function formatCompactXaf(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  const fmt = (n: number, unit: string) =>
    `${sign}${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: n >= 10 ? 0 : 1 }).format(n)} ${unit}`;
  if (abs >= 1e9) return fmt(abs / 1e9, "Md");
  if (abs >= 1e6) return fmt(abs / 1e6, "M");
  if (abs >= 1e3) return fmt(abs / 1e3, "k");
  return `${sign}${integer.format(abs)}`;
}

export function formatPercent(ratio: number, digits = 1) {
  return new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: digits }).format(ratio);
}

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** « 2027-01 » → « janv. 2027 ». */
export function formatMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} ${year}`;
}

/** Lit un montant saisi librement : « 1 200 000 », « 1.200.000 » → 1200000. */
export function parseInteger(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "");
  return digits === "" ? 0 : Number(digits);
}

/** Lit un pourcentage saisi : « 12,5 » → 0,125. */
export function parsePercent(raw: string): number {
  const normalized = raw.replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? value / 100 : 0;
}
