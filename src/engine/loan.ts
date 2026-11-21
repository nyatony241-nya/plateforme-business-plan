import { roundXaf } from "./money";
import type { Loan } from "./types";

export interface LoanMonth {
  /** Mois du plan (1 = premier mois d'activité). */
  index: number;
  interest: number;
  principal: number;
  payment: number;
  remaining: number;
}

/**
 * Tableau d'amortissement à mensualités constantes, avec différé partiel
 * (intérêts seuls pendant le différé). La dernière échéance absorbe l'écart
 * d'arrondi pour que le capital remboursé égale exactement le capital emprunté.
 */
export function loanSchedule(loan: Loan): LoanMonth[] {
  const start = loan.startMonth ?? 1;
  const deferral = loan.deferralMonths ?? 0;
  const amortizing = loan.months - deferral;
  if (loan.principal <= 0 || loan.months <= 0) return [];
  if (amortizing <= 0) throw new RangeError(`Emprunt « ${loan.label} » : le différé dépasse la durée.`);

  const rate = loan.annualRate / 12;
  const annuity =
    rate === 0
      ? loan.principal / amortizing
      : (loan.principal * rate) / (1 - Math.pow(1 + rate, -amortizing));

  const rows: LoanMonth[] = [];
  let remaining = loan.principal;

  for (let k = 1; k <= loan.months; k++) {
    const interest = roundXaf(remaining * rate);
    let principal: number;
    if (k <= deferral) {
      principal = 0;
    } else if (k === loan.months) {
      principal = remaining;
    } else {
      principal = roundXaf(annuity) - interest;
      principal = Math.min(Math.max(principal, 0), remaining);
    }
    remaining -= principal;
    rows.push({ index: start + k - 1, interest, principal, payment: interest + principal, remaining });
  }
  return rows;
}
