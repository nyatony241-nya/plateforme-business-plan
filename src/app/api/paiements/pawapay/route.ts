import { settlePayment } from "@/lib/payments/confirm";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Callback pawaPay (dépôt terminé). Le corps n'est pas cru sur parole : le dépôt est relu
 * chez pawaPay avec notre jeton avant tout crédit. Seul l'identifiant est utilisé.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { depositId?: unknown } | null;
  const depositId = body?.depositId;
  if (typeof depositId !== "string" || !UUID.test(depositId)) return new Response("Ignoré.", { status: 200 });
  try {
    const outcome = await settlePayment(depositId);
    return new Response(outcome, { status: 200 });
  } catch (error) {
    // pawaPay renverra le callback plus tard.
    console.error("Callback pawaPay non traité", depositId, error);
    return new Response("Réessayer plus tard.", { status: 500 });
  }
}
