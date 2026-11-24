import "server-only";
import { SASPAY_COUNTRIES, type SaspayCountry, unwrap } from "@/lib/payments/saspay-utils";

const key = () => process.env.SASPAY_SECRET_KEY?.trim() || null;

/** Clé de test (sk_test_…) → bac à sable ; clé de production (sk_live_…) → encaissement réel. */
const baseUrl = (k: string) =>
  k.startsWith("sk_test_") ? "https://sandbox-api.saspay.me/api/v1" : "https://api.saspay.me/api/v1";

/** Le paiement SasPay est-il configuré (clé secrète présente) ? */
export const saspayConfigured = () => key() !== null;

async function call<T>(path: string, init: RequestInit = {}): Promise<{ status: number; data: T | null }> {
  const k = key();
  if (!k) throw new Error("Paiement SasPay non configuré.");
  const response = await fetch(`${baseUrl(k)}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${k}`, "Content-Type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, data: response.ok ? unwrap<T>(body) : null };
}

/**
 * Ouvre une page de paiement SasPay (mobile money ou carte) pour un montant fixe.
 * Renvoie l'identifiant de la session et l'adresse de la page.
 */
export async function createSaspayCheckout(input: {
  paymentId: string;
  amount: number;
  country: SaspayCountry;
  email: string;
  name: string;
  returnUrl: string;
}): Promise<{ sessionId: string; checkoutUrl: string }> {
  const { status, data } = await call<{ id?: string; checkout_url?: string }>("/checkout-sessions/", {
    method: "POST",
    body: JSON.stringify({
      amount: `${input.amount}.00`,
      currency: SASPAY_COUNTRIES[input.country].currency,
      country: input.country,
      description: "Business plan AfriBiz",
      customer_email: input.email,
      customer_name: input.name,
      return_url: input.returnUrl,
      metadata: { payment_id: input.paymentId },
    }),
  });
  const url = data?.checkout_url;
  if (!data?.id || !url || !/^https:\/\//.test(url)) {
    throw new Error(`SasPay a refusé la page de paiement (${status}).`);
  }
  return { sessionId: data.id, checkoutUrl: url };
}

/** Statut d'une session, revérifié par SasPay auprès de l'opérateur à chaque appel. */
export async function getSaspayStatus(sessionId: string) {
  const { status, data } = await call<{ id?: string; status?: string; transaction_status?: string }>(
    `/checkout-sessions/${encodeURIComponent(sessionId)}/status/`,
  );
  if (status === 404) return null;
  if (status !== 200) throw new Error(`SasPay ne répond pas (${status}).`);
  return data?.id === sessionId ? data : null;
}

/** Détail d'une session : montant, devise et notre identifiant de paiement. */
export async function getSaspaySession(sessionId: string) {
  const { status, data } = await call<{ id?: string; amount?: string; currency?: string; metadata?: unknown }>(
    `/checkout-sessions/${encodeURIComponent(sessionId)}/`,
  );
  if (status !== 200) throw new Error(`SasPay ne répond pas (${status}).`);
  return data?.id === sessionId ? data : null;
}
