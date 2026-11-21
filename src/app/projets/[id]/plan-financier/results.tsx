"use client";

import { CashChart } from "@/components/cash-chart";
import {
  SCENARIO_LABEL,
  type PlanResult,
  type ScenarioId,
  type YearSummary,
} from "@/engine";
import {
  formatMonth,
  formatNumber,
  formatPercent,
  formatXaf,
} from "@/lib/format";
import { ownerIncome } from "@/lib/owner-income";
import { salesBreakdown, type BreakdownPart } from "@/lib/sales-breakdown";
import { SCENARIO_COLOR, SCENARIO_ORDER } from "@/lib/scenario-colors";

const ORDER = SCENARIO_ORDER;

function Kpi({
  label,
  value,
  detail,
  alert,
}: {
  label: string;
  value: string;
  detail?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${alert ? "border-danger/40 bg-danger-50" : "border-line bg-surface"}`}
    >
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-ink">{value}</p>
      {detail ? <p className="mt-1 text-xs text-ink-soft">{detail}</p> : null}
    </div>
  );
}

const LINES: {
  key: keyof YearSummary;
  label: string;
  strong?: boolean;
  negative?: boolean;
}[] = [
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

const BREAKDOWN_COLOR: Record<BreakdownPart["key"], string> = {
  achats: "#a8771f",
  charges: "#5f6f82",
  impots: "#aab3bf",
  benefice: "#0f4d3a",
};

/** Où vont les ventes de la 1re année : une barre sur 100 FCFA, chaque part nommée. */
function SalesBreakdown({ r }: { r: PlanResult }) {
  const b = salesBreakdown(r.years[0]);
  if (!b) return null;
  const visible = b.parts.filter((p) => p.share > 0);
  return (
    <section aria-labelledby="repartition" className="rounded-xl border border-line bg-surface p-4">
      <h3 id="repartition" className="text-sm font-semibold text-ink">
        🧮 Sur 100 FCFA de ventes la 1re année
      </h3>
      <div className="mt-3 flex h-4 w-full gap-[2px]" aria-hidden>
        {visible.map((p) => (
          <div
            key={p.key}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${p.share}%`, backgroundColor: BREAKDOWN_COLOR[p.key] }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
        {b.parts.map((p) => (
          <li key={p.key} className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: BREAKDOWN_COLOR[p.key] }} />
            {p.label} <strong className="tabular-nums text-ink">{p.share}</strong>
          </li>
        ))}
      </ul>
      {b.loss > 0 ? (
        <p className="mt-2 text-sm font-semibold text-danger">Perte de la 1re année : {formatXaf(b.loss)}.</p>
      ) : null}
    </section>
  );
}

/** Une seule phrase : ce que l'entrepreneur seul pourra se verser la première année. */
function OwnerIncome({ r, minimumWage }: { r: PlanResult; minimumWage: number }) {
  const first = ownerIncome(r.years, minimumWage)[0];
  const alert = first.loss || first.belowMinimum;
  return (
    <p
      className={`rounded-xl border px-4 py-3 text-sm ${alert ? "border-danger/40 bg-danger-50 text-danger" : "border-forest/30 bg-forest-50 text-forest"}`}
    >
      <strong>Votre paie :</strong>{" "}
      {first.loss
        ? "la première année est en perte, vous ne pourrez pas vous verser de salaire."
        : `environ ${formatXaf(Math.round(first.monthly / 1000) * 1000)} par mois la première année${
            first.belowMinimum ? `, moins que le salaire minimum (${formatXaf(minimumWage)}).` : "."
          }`}
    </p>
  );
}

