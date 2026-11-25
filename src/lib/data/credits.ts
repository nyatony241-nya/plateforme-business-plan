import "server-only";
import { createClient } from "@/lib/supabase/server";

export type CreditPack = {
  code: string;
  name: string;
  credits: number;
  price_xaf: number;
};

/** Solde de crédits de l'utilisateur connecté. */
export async function getCreditBalance(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("credit_balance");
  if (error) throw new Error(`Solde de crédits illisible : ${error.message}`);
  return Number(data ?? 0);
}

export async function getCreditPacks(): Promise<CreditPack[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credit_packs")
    .select("code, name, credits, price_xaf")
    .order("sort_order");
  if (error) throw new Error(`Formules illisibles : ${error.message}`);
  return (data ?? []) as CreditPack[];
}

/**
 * L'utilisateur a-t-il déjà acheté (ou reçu) des crédits ? Les comptes qui n'ont jamais payé
 * ont des limites plus basses, pour que les aperçus gratuits coûtent peu.
 */
export async function hasEverPaid(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("credit_ledger").select("delta").gt("delta", 0).limit(1);
  return (data?.length ?? 0) > 0;
}

/** Limite sur 24 heures selon que le compte a déjà payé ou non. */
export async function dailyLimit(limits: { paid: number; free: number }) {
  return (await hasEverPaid()) ? limits.paid : limits.free;
}

/** Le business plan de ce projet a-t-il été débloqué ? */
export async function isPlanUnlocked(projectId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("plan_unlocks").select("project_id").eq("project_id", projectId).maybeSingle();
  return data !== null;
}

/** Débloque le plan contre 1 crédit. False si le solde est insuffisant. */
export async function unlockPlan(projectId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("unlock_plan", { p_project: projectId });
  if (error) throw new Error(`Déblocage impossible : ${error.message}`);
  return data === true;
}

export type LedgerEntry = { delta: number; reason: string; created_at: string; project: { name: string } | null };

export async function getRecentLedger(): Promise<LedgerEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("credit_ledger")
    .select("delta, reason, created_at, project:projects(name)")
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<LedgerEntry[]>();
  return data ?? [];
}
