import { settlePendingPayments } from "@/lib/payments/confirm";
import { verifySaspaySignature } from "@/lib/payments/saspay-utils";

/**
 * Webhook SasPay (transaction réussie). La signature est vérifiée sur le corps brut ;
 * ensuite les paiements en attente sont relus chez SasPay avant tout crédit.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const secret = process.env.SASPAY_WEBHOOK_SECRET?.trim();
  if (!secret) return new Response("Webhook non configuré.", { status: 503 });
  const ok = verifySaspaySignature(
    raw,
    request.headers.get("x-webhook-signature"),
    request.headers.get("x-webhook-timestamp"),
    secret,
  );
  if (!ok) return new Response("Signature invalide.", { status: 401 });

  const event = request.headers.get("x-webhook-event");
  if (event !== "transaction.success") return new Response("Ignoré.", { status: 200 });
  try {
    await settlePendingPayments();
    return new Response("Traité.", { status: 200 });
  } catch (error) {
    // SasPay renverra le webhook plus tard.
    console.error("Webhook SasPay non traité", error);
    return new Response("Réessayer plus tard.", { status: 500 });
  }
}
