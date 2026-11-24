import "server-only";
import { getSaspaySession, getSaspayStatus } from "@/lib/payments/saspay";
import { sessionOutcome, type PaymentOutcome } from "@/lib/payments/saspay-utils";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Relit un paiement chez SasPay et le crédite s'il est payé (montant, devise et identifiant vérifiés).
 * Le crédit n'est versé qu'une fois, quel que soit le nombre d'appels (retour du navigateur, webhook).
 */
export async function settlePayment(paymentId: string): Promise<PaymentOutcome> {
  const admin = createAdminClient();
  if (!admin) {
    console.error("Paiement non vérifié : SUPABASE_SERVICE_ROLE_KEY manquante.", paymentId);
    return "pending";
  }
  const { data: payment } = await admin
    .from("payments")
    .select("id, status, amount_xaf, provider, provider_ref")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment || payment.provider !== "saspay" || !payment.provider_ref) return "pending";
  if (payment.status === "paye") return "paid";
  if (payment.status !== "en_attente") return "failed";

  const ref = payment.provider_ref as string;
  const status = await getSaspayStatus(ref);
  const paidSoFar = status?.status === "PAID" && status.transaction_status === "SUCCESS";
  const detail = paidSoFar ? await getSaspaySession(ref) : null;
  const outcome = sessionOutcome(status, detail, { amount: payment.amount_xaf, paymentId });

  if (outcome === "paid") {
    const { data, error } = await admin.rpc("credit_payment", { p_payment: paymentId, p_ref: ref });
    if (error || data !== true) {
      console.error("Crédit du paiement impossible", paymentId, error?.message);
      return "pending";
    }
  } else if (outcome === "failed") {
    if (paidSoFar) console.error("Paiement SasPay reçu mais incohérent : à vérifier.", paymentId, detail);
    await admin.from("payments").update({ status: "echoue" }).eq("id", paymentId).eq("status", "en_attente");
  }
  return outcome;
}

/**
 * Revérifie les paiements SasPay en attente des 2 derniers jours (d'un utilisateur, ou de tous
 * à la réception d'un webhook) : un client qui ferme la page après avoir payé est quand même crédité.
 */
export async function settlePendingPayments(userId?: string) {
  const admin = createAdminClient();
  if (!admin) return;
  let query = admin
    .from("payments")
    .select("id")
    .eq("provider", "saspay")
    .eq("status", "en_attente")
    .not("provider_ref", "is", null)
    .gte("created_at", new Date(Date.now() - 2 * 86_400_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(20);
  if (userId) query = query.eq("user_id", userId);
  const { data } = await query;
  for (const p of data ?? []) {
    await settlePayment(p.id).catch((error) => console.error("Vérification du paiement impossible", p.id, error));
  }
}
