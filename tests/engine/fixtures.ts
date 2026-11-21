import type { CountryParams, PlanInput } from "@/engine";

/**
 * Paramètres FICTIFS, uniquement pour les tests : ils ne représentent pas la
 * fiscalité d'un pays. Les vrais taux viennent du référentiel, avec leur source.
 */
export const TEST_PARAMS: CountryParams = {
  currency: "XAF",
  corporateTaxRate: 0.3,
  minimumTaxRate: 0.01,
  minimumTaxFloor: 0,
  employerSocialRate: 0.2,
  lossCarryForwardYears: 3,
};

/**
 * Cas A, calculé à la main :
 * 100 ventes/mois à 10 000 (coût 4 000) → CA 1 000 000, marge 600 000.
 * 1 salarié à 200 000 brut + 20 % = 240 000 ; charges fixes 300 000.
 * Matériel 1 200 000 sur 5 ans → 20 000/mois. Apport 2 000 000.
 * EBE 60 000/mois ; résultat avant impôt 40 000/mois, 480 000/an.
 */
export function caseA(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    startMonth: "2027-01",
    years: 3,
    investments: [{ label: "Matériel", kind: "materiel", amount: 1_200_000, lifeYears: 5 }],
    offers: [{ label: "Produit", unitPrice: 10_000, unitCost: 4_000, monthlyVolume: 100 }],
    staff: [{ label: "Vendeur", monthlyGross: 200_000, headcount: 1 }],
    fixedCosts: [{ label: "Loyer et charges", monthly: 300_000 }],
    financing: { equity: 2_000_000, loans: [], grants: 0 },
    workingCapital: { customerDays: 0, supplierDays: 0 },
    params: TEST_PARAMS,
    ...overrides,
  };
}
