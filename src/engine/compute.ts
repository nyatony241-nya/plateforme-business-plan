import { DEFAULT_SCENARIOS, ENGINE_VERSION, NON_DEPRECIABLE } from "./defaults";
import { loanSchedule } from "./loan";
import { addMonths, calendarMonth, roundXaf, sum } from "./money";
import type {
  FinancingPlan,
  Indicators,
  MonthRow,
  PlanInput,
  PlanResult,
  ScenarioFactors,
  ScenarioId,
  YearSummary,
} from "./types";

export class EngineInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineInputError";
  }
}

function check(condition: boolean, message: string) {
  if (!condition) throw new EngineInputError(message);
}

const isMoney = (value: number) => Number.isFinite(value) && value >= 0;
const isRate = (value: number) => Number.isFinite(value) && value >= 0 && value < 1;

/** Contrôles de cohérence : le moteur refuse une entrée absurde plutôt que de calculer faux. */
export function validatePlanInput(input: PlanInput) {
  check(/^\d{4}-(0[1-9]|1[0-2])$/.test(input.startMonth), "Mois de démarrage invalide (format AAAA-MM).");
  check(input.years === 3 || input.years === 5, "La projection porte sur 3 ou 5 ans.");
  const horizon = input.years * 12;
  const p = input.params;
  check(isRate(p.corporateTaxRate), "Taux d'impôt sur les sociétés invalide.");
  check(isRate(p.minimumTaxRate), "Taux du minimum d'impôt invalide.");
  check(isMoney(p.minimumTaxFloor), "Plancher du minimum d'impôt invalide.");
  check(Number.isInteger(p.minimumTaxExemptYears) && p.minimumTaxExemptYears >= 0, "Dispense de minimum d'impôt invalide.");
  check(
    p.minimumTaxExemptBelowRevenue === undefined || isMoney(p.minimumTaxExemptBelowRevenue),
    "Seuil des petites entreprises invalide.",
  );
  for (const c of p.employerContributions) {
    check(isRate(c.rate), `Cotisation « ${c.label} » : taux invalide.`);
    check(c.monthlyCeiling === null || c.monthlyCeiling > 0, `Cotisation « ${c.label} » : plafond invalide.`);
  }
  check(Number.isInteger(p.lossCarryForwardYears) && p.lossCarryForwardYears >= 0, "Report de déficit invalide.");

  for (const inv of input.investments) {
    check(isMoney(inv.amount), `Investissement « ${inv.label} » : montant invalide.`);
    if (!NON_DEPRECIABLE.has(inv.kind)) {
      check(inv.lifeYears > 0, `Investissement « ${inv.label} » : durée d'amortissement requise.`);
    }
    check((inv.month ?? 1) >= 1 && (inv.month ?? 1) <= horizon, `Investissement « ${inv.label} » : mois hors période.`);
  }
  for (const offer of input.offers) {
    check(isMoney(offer.unitPrice) && isMoney(offer.unitCost), `Offre « ${offer.label} » : prix ou coût invalide.`);
    check(isMoney(offer.monthlyVolume), `Offre « ${offer.label} » : volume invalide.`);
    if (offer.seasonality) {
      check(offer.seasonality.length === 12, `Offre « ${offer.label} » : 12 coefficients de saisonnalité attendus.`);
      check(offer.seasonality.every((c) => Number.isFinite(c) && c >= 0), `Offre « ${offer.label} » : saisonnalité invalide.`);
    }
  }
  for (const s of input.staff) {
    check(isMoney(s.monthlyGross) && Number.isInteger(s.headcount) && s.headcount >= 0, `Poste « ${s.label} » invalide.`);
  }
  for (const c of input.fixedCosts) check(isMoney(c.monthly), `Charge « ${c.label} » : montant invalide.`);
  check(isMoney(input.financing.equity) && isMoney(input.financing.grants), "Apport ou subvention invalide.");
  for (const loan of input.financing.loans) {
    check(isMoney(loan.principal) && loan.annualRate >= 0 && loan.annualRate < 1, `Emprunt « ${loan.label} » invalide.`);
    check(Number.isInteger(loan.months) && loan.months > 0, `Emprunt « ${loan.label} » : durée invalide.`);
  }
  check(isMoney(input.workingCapital.customerDays) && isMoney(input.workingCapital.supplierDays), "Délais de paiement invalides.");
}

const growth = (rate: number | undefined, year: number) => Math.pow(1 + (rate ?? 0), year - 1);

/** Coût employeur mensuel d'un salarié : brut + cotisations patronales plafonnées. */
export function employerCost(monthlyGross: number, params: Pick<PlanInput["params"], "employerContributions">) {
  return (
    monthlyGross +
    sum(
      params.employerContributions.map(
        (c) => c.rate * (c.monthlyCeiling === null ? monthlyGross : Math.min(monthlyGross, c.monthlyCeiling)),
      ),
    )
  );
}

