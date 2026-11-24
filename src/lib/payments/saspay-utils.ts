import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Règles SasPay sans appel réseau : pays, statuts, signature des webhooks.
 * Les montants FCFA (XAF et XOF) sont à parité : 4 900 FCFA valent la même chose dans les deux zones.
 */

/** Pays où l'on encaisse par SasPay (mobile money et carte), avec leur devise. */
export const SASPAY_COUNTRIES = {
  GA: { currency: "XAF", name: "Gabon" },
  CM: { currency: "XAF", name: "Cameroun" },
  CI: { currency: "XOF", name: "Côte d'Ivoire" },
  SN: { currency: "XOF", name: "Sénégal" },
  TG: { currency: "XOF", name: "Togo" },
  BJ: { currency: "XOF", name: "Bénin" },
  BF: { currency: "XOF", name: "Burkina Faso" },
  ML: { currency: "XOF", name: "Mali" },
  NE: { currency: "XOF", name: "Niger" },
} as const;

export type SaspayCountry = keyof typeof SASPAY_COUNTRIES;

export const isSaspayCountry = (code: unknown): code is SaspayCountry =>
  typeof code === "string" && Object.hasOwn(SASPAY_COUNTRIES, code);

export type PaymentOutcome = "paid" | "failed" | "pending";

/** SasPay enveloppe ses réponses dans { success, data, code } ; on accepte aussi l'objet nu. */
export function unwrap<T>(body: unknown): T | null {
  if (!body || typeof body !== "object") return null;
  const b = body as { success?: unknown; data?: unknown };
  if (b.success === false) return null;
  return ((b.data && typeof b.data === "object" ? b.data : body) as T) ?? null;
}

/**
 * Lecture d'une session de paiement relue chez SasPay : payée seulement si la session est PAID,
 * la transaction SUCCESS, et si le montant, la devise et notre identifiant de paiement concordent.
 * Une transaction échouée peut être retentée sur la même page : elle reste « en attente ».
 */
export function sessionOutcome(
  status: { status?: unknown; transaction_status?: unknown } | null,
  detail: { amount?: unknown; currency?: unknown; metadata?: unknown } | null,
  expected: { amount: number; paymentId: string },
): PaymentOutcome {
  if (!status) return "pending";
  if (status.status === "EXPIRED" || status.status === "CANCELLED") return "failed";
  if (status.status !== "PAID" || status.transaction_status !== "SUCCESS") return "pending";
  if (!detail) return "pending";
  const amount = typeof detail.amount === "string" ? Number(detail.amount) : NaN;
  const currencyOk = detail.currency === "XAF" || detail.currency === "XOF";
  const meta = detail.metadata as { payment_id?: unknown } | null | undefined;
  return currencyOk && amount === expected.amount && meta?.payment_id === expected.paymentId ? "paid" : "failed";
}

/**
 * Vérifie un webhook SasPay : HMAC-SHA256 (hex) de « timestamp.corps brut » avec le secret du webhook,
 * horodatage à moins de 5 minutes.
 */
export function verifySaspaySignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  secret: string | undefined,
  now = Date.now(),
) {
  if (!signature || !timestamp || !secret || !/^\d{9,11}$/.test(timestamp)) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const received = signature.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(received)) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
  return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
}
