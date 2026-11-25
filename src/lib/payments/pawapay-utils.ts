/**
 * Règles pawaPay sans appel réseau : pays couverts, montants, statuts.
 * Les montants FCFA (XAF et XOF) sont à parité : 4 900 FCFA valent la même chose dans les deux zones.
 */

/** Pays où pawaPay encaisse le mobile money (code ISO 2 → code ISO 3, devise, opérateurs). */
export const PAWAPAY_COUNTRIES = {
  GA: { iso3: "GAB", currency: "XAF", name: "Gabon", operators: "Airtel Money, Moov Money" },
  CM: { iso3: "CMR", currency: "XAF", name: "Cameroun", operators: "MTN, Orange" },
  CG: { iso3: "COG", currency: "XAF", name: "Congo", operators: "Airtel, MTN" },
  CI: { iso3: "CIV", currency: "XOF", name: "Côte d'Ivoire", operators: "MTN, Orange, Moov, Wave" },
  SN: { iso3: "SEN", currency: "XOF", name: "Sénégal", operators: "Orange, Free, Wave" },
  BJ: { iso3: "BEN", currency: "XOF", name: "Bénin", operators: "MTN, Moov" },
  BF: { iso3: "BFA", currency: "XOF", name: "Burkina Faso", operators: "Orange, Moov" },
} as const;

export type PawapayCountry = keyof typeof PAWAPAY_COUNTRIES;

export const isPawapayCountry = (code: unknown): code is PawapayCountry =>
  typeof code === "string" && Object.hasOwn(PAWAPAY_COUNTRIES, code);

export type DepositOutcome = "paid" | "failed" | "pending";

/**
 * Lecture d'un dépôt relu chez pawaPay : payé seulement si le statut est COMPLETED
 * ET que le montant et la devise sont ceux attendus.
 */
export function depositOutcome(
  deposit: { status?: unknown; amount?: unknown; currency?: unknown } | null,
  expectedAmount: number,
): DepositOutcome {
  if (!deposit) return "pending";
  if (deposit.status === "FAILED") return "failed";
  if (deposit.status !== "COMPLETED") return "pending";
  const amount = typeof deposit.amount === "string" ? Number(deposit.amount) : NaN;
  const currencyOk = deposit.currency === "XAF" || deposit.currency === "XOF";
  return currencyOk && amount === expectedAmount ? "paid" : "failed";
}