/** Calcule un scénario complet : compte de résultat, trésorerie, plan de financement, indicateurs. */
export function computePlan(input: PlanInput, scenario: ScenarioId = "realiste"): PlanResult {
  validatePlanInput(input);
  const factors: ScenarioFactors = { ...DEFAULT_SCENARIOS[scenario], ...input.scenarios?.[scenario] };
  const horizon = input.years * 12;
  const p = input.params;
  const zeros = () => new Array<number>(horizon + 1).fill(0);

  // --- Lignes calculées mois par mois (indice 1 = premier mois) ---
  const revenue = zeros();
  const variableCosts = zeros();
  const staffCost = zeros();
  const fixedCosts = zeros();
  const setupCosts = zeros();
  const depreciation = zeros();
  const interest = zeros();
  const principal = zeros();
  const loanIn = zeros();
  const investmentCash = zeros();

  for (let m = 1; m <= horizon; m++) {
    const year = Math.ceil(m / 12);
    const cal = calendarMonth(addMonths(input.startMonth, m - 1));

    let rev = 0;
    let cost = 0;
    for (const offer of input.offers) {
      const ramp = (offer.rampUpMonths ?? 0) > 1 ? Math.min(1, m / offer.rampUpMonths!) : 1;
      const season = offer.seasonality ? offer.seasonality[cal - 1] : 1;
      const volume = offer.monthlyVolume * factors.volume * ramp * season * growth(offer.annualVolumeGrowth, year);
      const priceIndex = growth(offer.annualPriceIncrease, year);
      rev += volume * offer.unitPrice * factors.price * priceIndex;
      cost += volume * offer.unitCost * factors.unitCost * priceIndex;
    }
    revenue[m] = roundXaf(rev);
    variableCosts[m] = roundXaf(cost);

    staffCost[m] = roundXaf(
      sum(
        input.staff
          .filter((s) => m >= (s.startMonth ?? 1))
          .map((s) => s.headcount * employerCost(s.monthlyGross * growth(s.annualRaise, year), p)),
      ),
    );

    fixedCosts[m] = roundXaf(
      sum(
        input.fixedCosts
          .filter((c) => m >= (c.startMonth ?? 1))
          .map((c) => c.monthly * factors.fixedCosts * growth(c.annualIncrease, year)),
      ),
    );
  }

  // Investissements : décaissement au mois d'achat, amortissement linéaire mensuel.
  for (const inv of input.investments) {
    const month = inv.month ?? 1;
    if (inv.kind === "frais_creation") {
      setupCosts[month] += inv.amount; // charge de l'exercice, payée comptant
      continue;
    }
    investmentCash[month] += inv.amount;
    if (NON_DEPRECIABLE.has(inv.kind)) continue;
    const periods = Math.round(inv.lifeYears * 12);
    const monthly = roundXaf(inv.amount / periods);
    for (let k = 0; k < periods; k++) {
      const m = month + k;
      if (m > horizon) break;
      depreciation[m] += k === periods - 1 ? inv.amount - monthly * (periods - 1) : monthly;
    }
  }

  // Emprunts.
  for (const loan of input.financing.loans) {
    const start = loan.startMonth ?? 1;
    if (start <= horizon) loanIn[start] += loan.principal;
    for (const row of loanSchedule(loan)) {
      if (row.index > horizon) break;
      interest[row.index] += row.interest;
      principal[row.index] += row.principal;
    }
  }

  // --- Impôt annuel : max(IS sur bénéfice après déficits reportables, minimum d'impôt) ---
  const incomeTax = zeros();
  const losses: { year: number; amount: number }[] = [];
  const resultBeforeTax = zeros();
  for (let m = 1; m <= horizon; m++) {
    const ebitda = revenue[m] - variableCosts[m] - staffCost[m] - fixedCosts[m] - setupCosts[m];
    resultBeforeTax[m] = ebitda - depreciation[m] - interest[m];
  }
  for (let year = 1; year <= input.years; year++) {
    const months = Array.from({ length: 12 }, (_, i) => (year - 1) * 12 + i + 1);
    const ebt = sum(months.map((m) => resultBeforeTax[m]));
    const yearRevenue = sum(months.map((m) => revenue[m]));
    let taxable = 0;
    if (ebt < 0) {
      losses.push({ year, amount: -ebt });
    } else {
      taxable = ebt;
      for (const loss of losses) {
        if (year - loss.year > p.lossCarryForwardYears || taxable === 0) continue;
        const used = Math.min(loss.amount, taxable);
        loss.amount -= used;
        taxable -= used;
      }
    }
    const smallBusiness =
      p.minimumTaxExemptBelowRevenue !== undefined && yearRevenue < p.minimumTaxExemptBelowRevenue;
    const minimumTax =
      year <= p.minimumTaxExemptYears || smallBusiness
        ? 0
        : Math.max(yearRevenue * p.minimumTaxRate, p.minimumTaxFloor);
    incomeTax[year * 12] = roundXaf(Math.max(taxable * p.corporateTaxRate, minimumTax));
  }

  // --- Trésorerie ---
  const { customerDays, supplierDays } = input.workingCapital;
  const resources = input.financing.equity + input.financing.grants;
  const months: MonthRow[] = [];
  let cashEnd = 0;
  let previousWorkingCapital = 0;
  let projectCumulative = 0;
  let projectLowest = 0;
  let paybackMonth: number | null = null;
  let breakEvenMonth: number | null = null;

  for (let m = 1; m <= horizon; m++) {
    const ebitda = revenue[m] - variableCosts[m] - staffCost[m] - fixedCosts[m] - setupCosts[m];
    const workingCapital =
      roundXaf((revenue[m] * customerDays) / 30) - roundXaf((variableCosts[m] * supplierDays) / 30);
    const workingCapitalChange = workingCapital - previousWorkingCapital;
    previousWorkingCapital = workingCapital;

    const financingIn = loanIn[m] + (m === 1 ? resources : 0);
    const operating = ebitda - interest[m];
    const net = operating - workingCapitalChange - investmentCash[m] + financingIn - principal[m] - incomeTax[m];
    cashEnd += net;

    // Flux du projet, hors financement : sert au besoin total et au délai de récupération.
    projectCumulative += ebitda - workingCapitalChange - investmentCash[m] - incomeTax[m];
    projectLowest = Math.min(projectLowest, projectCumulative);
    if (paybackMonth === null && projectLowest < 0 && projectCumulative >= 0) paybackMonth = m;
    if (breakEvenMonth === null && resultBeforeTax[m] >= 0 && revenue[m] > 0) breakEvenMonth = m;

    months.push({
      index: m,
      month: addMonths(input.startMonth, m - 1),
      year: Math.ceil(m / 12),
      revenue: revenue[m],
      variableCosts: variableCosts[m],
      grossMargin: revenue[m] - variableCosts[m],
      staffCost: staffCost[m],
      fixedCosts: fixedCosts[m],
      setupCosts: setupCosts[m],
      ebitda,
      depreciation: depreciation[m],
      operatingResult: ebitda - depreciation[m],
      interest: interest[m],
      resultBeforeTax: resultBeforeTax[m],
      incomeTax: incomeTax[m],
      netResult: resultBeforeTax[m] - incomeTax[m],
      cash: {
        operating,
        workingCapitalChange,
        investments: investmentCash[m],
        financingIn,
        loanRepayment: principal[m],
        taxPaid: incomeTax[m],
        net,
        end: cashEnd,
      },
    });
  }

  const years: YearSummary[] = Array.from({ length: input.years }, (_, i) => {
    const rows = months.slice(i * 12, i * 12 + 12);
    const total = (key: keyof Omit<MonthRow, "cash" | "month" | "index" | "year">) =>
      sum(rows.map((r) => r[key] as number));
    const yearRevenue = total("revenue");
    const grossMargin = total("grossMargin");
    const fixedCharges =
      total("staffCost") + total("fixedCosts") + total("setupCosts") + total("depreciation") + total("interest");
    const marginRate = yearRevenue > 0 ? grossMargin / yearRevenue : null;
    return {
      year: i + 1,
      revenue: yearRevenue,
      variableCosts: total("variableCosts"),
      grossMargin,
      grossMarginRate: marginRate,
      staffCost: total("staffCost"),
      fixedCosts: total("fixedCosts"),
      setupCosts: total("setupCosts"),
      ebitda: total("ebitda"),
      depreciation: total("depreciation"),
      operatingResult: total("operatingResult"),
      interest: total("interest"),
      resultBeforeTax: total("resultBeforeTax"),
      incomeTax: total("incomeTax"),
      netResult: total("netResult"),
      breakEvenRevenue: marginRate && marginRate > 0 ? roundXaf(fixedCharges / marginRate) : null,
      cashEnd: rows[rows.length - 1].cash.end,
    };
  });

  const investmentsTotal = sum(input.investments.map((inv) => inv.amount));
  const loansTotal = sum(input.financing.loans.map((loan) => loan.principal));
  let lowestCash = Infinity;
  let lowestCashMonth = 1;
  for (const row of months) {
    if (row.cash.end < lowestCash) {
      lowestCash = row.cash.end;
      lowestCashMonth = row.index;
    }
  }

  const financing: FinancingPlan = {
    investmentsTotal,
    totalNeed: -projectLowest,
    resources: {
      equity: input.financing.equity,
      loans: loansTotal,
      grants: input.financing.grants,
      total: input.financing.equity + loansTotal + input.financing.grants,
    },
    lowestCash,
    lowestCashMonth,
    shortfall: Math.max(0, -lowestCash),
  };

  const cumulativeNetResult = sum(months.map((r) => r.netResult));
  const indicators: Indicators = {
    breakEvenMonth,
    paybackMonth,
    returnOnInvestment: investmentsTotal > 0 ? cumulativeNetResult / investmentsTotal : null,
    cumulativeNetResult,
  };

  return { engineVersion: ENGINE_VERSION, scenario, factors, months, years, financing, indicators };
}

/** Les trois scénarios, calculés à partir des mêmes hypothèses. */
export function computeScenarios(input: PlanInput): Record<ScenarioId, PlanResult> {
  return {
    prudent: computePlan(input, "prudent"),
    realiste: computePlan(input, "realiste"),
    optimiste: computePlan(input, "optimiste"),
  };
}
