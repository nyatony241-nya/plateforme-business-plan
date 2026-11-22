import "server-only";

const BASE_URL = "https://api.chariow.com/v1";

const apiKey = () => process.env.CHARIOW_API_KEY?.trim() || null;

/** Le paiement Chariow est-il configuré (clé API présente) ? */
export const chariowConfigured = () => apiKey() !== null;

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = apiKey();
  if (!key) throw new Error("Paiement Chariow non configuré.");
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as T | null;
  if (!response.ok || body === null) {
    const message = (body as { message?: string } | null)?.message;
    throw new Error(`Chariow a refusé la demande (${response.status})${message ? ` : ${message}` : ""}.`);
  }
  return body;
}

export type ChariowCheckout =
  | { step: "payment"; saleId: string; checkoutUrl: string }
  | { step: "completed"; saleId: string }
  | { step: "already_purchased" };

/** Ouvre une page de paiement Chariow (Mobile Money ou carte) pour un produit. */
export async function createChariowCheckout(input: {
  productId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  redirectUrl: string;
  metadata: Record<string, string>;
}): Promise<ChariowCheckout> {
  const res = await call<{
    data?: {
      step?: string;
      purchase?: { id?: string } | null;
      payment?: { checkout_url?: string } | null;
    };
  }>("/checkout", {
    method: "POST",
    body: JSON.stringify({
      product_id: input.productId,
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      phone: { number: input.phone, country_code: "GA" },
      redirect_url: input.redirectUrl,
      custom_metadata: input.metadata,
    }),
  });
  const data = res.data ?? {};
  if (data.step === "already_purchased") return { step: "already_purchased" };
  const saleId = data.purchase?.id;
  if (!saleId) throw new Error("Chariow n'a pas renvoyé de vente.");
  if (data.step === "completed") return { step: "completed", saleId };
  const checkoutUrl = data.payment?.checkout_url;
  if (!checkoutUrl || !/^https:\/\//.test(checkoutUrl)) throw new Error("Chariow n'a pas renvoyé de page de paiement.");
  return { step: "payment", saleId, checkoutUrl };
}

/** Statut d'une vente, lu directement chez Chariow (on ne se fie jamais au seul retour du navigateur). */
export async function getChariowSaleStatus(saleId: string): Promise<string | null> {
  const res = await call<{ data?: { status?: unknown } }>(`/sales/${encodeURIComponent(saleId)}`);
  return typeof res.data?.status === "string" ? res.data.status : null;
}
