import { formatNumber } from "@/lib/format";

/** Repère local tiré de la base (loyer, salaire, tarif), avec sa source. */
export type LocalReference = {
  indicator: string;
  value: number;
  min: number | null;
  max: number | null;
  unit: string;
  /** Ville du relevé ; null = valeur nationale. */
  city: string | null;
  method: string;
  source: { title: string; publisher: string; url: string | null };
  checkedAt: string;
};

/** Ligne brute renvoyée par la base. */
export type LocalReferenceRow = LocalReference;

export const INDICATOR_LABEL: Record<string, string> = {
  loyer_local_commercial_mois: "Loyer d'un local commercial",
  salaire_poste_peu_qualifie_mois: "Salaire affiché pour un poste peu qualifié",
  electricite_prix_kwh: "Prix de l'électricité",
  internet_box_mois: "Abonnement internet",
};

/** Ville de repli quand la commune du projet n'a pas encore de relevé. */
const FALLBACK_CITY = "Libreville";

/**
 * Pour chaque indicateur, garde le relevé le plus proche du projet : sa ville,
 * puis Libreville (même agglomération), puis la valeur nationale.
 */
export function pickReferences(rows: LocalReferenceRow[], city: string | null): LocalReference[] {
  const rank = (r: LocalReferenceRow) =>
    r.city !== null && city !== null && r.city.toLowerCase() === city.toLowerCase()
      ? 0
      : r.city === FALLBACK_CITY
        ? 1
        : r.city === null
          ? 2
          : 3;
  const best = new Map<string, LocalReferenceRow>();
  for (const row of rows) {
    if (rank(row) === 3) continue;
    const current = best.get(row.indicator);
    if (!current || rank(row) < rank(current) || (rank(row) === rank(current) && row.checkedAt > current.checkedAt)) {
      best.set(row.indicator, row);
    }
  }
  const order = Object.keys(INDICATOR_LABEL);
  return [...best.values()].sort((a, b) => order.indexOf(a.indicator) - order.indexOf(b.indicator));
}

const amount = (n: number) => formatNumber(n);

/** « Loyer d'un local commercial à Akanda : 100 000 à 450 000 FCFA par mois (médiane 200 000) ». */
export function referenceText(r: LocalReference, projectCity: string | null = null) {
  const label = INDICATOR_LABEL[r.indicator] ?? r.indicator;
  const where = r.city
    ? ` à ${r.city}${projectCity && projectCity.toLowerCase() !== r.city.toLowerCase() ? ` (pas encore de relevé à ${projectCity})` : ""}`
    : " au Gabon";
  const range =
    r.min !== null && r.max !== null && r.min !== r.max
      ? `${amount(r.min)} à ${amount(r.max)} ${r.unit} (valeur courante ${amount(r.value)})`
      : `${amount(r.value)} ${r.unit}`;
  return `${label}${where} : ${range}`;
}

/** Repère du loyer commercial, s'il existe. */
export const rentReference = (refs: LocalReference[]) => refs.find((r) => r.indicator === "loyer_local_commercial_mois");

/** Mois et année du relevé, pour l'affichage (« novembre 2026 »). */
export function checkedMonth(r: Pick<LocalReference, "checkedAt">) {
  const d = new Date(`${r.checkedAt.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? r.checkedAt
    : d.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Copie figée des repères utilisés, enregistrée avec les hypothèses du plan. */
export function referenceSnapshot(refs: LocalReference[], projectCity: string | null) {
  return refs.map((r) => ({
    text: referenceText(r, projectCity).slice(0, 300),
    source: `${r.source.publisher}, relevé de ${checkedMonth(r)}`.slice(0, 200),
    ...(r.source.url ? { url: r.source.url.slice(0, 500) } : {}),
  }));
}
