/**
 * Types du moteur financier.
 * Tous les montants sont en francs CFA (XAF), hors taxes, en nombres entiers.
 * Les taux sont des fractions : 0,18 = 18 %.
 */

export type ScenarioId = "prudent" | "realiste" | "optimiste";

/** Paramètres fiscaux et sociaux d'un pays, lus en base avec leur source. */
export interface CountryParams {
  currency: "XAF";
  /** Taux de l'impôt sur les sociétés appliqué au bénéfice. */
  corporateTaxRate: number;
  /** Minimum d'impôt exprimé en fraction du chiffre d'affaires annuel. */
  minimumTaxRate: number;
  /** Montant plancher du minimum d'impôt, en XAF. */
  minimumTaxFloor: number;
  /** Charges sociales patronales, en fraction du salaire brut. */
  employerSocialRate: number;
  /** Nombre d'années pendant lesquelles un déficit est reportable (0 = aucun report). */
  lossCarryForwardYears: number;
}

export type InvestmentKind =
  | "materiel"
  | "travaux"
  | "vehicule"
  | "informatique"
  | "frais_creation"
  | "caution"
  | "stock_initial"
  | "autre";

export interface Investment {
  label: string;
  kind: InvestmentKind;
  amount: number;
  /** Durée d'amortissement en années. Ignorée pour caution, stock initial et frais de création. */
  lifeYears: number;
  /** Mois d'achat, 1 = premier mois d'activité. */
  month?: number;
}

export interface Offer {
  label: string;
  /** Prix de vente unitaire hors taxes. */
  unitPrice: number;
  /** Coût variable unitaire (achat, matière, commission). */
  unitCost: number;
  /** Ventes mensuelles une fois la montée en charge terminée. */
  monthlyVolume: number;
  /** Nombre de mois pour atteindre le volume cible (0 ou 1 = immédiat). */
  rampUpMonths?: number;
  /** 12 coefficients mensuels (janvier → décembre), 1 = mois normal. */
  seasonality?: number[];
  /** Croissance annuelle des volumes à partir de la 2e année. */
  annualVolumeGrowth?: number;
  /** Hausse annuelle des prix de vente et des coûts d'achat à partir de la 2e année. */
  annualPriceIncrease?: number;
}

export interface StaffPosition {
  label: string;
  /** Salaire brut mensuel par personne. */
  monthlyGross: number;
  headcount: number;
  /** Mois d'embauche, 1 = premier mois. */
  startMonth?: number;
  /** Augmentation annuelle à partir de la 2e année d'activité. */
  annualRaise?: number;
}

export interface FixedCost {
  label: string;
  monthly: number;
  startMonth?: number;
  annualIncrease?: number;
}

export interface Loan {
  label: string;
  principal: number;
  /** Taux annuel nominal. */
  annualRate: number;
  /** Durée totale en mois, différé compris. */
  months: number;
  /** Différé partiel : seuls les intérêts sont payés pendant ces mois. */
  deferralMonths?: number;
  /** Mois de déblocage, 1 = premier mois. */
  startMonth?: number;
}

export interface Financing {
  /** Apport personnel ou des associés. */
  equity: number;
  loans: Loan[];
  /** Subventions et dons, encaissés au premier mois. */
  grants: number;
}

export interface WorkingCapital {
  /** Délai moyen de paiement des clients, en jours (0 = paiement comptant). */
  customerDays: number;
  /** Délai moyen de paiement des fournisseurs, en jours. */
  supplierDays: number;
}

export interface ScenarioFactors {
  volume: number;
  price: number;
  unitCost: number;
  fixedCosts: number;
}

export interface PlanInput {
  /** Premier mois d'activité, format AAAA-MM. */
  startMonth: string;
  years: 3 | 5;
  investments: Investment[];
  offers: Offer[];
  staff: StaffPosition[];
  fixedCosts: FixedCost[];
  financing: Financing;
  workingCapital: WorkingCapital;
  params: CountryParams;
  /** Coefficients des scénarios ; valeurs par défaut si absent. */
  scenarios?: Partial<Record<ScenarioId, ScenarioFactors>>;
}

export interface MonthRow {
  /** 1 = premier mois d'activité. */
  index: number;
  /** AAAA-MM. */
  month: string;
  year: number;
  revenue: number;
  variableCosts: number;
  grossMargin: number;
  staffCost: number;
  fixedCosts: number;
  setupCosts: number;
  ebitda: number;
  depreciation: number;
  operatingResult: number;
  interest: number;
  resultBeforeTax: number;
  incomeTax: number;
  netResult: number;
  cash: {
    operating: number;
    workingCapitalChange: number;
    investments: number;
    financingIn: number;
    loanRepayment: number;
    taxPaid: number;
    net: number;
    end: number;
  };
}

export interface YearSummary {
  year: number;
  revenue: number;
  variableCosts: number;
  grossMargin: number;
  /** Marge brute / chiffre d'affaires, ou null si le chiffre d'affaires est nul. */
  grossMarginRate: number | null;
  staffCost: number;
  fixedCosts: number;
  setupCosts: number;
  ebitda: number;
  depreciation: number;
  operatingResult: number;
  interest: number;
  resultBeforeTax: number;
  incomeTax: number;
  netResult: number;
  /** Chiffre d'affaires nécessaire pour couvrir toutes les charges fixes, ou null. */
  breakEvenRevenue: number | null;
  cashEnd: number;
}

export interface FinancingPlan {
  investmentsTotal: number;
  /** Besoin total : creux de trésorerie sans aucun financement (investissements + démarrage). */
  totalNeed: number;
  resources: { equity: number; loans: number; grants: number; total: number };
  /** Trésorerie la plus basse avec le financement prévu. */
  lowestCash: number;
  lowestCashMonth: number;
  /** Financement manquant (0 si le plan est couvert). */
  shortfall: number;
}

export interface Indicators {
  /** Premier mois où le résultat avant impôt mensuel est positif ou nul. */
  breakEvenMonth: number | null;
  /** Premier mois où les flux cumulés (hors financement) remboursent les investissements. */
  paybackMonth: number | null;
  /** Résultat net cumulé sur la période / investissements. */
  returnOnInvestment: number | null;
  cumulativeNetResult: number;
}

export interface PlanResult {
  engineVersion: string;
  scenario: ScenarioId;
  factors: ScenarioFactors;
  months: MonthRow[];
  years: YearSummary[];
  financing: FinancingPlan;
  indicators: Indicators;
}