export function Results({
  results,
  scenario,
  onScenario,
  owner,
}: {
  results: Record<ScenarioId, PlanResult>;
  scenario: ScenarioId;
  onScenario: (s: ScenarioId) => void;
  /** Présent quand l'entrepreneur travaille seul, sans salaire prévu. */
  owner?: { minimumWage: number };
}) {
  const r = results[scenario];
  const y1 = r.years[0];
  const monthOf = (index: number) => formatMonth(r.months[index - 1].month);

  return (
    <div className="flex flex-col gap-5">
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Ventes la 1re année" value={formatXaf(y1.revenue)} />
        <Kpi label="Bénéfice la 1re année" value={formatXaf(y1.netResult)} alert={y1.netResult < 0} />
        <Kpi
          label="Argent nécessaire au départ"
          value={formatXaf(r.financing.totalNeed)}
          detail={`Vous prévoyez ${formatXaf(r.financing.resources.total)}`}
        />
        <Kpi
          label="Rentable dès"
          value={r.indicators.breakEvenMonth ? monthOf(r.indicators.breakEvenMonth) : "Pas sur la période"}
        />
      </div>

      {r.financing.shortfall > 0 ? (
        <p className="rounded-xl border border-danger/40 bg-danger-50 px-4 py-3 text-sm text-danger">
          <strong>Il manque {formatXaf(r.financing.shortfall)}</strong> pour passer le mois le plus difficile (
          {monthOf(r.financing.lowestCashMonth)}).
        </p>
      ) : null}

      <SalesBreakdown r={r} />

      {owner ? <OwnerIncome r={r} minimumWage={owner.minimumWage} /> : null}

      <div className="max-w-3xl rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <CashChart
          title="Argent en caisse, mois par mois"
          months={r.months.map((m) => m.month)}
          series={ORDER.map((id) => ({
            id,
            label: SCENARIO_LABEL[id],
            color: SCENARIO_COLOR[id],
            values: results[id].months.map((m) => m.cash.end),
          }))}
        />
      </div>

      <details className="rounded-2xl border border-line bg-surface">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-forest">Voir tous les chiffres</summary>
        <div className="flex flex-col gap-4 border-t border-line p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              label="Seuil de rentabilité, an 1"
              value={y1.breakEvenRevenue !== null ? formatXaf(y1.breakEvenRevenue) : "Non calculable"}
              detail="Ventes qui couvrent toutes les charges"
            />
            <Kpi
              label="Marge brute, an 1"
              value={y1.grossMarginRate !== null ? formatPercent(y1.grossMarginRate) : "—"}
            />
            <Kpi
              label="Mise de départ récupérée en"
              value={r.indicators.paybackMonth ? `${r.indicators.paybackMonth} mois` : "Au-delà de la période"}
            />
            <Kpi
              label="Rentabilité de l'investissement"
              value={r.indicators.returnOnInvestment !== null ? formatPercent(r.indicators.returnOnInvestment) : "—"}
              detail={`Bénéfice cumulé sur ${r.years.length} ans / investissements`}
            />
          </div>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[520px] text-sm tabular-nums">
              <caption className="px-4 pt-4 text-left text-sm font-bold text-ink">
                Compte de résultat prévisionnel · scénario {SCENARIO_LABEL[scenario].toLowerCase()}
              </caption>
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th scope="col" className="px-4 py-3 text-left font-semibold">
                    En FCFA, hors taxes
                  </th>
                  {r.years.map((year) => (
                    <th key={year.year} scope="col" className="px-4 py-3 text-right font-semibold">
                      An {year.year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LINES.filter((line) => line.key !== "setupCosts" || r.years.some((year) => year.setupCosts > 0)).map(
                  (line) => (
                    <tr key={line.key} className="border-b border-line/70 last:border-0">
                      <th
                        scope="row"
                        className={`px-4 py-2.5 text-left ${line.strong ? "font-bold text-ink" : "font-normal text-ink-soft"}`}
                      >
                        {line.label}
                      </th>
                      {r.years.map((year) => {
                        const value = year[line.key] as number;
                        return (
                          <td
                            key={year.year}
                            className={`whitespace-nowrap px-4 py-2.5 text-right ${line.strong ? "font-bold text-ink" : "text-ink-soft"}`}
                          >
                            {line.negative && value !== 0 ? `−${formatNumber(value)}` : formatNumber(value)}
                          </td>
                        );
                      })}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">
            Calculs faits par le moteur financier v{r.engineVersion}, sans intelligence artificielle. Montants hors
            taxes ; impôt calculé à la clôture de chaque exercice.
          </p>
        </div>
      </details>
    </div>
  );
}
