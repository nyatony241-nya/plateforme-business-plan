import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Vérifie la signature d'un Pulse Chariow : HMAC-SHA256 du corps brut avec le secret du Pulse
 * (whsec_…), envoyé dans l'en-tête x-chariow-signature sous la forme « sha256=<hex> ».
 */
export function verifyChariowSignature(rawBody: string, header: string | null, secret: string | undefined) {
  if (!header || !secret) return false;
  const received = header.trim().replace(/^sha256=/i, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(received)) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
}

/** Numéro Mobile Money en chiffres seuls, sans indicatif +241 (Chariow le demande à part). */
export function normalizeGabonPhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00241")) digits = digits.slice(5);
  else if (digits.startsWith("241") && digits.length > 9) digits = digits.slice(3);
  return digits.length >= 8 && digits.length <= 9 ? digits : null;
}

/** Statuts de vente que l'on considère comme payés (Chariow ne publie pas la liste exacte). */
export function isPaidStatus(status: unknown) {
  return typeof status === "string" && ["completed", "successful", "success", "paid", "settled"].includes(status.toLowerCase());
}
