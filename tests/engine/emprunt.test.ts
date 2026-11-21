import { describe, expect, it } from "vitest";
import { computePlan, loanSchedule } from "@/engine";
import { caseA } from "./fixtures";

describe("tableau d'emprunt", () => {
  const loan = { label: "Banque", principal: 1_200_000, annualRate: 0.12, months: 12 };

  it("calcule une mensualité constante", () => {
    const rows = loanSchedule(loan);
    expect(rows).toHaveLength(12);
    expect(rows[0].interest).toBe(12_000); // 1 % de 1 200 000
    expect(rows[0].payment).toBe(106_619); // 1 200 000 × 0,01 / (1 − 1,01^−12), arrondi
    for (const row of rows.slice(0, 11)) expect(row.payment).toBe(106_619);
  });

  it("rembourse exactement le capital emprunté", () => {
    const rows = loanSchedule(loan);
    expect(rows.reduce((t, r) => t + r.principal, 0)).toBe(1_200_000);
    expect(rows.at(-1)!.remaining).toBe(0);
  });

  it("ne rembourse que les intérêts pendant le différé", () => {
    const rows = loanSchedule({ ...loan, months: 15, deferralMonths: 3 });
    expect(rows.slice(0, 3).map((r) => [r.principal, r.interest])).toEqual([
      [0, 12_000],
      [0, 12_000],
      [0, 12_000],
    ]);
    expect(rows[3].payment).toBe(106_619);
    expect(rows.reduce((t, r) => t + r.principal, 0)).toBe(1_200_000);
  });

  it("gère un prêt à taux zéro", () => {
    const rows = loanSchedule({ ...loan, annualRate: 0 });
    expect(rows.every((r) => r.interest === 0 && r.principal === 100_000)).toBe(true);
  });

  it("refuse un différé plus long que le prêt", () => {
    expect(() => loanSchedule({ ...loan, deferralMonths: 12 })).toThrow(/différé/);
  });

  it("s'intègre au plan : encaissement, intérêts en charge, capital en trésorerie", () => {
    const plan = computePlan(caseA({ financing: { equity: 800_000, loans: [loan], grants: 0 } }));
    const m1 = plan.months[0];
    expect(m1.interest).toBe(12_000);
    expect(m1.resultBeforeTax).toBe(28_000);
    expect(m1.cash.financingIn).toBe(2_000_000);
    expect(m1.cash.loanRepayment).toBe(94_619);
    expect(plan.financing.resources.loans).toBe(1_200_000);
  });
});
