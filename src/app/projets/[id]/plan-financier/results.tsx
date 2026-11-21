"use client";

import { CashChart } from "@/components/cash-chart";
import { SCENARIO_LABEL, type PlanResult, type ScenarioId, type YearSummary } from "@/engine";
import { formatMonth, formatNumber, formatPercent, formatXaf } from "@/lib/format";

/** Couleurs validées (séparation daltonisme et vision normale) ; étiquetées en bout de courbe. */
export const SCENARIO_COLOR: Record<ScenarioId, string> = {
  realiste: "#2a78d6",
  prudent: "#eb6834",
  optimiste: "#1baf7a",
};

const ORDER: ScenarioId[] = ["prudent", "realiste", "optimiste"];

function Kpi({ label, value, detail, alert }: { label: string; value: string; detail?: string; alert?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${alert ? "border-danger/40 bg-danger-50" : "border-line bg-surface"}`}>
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-ink">{value}</p>
      {detail ? <p className="mt-1 text-xs text-ink-soft">{detail}</p> : null}
    </div>
  );
}

const LINES: { key: keyof YearSummary; label: string; strong?: boolean; negative?: boolean }[] = [
  { key: "revenue", label: "Chiffre d'affaires", strong: true },
  { key: "variableCosts", label: "Coûts variables", negative: true },
  { key: "grossMargin", label: "Marge brute", strong: true },
  { key: "staffCost", label: "Personnel, charges comprises", negative: true },
  { key: "fixedCosts", label: "Charges fixes", negative: true },
  { key: "setupCosts", label: "Frais de création", negative: true },
  { key: "ebitda", label: "Excédent brut d'exploitation", strong: true },
  { key: "depreciation", label: "Amortissements", negative: true },
  { key: "interest", label: "Intérêts d'emprunt", negative: true },
  { key: "resultBeforeTax", label: "Résultat avant impôt", strong: true },
  { key: "incomeTax", label: "Impôt", negative: true },
  { key: "netResult", label: "Résultat net", strong: true },
  { key: "cashEnd", label: "Trésorerie en fin d'année", strong: true },
];

export function Results({
  results,
  scenario,
  onScenario,
}: {
  results: Record<ScenarioId, PlanResult>;
  scenario: ScenarioId;
  onScenario: (s: ScenarioId) => void;
}) {
  const r = results[scenario];
  const y1 = r.years[0];
  const monthOf = (index: number) => formatMonth(r.months[index - 1].month);

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Scénario" className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-paper p-1">
        {ORDER.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={scenario === id}
            onClick={() => onScenario(id)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              scenario === id ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"
            }`}
          >
            {SCENARIO_LABEL[id]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Kpi label="Chiffre d'affaires, an 1" value={formatXaf(y1.revenue)} />
        <Kpi
          label="Résultat net, an 1"
          value={formatXaf(y1.netResult)}
          detail={y1.grossMarginRate !== null ? `Marge brute ${formatPercent(y1.grossMarginRate)}` : undefined}
        />
        <Kpi
          label="Seuil de rentabilité, an 1"
          value={y1.breakEvenRevenue !== null ? formatXaf(y1.breakEvenRevenue) : "Non calculable"}
          detail="Chiffre d'affaires qui couvre toutes les charges"
        />
        <Kpi
          label="Premier mois bénéficiaire"
          value={r.indicators.breakEvenMonth ? `Mois ${r.indicators.breakEvenMonth}` : "Non atteint"}
          detail={r.indicators.breakEvenMonth ? monthOf(r.indicators.breakEvenMonth) : "sur la période étudiée"}
        />
        <Kpi
          label="Besoin de financement"
          value={formatXaf(r.financing.totalNeed)}
          detail={`Financement prévu : ${formatXaf(r.financing.resources.total)}`}
        />
        {r.financing.shortfall > 0 ? (
          <Kpi
            alert
            label="Financement manquant"
            value={formatXaf(r.financing.shortfall)}
            detail={`Trésorerie au plus bas en ${monthOf(r.financing.lowestCashMonth)}`}
          />
        ) : (
          <Kpi label="Financement manquant" value="Aucun" detail="La trésorerie reste positive" />
        )}
        <Kpi
          label="Délai de récupération"
          value={r.indicators.paybackMonth ? `${r.indicators.paybackMonth} mois` : "Au-delà de la période"}
          detail="Mise de départ remboursée par l'activité"
        />
        <Kpi
          label="Rentabilité de l'investissement"
          value={r.indicators.returnOnInvestment !== null ? formatPercent(r.indicators.returnOnInvestment) : "—"}
          detail={`Résultat net cumulé sur ${r.years.length} ans / investissements`}
        />
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <CashChart
          title="Trésorerie mois par mois"
          months={r.months.map((m) => m.month)}
          series={ORDER.map((id) => ({
            id,
            label: SCENARIO_LABEL[id],
            color: SCENARIO_COLOR[id],
            values: results[id].months.map((m) => m.cash.end),
          }))}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[520px] text-sm tabular-nums">
          <caption className="px-4 pt-4 text-left text-sm font-bold text-ink">
            Compte de résultat prévisionnel · scénario {SCENARIO_LABEL[scenario].toLowerCase()}
          </caption>
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th scope="col" className="px-4 py-3 text-left font-semibold">En FCFA, hors taxes</th>
              {r.years.map((year) => (
                <th key={year.year} scope="col" className="px-4 py-3 text-right font-semibold">
                  An {year.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LINES.filter((line) => line.key !== "setupCosts" || r.years.some((year) => year.setupCosts > 0)).map((line) => (
              <tr key={line.key} className="border-b border-line/70 last:border-0">
                <th scope="row" className={`px-4 py-2.5 text-left ${line.strong ? "font-bold text-ink" : "font-normal text-ink-soft"}`}>
                  {line.label}
                </th>
                {r.years.map((year) => {
                  const value = year[line.key] as number;
                  return (
                    <td key={year.year} className={`whitespace-nowrap px-4 py-2.5 text-right ${line.strong ? "font-bold text-ink" : "text-ink-soft"}`}>
                      {line.negative && value !== 0 ? `−${formatNumber(value)}` : formatNumber(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        Calculs faits par le moteur financier v{r.engineVersion}, sans intelligence artificielle. Montants hors taxes ;
        impôt calculé à la clôture de chaque exercice.
      </p>
    </div>
  );
}
