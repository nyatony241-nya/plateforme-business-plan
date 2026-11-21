import { z } from "zod";
import type { CountryParams, InvestmentKind, PlanInput } from "@/engine";

/**
 * Hypothèses saisies par l'entrepreneur pour un projet (format enregistré en base,
 * version 1). Ce sont toutes des « hypothèses » au sens du produit : elles viennent
 * de l'utilisateur. Les paramètres fiscaux, eux, viennent du référentiel.
 */

export const INVESTMENT_KINDS: { value: InvestmentKind; label: string; depreciable: boolean }[] = [
  { value: "materiel", label: "Matériel", depreciable: true },
  { value: "travaux", label: "Travaux et aménagement", depreciable: true },
  { value: "vehicule", label: "Véhicule", depreciable: true },
  { value: "informatique", label: "Informatique", depreciable: true },
  { value: "frais_creation", label: "Frais de création", depreciable: false },
  { value: "caution", label: "Caution du local", depreciable: false },
  { value: "stock_initial", label: "Stock initial", depreciable: false },
  { value: "autre", label: "Autre investissement", depreciable: true },
];

const money = z.number().int().min(0).max(1e13);
const rowId = z.string().min(1).max(64);
const label = z.string().max(120);
/** Explication d'une hypothèse générée automatiquement (« pourquoi ce chiffre »). */
const note = z.string().max(400).optional();

export const assumptionsSchema = z.object({
  startMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  years: z.union([z.literal(3), z.literal(5)]),
  investments: z
    .array(
      z.object({
        id: rowId,
        label,
        note,
        kind: z.enum(INVESTMENT_KINDS.map((k) => k.value) as [InvestmentKind, ...InvestmentKind[]]),
        amount: money,
        lifeYears: z.number().min(0).max(50),
      }),
    )
    .max(50),
  offers: z
    .array(
      z.object({
        id: rowId,
        label,
        note,
        unitPrice: money,
        unitCost: money,
        monthlyVolume: z.number().min(0).max(1e9),
        rampUpMonths: z.number().int().min(0).max(60),
        annualVolumeGrowth: z.number().min(-0.99).max(10),
      }),
    )
    .max(50),
  staff: z
    .array(
      z.object({
        id: rowId,
        label,
        note,
        monthlyGross: money,
        headcount: z.number().int().min(0).max(10_000),
        startMonth: z.number().int().min(1).max(60),
      }),
    )
    .max(50),
  fixedCosts: z.array(z.object({ id: rowId, label, note, monthly: money })).max(50),
  financing: z.object({
    note,
    equity: money,
    grants: money,
    loans: z
      .array(
        z.object({
          id: rowId,
          label,
          note,
          principal: money,
          annualRate: z.number().min(0).max(0.99),
          months: z.number().int().min(1).max(360),
          deferralMonths: z.number().int().min(0).max(120),
        }),
      )
      .max(10),
  }),
  workingCapital: z.object({
    customerDays: z.number().int().min(0).max(365),
    supplierDays: z.number().int().min(0).max(365),
  }),
  /** Présent quand les hypothèses ont été produites automatiquement. */
  generation: z
    .object({
      model: z.string().max(100),
      generatedAt: z.string().max(40),
      summary: z.string().max(1200),
      warnings: z.array(z.string().max(400)).max(8),
    })
    .optional(),
});

export type Assumptions = z.infer<typeof assumptionsSchema>;

/** Mois suivant la date donnée, au format AAAA-MM. */
export function nextMonth(today: Date = new Date()) {
  const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
  return date.toISOString().slice(0, 7);
}

export function newRowId() {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Point de départ d'un nouveau plan : une ligne de vente et un loyer à compléter. */
export function defaultAssumptions(today: Date = new Date()): Assumptions {
  return {
    startMonth: nextMonth(today),
    years: 3,
    investments: [],
    offers: [
      { id: "offre-1", label: "", unitPrice: 0, unitCost: 0, monthlyVolume: 0, rampUpMonths: 0, annualVolumeGrowth: 0 },
    ],
    staff: [],
    fixedCosts: [{ id: "charge-1", label: "Loyer", monthly: 0 }],
    financing: { equity: 0, grants: 0, loans: [] },
    workingCapital: { customerDays: 0, supplierDays: 0 },
  };
}

/** Convertit les hypothèses enregistrées en entrée du moteur. */
export function toPlanInput(a: Assumptions, params: CountryParams): PlanInput {
  return {
    startMonth: a.startMonth,
    years: a.years,
    investments: a.investments.map((inv) => ({
      label: inv.label || "Investissement",
      kind: inv.kind,
      amount: inv.amount,
      lifeYears: inv.lifeYears,
    })),
    offers: a.offers.map((o) => ({
      label: o.label || "Vente",
      unitPrice: o.unitPrice,
      unitCost: o.unitCost,
      monthlyVolume: o.monthlyVolume,
      rampUpMonths: o.rampUpMonths,
      annualVolumeGrowth: o.annualVolumeGrowth,
    })),
    staff: a.staff.map((s) => ({
      label: s.label || "Poste",
      monthlyGross: s.monthlyGross,
      headcount: s.headcount,
      startMonth: s.startMonth,
    })),
    fixedCosts: a.fixedCosts.map((c) => ({ label: c.label || "Charge", monthly: c.monthly })),
    financing: {
      equity: a.financing.equity,
      grants: a.financing.grants,
      loans: a.financing.loans.map((l) => ({
        label: l.label || "Emprunt",
        principal: l.principal,
        annualRate: l.annualRate,
        months: l.months,
        deferralMonths: l.deferralMonths,
      })),
    },
    workingCapital: a.workingCapital,
    params,
  };
}
