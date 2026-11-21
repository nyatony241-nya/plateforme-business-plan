import "server-only";
import type { CountryParams, EmployerContribution } from "@/engine";
import type { LegalForm } from "@/lib/creation-guide";
import type { DataStatus } from "@/lib/data-status";
import { createClient } from "@/lib/supabase/server";

export type ParamProvenance = {
  code: string;
  label: string;
  value: number;
  unit: string;
  monthlyCeiling: number | null;
  status: DataStatus;
  note: string | null;
  verifiedAt: string;
  source: { title: string; url: string | null; publisher: string | null };
};

type Row = {
  code: string;
  label: string;
  value: number | string;
  unit: string;
  monthly_ceiling: number | string | null;
  status: DataStatus;
  note: string | null;
  verified_at: string;
  valid_from: string;
  source: { title: string; url: string | null; publisher: string | null } | null;
};

/**
 * Paramètres fiscaux et sociaux en vigueur à une date, avec leur provenance.
 * Pour chaque code, la valeur la plus récente applicable est retenue.
 */
export async function getCountryParams(
  countryCode = "GA",
  options: {
    /** Forme juridique : seule l'entreprise individuelle relève de l'impôt synthétique libératoire. */
    legalForm?: LegalForm;
    onDate?: string;
  } = {},
): Promise<{ params: CountryParams; provenance: ParamProvenance[] }> {
  const onDate = options.onDate ?? new Date().toISOString().slice(0, 10);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tax_parameters")
    .select(
      "code, label, value, unit, monthly_ceiling, status, note, verified_at, valid_from, source:sources(title, url, publisher)",
    )
    .eq("country_code", countryCode)
    .lte("valid_from", onDate)
    .or(`valid_to.is.null,valid_to.gte.${onDate}`)
    .order("valid_from", { ascending: false })
    .returns<Row[]>();
  if (error) throw new Error(`Lecture des paramètres fiscaux impossible : ${error.message}`);

  const latest = new Map<string, ParamProvenance>();
  for (const row of data ?? []) {
    if (latest.has(row.code)) continue;
    latest.set(row.code, {
      code: row.code,
      label: row.label,
      value: Number(row.value),
      unit: row.unit,
      monthlyCeiling: row.monthly_ceiling === null ? null : Number(row.monthly_ceiling),
      status: row.status,
      note: row.note,
      verifiedAt: row.verified_at,
      source: row.source ?? { title: "Source inconnue", url: null, publisher: null },
    });
  }

  const required = (code: string) => {
    const param = latest.get(code);
    if (!param) throw new Error(`Paramètre « ${code} » manquant pour ${countryCode}.`);
    return param.value;
  };

  const employerContributions: EmployerContribution[] = [...latest.values()]
    .filter((p) => p.code.startsWith("cotisation_"))
    .map((p) => ({ label: p.label, rate: p.value, monthlyCeiling: p.monthlyCeiling }));

  const params: CountryParams = {
    currency: "XAF",
    corporateTaxRate: required("is_taux"),
    minimumTaxRate: required("imf_taux"),
    minimumTaxFloor: required("minimum_perception"),
    minimumTaxExemptYears: required("minimum_dispense_annees"),
    lossCarryForwardYears: required("deficit_report_annees"),
    employerContributions,
    // Impôt synthétique libératoire : personnes physiques (entreprise individuelle) uniquement.
    ...(latest.has("isl_seuil_ca") && options.legalForm !== "SOCIETE"
      ? { minimumTaxExemptBelowRevenue: latest.get("isl_seuil_ca")!.value }
      : {}),
  };

  return { params, provenance: [...latest.values()] };
}
