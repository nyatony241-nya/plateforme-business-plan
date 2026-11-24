import "server-only";
import { createClient } from "@/lib/supabase/server";

/** L'utilisateur connecté est-il administrateur ? */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_admin");
  return data === true;
}

export type AdminOverview = {
  comptes: number;
  comptes_total: number;
  projets: number;
  apercus: number;
  debloques: number;
  cout_ia_usd: number;
  appels_ia: number;
  echecs_ia: number;
  ventes_xaf: number;
  paiements: number;
  credits_vendus: number;
  credits_offerts: number;
};

export async function getAdminOverview(since: Date): Promise<AdminOverview> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_overview", { p_since: since.toISOString() });
  if (error) throw new Error(`Vue d'ensemble illisible : ${error.message}`);
  const raw = data as Record<string, number | string>;
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Number(v)])) as AdminOverview;
}

export type PlanCost = {
  plan: string;
  secteur: string | null;
  cree_le: string;
  debloque: boolean;
  avant_paiement_usd: number;
  apres_paiement_usd: number;
  appels: number;
};

export async function getPlanCosts(since: Date): Promise<PlanCost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_plan_costs", { p_since: since.toISOString() });
  if (error) throw new Error(`Coûts illisibles : ${error.message}`);
  return ((data ?? []) as PlanCost[]).map((r) => ({
    ...r,
    avant_paiement_usd: Number(r.avant_paiement_usd),
    apres_paiement_usd: Number(r.apres_paiement_usd),
  }));
}

export type AdminPack = {
  code: string;
  name: string;
  credits: number;
  price_xaf: number;
  active: boolean;
};

export async function getAllPacks(): Promise<AdminPack[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("credit_packs")
    .select("code, name, credits, price_xaf, active")
    .order("sort_order");
  return (data ?? []) as AdminPack[];
}

export type AdminPayment = {
  created_at: string;
  pack_code: string;
  amount_xaf: number;
  status: string;
  provider: string;
};

export async function getRecentPayments(): Promise<AdminPayment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("created_at, pack_code, amount_xaf, status, provider")
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as AdminPayment[];
}

export type DataToCheck = {
  kind: "Repère local" | "Paramètre fiscal" | "Démarche";
  label: string;
  status: string;
  expiresAt: string | null;
};

/** Chiffres de la base avec leur statut et leur date de revérification. */
export async function getDataToCheck(): Promise<DataToCheck[]> {
  const supabase = await createClient();
  const [points, taxes, procedures] = await Promise.all([
    supabase.from("data_points").select("indicator, value, unit, status, expires_at, city:cities(name)"),
    supabase.from("tax_parameters").select("code, label, value, unit, verified_at"),
    supabase.from("procedures").select("title, expires_at"),
  ]);
  const rows: DataToCheck[] = [];
  for (const p of (points.data ?? []) as unknown as {
    indicator: string;
    value: number;
    unit: string;
    status: string;
    expires_at: string | null;
    city: { name: string } | null;
  }[]) {
    rows.push({
      kind: "Repère local",
      label: `${p.indicator.replaceAll("_", " ")}${p.city ? ` · ${p.city.name}` : ""} : ${Number(p.value).toLocaleString("fr-FR")} ${p.unit}`,
      status: p.status,
      expiresAt: p.expires_at,
    });
  }
  for (const t of (taxes.data ?? []) as {
    code: string;
    label: string;
    value: number;
    unit: string;
    verified_at: string;
  }[]) {
    const value =
      t.unit === "pourcentage"
        ? `${(Number(t.value) * 100).toLocaleString("fr-FR")} %`
        : `${Number(t.value).toLocaleString("fr-FR")}${t.unit === "xaf" ? " FCFA" : ` ${t.unit}`}`;
    // Les règles fiscales changent avec chaque loi de finances : revérification annuelle.
    const next = new Date(`${t.verified_at}T00:00:00Z`);
    next.setUTCFullYear(next.getUTCFullYear() + 1);
    rows.push({ kind: "Paramètre fiscal", label: `${t.label} : ${value}`, status: "verifie", expiresAt: next.toISOString().slice(0, 10) });
  }
  for (const d of (procedures.data ?? []) as { title: string; expires_at: string | null }[]) {
    rows.push({ kind: "Démarche", label: d.title, status: "verifie", expiresAt: d.expires_at });
  }
  return rows.sort((a, b) => (a.expiresAt ?? "9999").localeCompare(b.expiresAt ?? "9999"));
}

/** Bornes de dates de l'espace admin (calculées hors du rendu). */
export function adminDates(days: number | null) {
  const now = Date.now();
  return {
    since: days === null ? new Date("2026-01-01T00:00:00Z") : new Date(now - days * 86_400_000),
    today: new Date(now).toISOString().slice(0, 10),
    soon: new Date(now + 30 * 86_400_000).toISOString().slice(0, 10),
  };
}
