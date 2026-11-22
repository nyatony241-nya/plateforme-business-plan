"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdmin } from "@/lib/data/admin";
import { createClient } from "@/lib/supabase/server";
import { toFieldErrors, type FormState } from "@/lib/validation";

const packSchema = z.object({
  code: z.string().min(1),
  price_xaf: z.coerce.number().int("Nombre entier.").min(500, "500 FCFA au moins.").max(1_000_000, "Trop élevé."),
  credits: z.coerce.number().int("Nombre entier.").min(1, "1 crédit au moins.").max(100, "100 crédits au plus."),
  chariow_product_id: z
    .string()
    .trim()
    .max(64)
    .refine((v) => v === "" || /^[A-Za-z0-9_-]+$/.test(v), "Identifiant invalide."),
  active: z.enum(["on"]).optional(),
});

/** Modifie le prix, le nombre de crédits ou l'identifiant Chariow d'une formule. */
export async function updatePack(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdmin())) return { ok: false, message: "Accès réservé." };
  const values = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const parsed = packSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: toFieldErrors(parsed.error), values };
  const p = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("credit_packs")
    .update({
      price_xaf: p.price_xaf,
      credits: p.credits,
      chariow_product_id: p.chariow_product_id || null,
      active: p.active === "on",
    })
    .eq("code", p.code);
  if (error) return { ok: false, message: "Enregistrement impossible.", values };
  revalidatePath("/admin");
  revalidatePath("/credits");
  return { ok: true, message: "Formule enregistrée." };
}

const grantSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide."),
  amount: z.coerce.number().int("Nombre entier.").min(1, "1 crédit au moins.").max(100, "100 crédits au plus."),
  note: z.string().trim().max(200).optional(),
});

/** Offre des crédits à un compte (testeurs de la bêta). */
export async function grantCredits(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdmin())) return { ok: false, message: "Accès réservé." };
  const values = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const parsed = grantSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: toFieldErrors(parsed.error), values };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_grant_credits", {
    p_email: parsed.data.email,
    p_amount: parsed.data.amount,
    p_note: parsed.data.note ?? "",
  });
  if (error) {
    const known = /Aucun compte|Entre 1 et 100/.exec(error.message)?.[0];
    return { ok: false, message: known ? `${known}.` : "Opération impossible.", values };
  }
  revalidatePath("/admin");
  return { ok: true, message: `${parsed.data.amount} crédit(s) offert(s). Nouveau solde : ${data}.` };
}
