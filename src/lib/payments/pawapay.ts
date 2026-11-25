import "server-only";
import { PAWAPAY_COUNTRIES, type PawapayCountry } from "@/lib/payments/pawapay-utils";

/** Bac à sable par défaut ; PAWAPAY_ENV=production pour encaisser pour de vrai. */
const baseUrl = () =>
  process.env.PAWAPAY_ENV?.trim() === "production" ? "https://api.pawapay.io" : "https://api.sandbox.pawapay.io";

const token = () => process.env.PAWAPAY_API_TOKEN?.trim() || null;

/** Le paiement pawaPay est-il configuré (jeton présent) ? */
export const pawapayConfigured = () => token() !== null;

async function call<T>(path: string, init: RequestInit = {}): Promise<{ status: number; body: T | null }> {
  const key = token();
  if (!key) throw new Error("Paiement pawaPay non configuré.");
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as T | null;
  return { status: response.status, body };
}

/**
 * Ouvre la page de paiement pawaPay pour un montant fixe. Le client y choisit son opérateur
 * et valide sur son téléphone. `depositId` est l'identifiant de notre paiement (UUID).
 */
export async function createPawapayPage(input: {
  depositId: string;
  amount: number;
  country: PawapayCountry;
  returnUrl: string;
}): Promise<string> {
  const c = PAWAPAY_COUNTRIES[input.country];
  const { status, body } = await call<{ redirectUrl?: string; status?: string; failureReason?: { failureCode?: string } }>(
    "/v2/paymentpage",
    {
      method: "POST",
      body: JSON.stringify({
        depositId: input.depositId,
        returnUrl: input.returnUrl,
        customerMessage: "AfriBiz business plan",
        amountDetails: { amount: String(input.amount), currency: c.currency },
        language: "FR",
        country: c.iso3,
        reason: "Business plan AfriBiz",
      }),
    },
  );
  const url = body?.redirectUrl;
  if (status !== 200 || body?.status === "REJECTED" || !url || !/^https:\/\//.test(url)) {
    throw new Error(`pawaPay a refusé la page de paiement (${status} ${body?.failureReason?.failureCode ?? ""}).`);
  }
  return url;
}

/** Dépôt relu directement chez pawaPay (on ne se fie jamais au seul navigateur ni au seul callback). */
export async function getPawapayDeposit(depositId: string) {
  const { status, body } = await call<{
    status?: string;
    data?: { depositId?: string; status?: string; amount?: string; currency?: string };
  }>(`/v2/deposits/${encodeURIComponent(depositId)}`);
  if (status !== 200) throw new Error(`pawaPay ne répond pas (${status}).`);
  if (body?.status !== "FOUND" || body.data?.depositId !== depositId) return null;
  return body.data;
}
