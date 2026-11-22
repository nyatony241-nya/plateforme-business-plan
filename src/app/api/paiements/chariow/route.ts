import { confirmPayment, findPaymentBySale } from "@/lib/payments/confirm";
import { verifyChariowSignature } from "@/lib/payments/chariow-utils";

/**
 * Pulse (webhook) Chariow : une vente réussie crédite le paiement correspondant.
 * La signature HMAC est vérifiée sur le corps brut ; une requête non signée est refusée.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const secret = process.env.CHARIOW_WEBHOOK_SECRET?.trim();
  if (!secret) return new Response("Pulse non configuré.", { status: 503 });
  if (!verifyChariowSignature(raw, request.headers.get("x-chariow-signature"), secret)) {
    return new Response("Signature invalide.", { status: 401 });
  }

  let body: { event?: string; sale?: { id?: string } };
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Corps illisible.", { status: 400 });
  }
  if (body.event !== "successful.sale" || typeof body.sale?.id !== "string") {
    return new Response("Ignoré.", { status: 200 });
  }

  const payment = await findPaymentBySale(body.sale.id);
  if (!payment) {
    console.warn("Vente Chariow sans paiement correspondant", body.sale.id);
    return new Response("Vente inconnue.", { status: 200 });
  }
  const ok = await confirmPayment(payment.id, body.sale.id, false);
  // En cas d'échec, Chariow renverra le Pulse plus tard.
  return new Response(ok ? "Crédité." : "Réessayer plus tard.", { status: ok ? 200 : 500 });
}
