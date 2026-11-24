"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCreditPacks } from "@/lib/data/credits";
import { createSaspayCheckout, saspayConfigured } from "@/lib/payments/saspay";
import { isSaspayCountry } from "@/lib/payments/saspay-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ouvre le paiement (mobile money ou carte), puis envoie vers la page de paiement SasPay. */
export async function buyCredits(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user?.email) redirect("/connexion?suite=/credits");

  const values = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  if (!isSaspayCountry(values.pays)) {
    return { ok: false, fieldErrors: { pays: "Choisissez votre pays." }, values };
  }
  const pack = (await getCreditPacks()).find((p) => p.code === values.pack);
  if (!pack) return { ok: false, message: "Choisissez une formule.", values };
  if (!saspayConfigured() || !createAdminClient()) {
    return { ok: false, message: "Le paiement en ligne n'est pas encore ouvert.", values };
  }

  const supabase = await createClient();
  const { data: paymentId, error } = await supabase.rpc("start_payment", { p_pack: pack.code, p_provider: "saspay" });
  if (error || typeof paymentId !== "string") {
    return { ok: false, message: "Impossible d'ouvrir le paiement. Réessayez dans un instant.", values };
  }

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const back = values.projet && UUID.test(values.projet) ? `&projet=${values.projet}` : "";
  const fullName = ((user.user_metadata?.full_name as string | undefined) ?? "").trim();

  let target: string;
  try {
    const checkout = await createSaspayCheckout({
      paymentId,
      amount: pack.price_xaf,
      country: values.pays,
      email: user.email,
      name: fullName || user.email.split("@")[0],
      returnUrl: `${origin}/credits/retour?paiement=${paymentId}${back}`,
    });
    await supabase.rpc("attach_payment_ref", { p_payment: paymentId, p_ref: checkout.sessionId });
    target = checkout.checkoutUrl;
  } catch (error) {
    console.error("Paiement SasPay impossible", error);
    return { ok: false, message: "Le service de paiement ne répond pas. Réessayez dans un instant.", values };
  }
  redirect(target);
}
