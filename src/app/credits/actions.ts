"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCreditPacks } from "@/lib/data/credits";
import { createChariowCheckout } from "@/lib/payments/chariow";
import { normalizeGabonPhone } from "@/lib/payments/chariow-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { toFieldErrors, type FormState } from "@/lib/validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const buyerSchema = z.object({
  pack: z.string().min(1, "Choisissez une formule."),
  prenom: z.string().trim().min(1, "Indiquez votre prénom.").max(50, "50 caractères au plus."),
  nom: z.string().trim().min(1, "Indiquez votre nom.").max(50, "50 caractères au plus."),
  telephone: z
    .string()
    .transform((v) => normalizeGabonPhone(v))
    .refine((v): v is string => v !== null, "Numéro Mobile Money invalide (ex. 077 12 34 56)."),
  projet: z.string().optional(),
});

/** Ouvre le paiement Mobile Money d'une formule, puis envoie vers la page de paiement Chariow. */
export async function buyCredits(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user?.email) redirect("/connexion?suite=/credits");

  const values = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const parsed = buyerSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: toFieldErrors(parsed.error), values };
  const input = parsed.data;

  const pack = (await getCreditPacks()).find((p) => p.code === input.pack);
  const admin = createAdminClient();
  if (!pack?.chariow_product_id || !admin) {
    return { ok: false, message: "Le paiement en ligne n'est pas encore ouvert pour cette formule.", values };
  }

  const supabase = await createClient();
  const { data: paymentId, error } = await supabase.rpc("start_payment", { p_pack: pack.code, p_provider: "chariow" });
  if (error || typeof paymentId !== "string") {
    return { ok: false, message: "Impossible d'ouvrir le paiement. Réessayez dans un instant.", values };
  }

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const back = input.projet && UUID.test(input.projet) ? `&projet=${input.projet}` : "";

  let target: string;
  try {
    const checkout = await createChariowCheckout({
      productId: pack.chariow_product_id,
      email: user.email,
      firstName: input.prenom,
      lastName: input.nom,
      phone: input.telephone,
      redirectUrl: `${origin}/credits/retour?paiement=${paymentId}${back}`,
      metadata: { payment_id: paymentId, pack: pack.code },
    });
    if (checkout.step === "already_purchased") {
      return {
        ok: false,
        message: "Chariow indique que cette formule a déjà été achetée avec votre adresse e-mail. Contactez-nous.",
        values,
      };
    }
    await admin.rpc("attach_payment_ref", { p_payment: paymentId, p_ref: checkout.saleId });
    target = checkout.step === "completed" ? `/credits/retour?paiement=${paymentId}${back}` : checkout.checkoutUrl;
  } catch (error) {
    console.error("Paiement Chariow impossible", error);
    return { ok: false, message: "Le service de paiement ne répond pas. Réessayez dans un instant.", values };
  }
  redirect(target);
}
