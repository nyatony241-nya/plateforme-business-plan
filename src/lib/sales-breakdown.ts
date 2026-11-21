import type { YearSummary } from "@/engine";

export type BreakdownPart = { key: "achats" | "charges" | "impots" | "benefice"; label: string; amount: number; share: number };

/**
 * Où vont les ventes d'une année : achats, charges (personnel, charges fixes, frais de
 * création, amortissements, intérêts), impôts et bénéfice. Les parts sont exprimées
 * sur 100 FCFA de ventes et totalisent exactement 100 (méthode du plus fort reste).
 * En cas de perte, le bénéfice vaut 0 et la perte est rendue à part.
 */
export function salesBreakdown(y: YearSummary): { parts: BreakdownPart[]; loss: number } | null {
  if (y.revenue <= 0) return null;
  const charges = y.staffCost + y.fixedCosts + y.setupCosts + y.depreciation + y.interest;
  const parts: Omit<BreakdownPart, "share">[] = [
    { key: "achats", label: "Achats", amount: y.variableCosts },
    { key: "charges", label: "Charges", amount: charges },
    { key: "impots", label: "Impôts", amount: y.incomeTax },
    { key: "benefice", label: "Bénéfice", amount: Math.max(0, y.netResult) },
  ];
  const total = parts.reduce((t, p) => t + p.amount, 0);
  const raw = parts.map((p) => (total > 0 ? (p.amount / total) * 100 : 0));
  const shares = raw.map(Math.floor);
  let rest = 100 - shares.reduce((t, x) => t + x, 0);
  const order = raw.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (rest <= 0) break;
    if (parts[i].amount > 0) {
      shares[i] += 1;
      rest -= 1;
    }
  }
  return {
    parts: parts.map((p, i) => ({ ...p, share: shares[i] })),
    loss: Math.max(0, -y.netResult),
  };
}
