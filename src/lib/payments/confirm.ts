import "server-only";
import { getPawapayDeposit } from "@/lib/payments/pawapay";
import { depositOutcome, type DepositOutcome } from "@/lib/payments/pawapay-utils";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Relit un paiement chez pawaPay et le crédite s'il est payé (montant et devise vérifiés).
 * Le crédit n'est versé qu'une fois, quel que soit le nombre d'appels (retour du navigateur, callback).
 */
export async function settlePayment(paymentId: string): Promise<DepositOutcome> {
  const admin = createAdminClient();
  if (!admin) {
    console.error("Paiement non vérifié : SUPABASE_SERVICE_ROLE_KEY manquante.", paymentId);
    return "pending";
  }
  const { data: payment } = await admin
    .from("payments")
    .select("id, status, amount_xaf, provider")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment || payment.provider !== "pawapay") return "pending";
  if (payment.status === "paye") return "paid";

  const deposit = await getPawapayDeposit(paymentId);
  const outcome = depositOutcome(deposit, payment.amount_xaf);
  if (outcome === "failed" && deposit?.status === "COMPLETED") {
    console.error("Paiement pawaPay reçu avec un montant inattendu : à vérifier.", paymentId, deposit.amount, deposit.currency);
  }
  if (outcome === "paid") {
    const { data, error } = await admin.rpc("credit_payment", { p_payment: paymentId, p_ref: paymentId });
    if (error || data !== true) {
      console.error("Crédit du paiement impossible", paymentId, error?.message);
      return "pending";
    }
  } else if (outcome === "failed") {
    await admin.from("payments").update({ status: "echoue" }).eq("id", paymentId).eq("status", "en_attente");
  }
  return outcome;
}

/**
 * Revérifie les paiements pawaPay en attente des 2 derniers jours d'un utilisateur :
 * un client qui ferme la page après avoir payé est quand même crédité.
 */
export async function settlePendingPayments(userId: string) {
  const admin = createAdminClient();
  if (!admin) return;
  const { data } = await admin
    .from("payments")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "pawapay")
    .eq("status", "en_attente")
    .gte("created_at", new Date(Date.now() - 2 * 86_400_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(10);
  for (const p of data ?? []) {
    await settlePayment(p.id).catch((error) => console.error("Vérification du paiement impossible", p.id, error));
  }
}
