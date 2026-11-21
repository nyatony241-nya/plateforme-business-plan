import "server-only";
import { pickReferences, type LocalReference } from "@/lib/local-references";
import { createClient } from "@/lib/supabase/server";

type Row = {
  indicator: string;
  value: number | string;
  value_min: number | string | null;
  value_max: number | string | null;
  unit: string;
  method: string | null;
  verified_at: string;
  city: { name: string } | null;
  source: { title: string; url: string | null; publisher: string | null } | null;
};

const num = (v: number | string | null) => (v === null ? null : Number(v));

/**
 * Repères locaux encore valables pour la ville du projet (loyers, salaires, tarifs),
 * avec leur source. Liste vide si la base n'en a pas : le plan reste alors en hypothèses.
 */
export async function getLocalReferences(countryCode: string, city: string | null): Promise<LocalReference[]> {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("data_points")
    .select(
      "indicator, value, value_min, value_max, unit, method, verified_at, city:cities(name), source:sources(title, url, publisher)",
    )
    .eq("country_code", countryCode)
    .neq("status", "hypothese")
    .gte("expires_at", today)
    .returns<Row[]>();
  // Les repères aident l'IA mais ne doivent jamais bloquer la génération.
  if (error) return [];

  return pickReferences(
    (data ?? []).map((row) => ({
      indicator: row.indicator,
      value: Number(row.value),
      min: num(row.value_min),
      max: num(row.value_max),
      unit: row.unit,
      city: row.city?.name ?? null,
      method: row.method ?? "",
      source: {
        title: row.source?.title ?? "",
        publisher: row.source?.publisher ?? "",
        url: row.source?.url ?? null,
      },
      checkedAt: row.verified_at,
    })),
    city,
  );
}
