import "server-only";
import { getChariowSaleStatus } from "@/lib/payments/chariow";
import { isPaidStatus } from "@/lib/payments/chariow-utils";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Crédite un paiement dont la vente est confirmée. La vente est relue chez Chariow quand
 * `checkWithChariow` est vrai (retour du navigateur) ; un Pulse signé suffit sinon.
 * Renvoie true si le paiement est (ou était déjà) crédité.
 */
export async function confirmPayment(paymentId: string, saleId: string, checkWithChariow: boolean) {
  const admin = createAdminClient();
  if (!admin) {
    console.error("Paiement non crédité : SUPABASE_SERVICE_ROLE_KEY manquante.", paymentId);
    return false;
  }
  if (checkWithChariow && !isPaidStatus(await getChariowSaleStatus(saleId))) return false;
  const { data, error } = await admin.rpc("credit_payment", { p_payment: paymentId, p_ref: saleId });
  if (error) {
    console.error("Crédit du paiement impossible", paymentId, error.message);
    return false;
  }
  return data === true;
}

/** Paiement qui correspond à une vente Chariow. */
export async function findPaymentBySale(saleId: string) {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("payments").select("id, status").eq("provider_ref", saleId).maybeSingle();
  return data as { id: string; status: string } | null;
}
