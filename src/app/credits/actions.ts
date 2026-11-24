"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCreditPacks } from "@/lib/data/credits";
import { createPawapayPage, pawapayConfigured } from "@/lib/payments/pawapay";
import { isPawapayCountry } from "@/lib/payments/pawapay-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ouvre le paiement mobile money, puis envoie vers la page de paiement pawaPay. */
export async function buyCredits(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?suite=/credits");

  const values = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  if (!isPawapayCountry(values.pays)) {
    return { ok: false, fieldErrors: { pays: "Choisissez le pays de votre compte mobile money." }, values };
  }
  const pack = (await getCreditPacks()).find((p) => p.code === values.pack);
  if (!pack) return { ok: false, message: "Choisissez une formule.", values };
  if (!pawapayConfigured() || !createAdminClient()) {
    return { ok: false, message: "Le paiement en ligne n'est pas encore ouvert.", values };
  }

  const supabase = await createClient();
  const { data: paymentId, error } = await supabase.rpc("start_payment", { p_pack: pack.code, p_provider: "pawapay" });
  if (error || typeof paymentId !== "string") {
    return { ok: false, message: "Impossible d'ouvrir le paiement. Réessayez dans un instant.", values };
  }

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const back = values.projet && UUID.test(values.projet) ? `&projet=${values.projet}` : "";

  let target: string;
  try {
    // Notre identifiant de paiement sert d'identifiant de dépôt chez pawaPay.
    target = await createPawapayPage({
      depositId: paymentId,
      amount: pack.price_xaf,
      country: values.pays,
      returnUrl: `${origin}/credits/retour?paiement=${paymentId}${back}`,
    });
    await supabase.rpc("attach_payment_ref", { p_payment: paymentId, p_ref: paymentId });
  } catch (error) {
    console.error("Paiement pawaPay impossible", error);
    return { ok: false, message: "Le service de paiement ne répond pas. Réessayez dans un instant.", values };
  }
  redirect(target);
}
