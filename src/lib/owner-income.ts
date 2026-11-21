import { roundXaf, type YearSummary } from "@/engine";

export type OwnerIncomeYear = { year: number; monthly: number; belowMinimum: boolean; loss: boolean };

/**
 * Entrepreneur seul, sans salaire prévu : sa rémunération possible est le résultat net.
 * Moyenne mensuelle par exercice, comparée au salaire minimum retenu.
 */
export function ownerIncome(years: YearSummary[], minimumWage: number): OwnerIncomeYear[] {
  return years.map((y, i) => {
    const monthly = Math.max(0, roundXaf(y.netResult / 12));
    return { year: i + 1, monthly, loss: y.netResult < 0, belowMinimum: monthly < minimumWage };
  });
}
