"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  formDataToObject,
  signInSchema,
  signUpSchema,
  toFieldErrors,
  type FormState,
} from "@/lib/validation";

const NOT_CONFIGURED: FormState = {
  ok: false,
  message: "La base de données n'est pas encore raccordée. Réessayez un peu plus tard.",
};

/** N'accepte qu'un chemin interne, pour éviter toute redirection vers un autre site. */
function safeNext(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/tableau-de-bord";
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const values = formDataToObject(formData, ["fullName", "email"]);
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: toFieldErrors(parsed.error), values };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/callback?suite=/tableau-de-bord`,
    },
  });

  if (error) {
    const alreadyUsed = /already|registered|exists/i.test(error.message);
    return {
      ok: false,
      values,
      message: alreadyUsed
        ? "Un compte existe déjà avec cette adresse. Connectez-vous."
        : "L'inscription n'a pas abouti. Vérifiez vos informations et réessayez.",
    };
  }

  // Confirmation par e-mail désactivée : la session est ouverte tout de suite.
  if (data.session) redirect("/tableau-de-bord");

  return {
    ok: true,
    message: `Presque fini : ouvrez l'e-mail envoyé à ${parsed.data.email} pour confirmer votre compte.`,
  };
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const values = formDataToObject(formData, ["email"]);
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: toFieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const unconfirmed = /confirm/i.test(error.message);
    return {
      ok: false,
      values,
      message: unconfirmed
        ? "Confirmez d'abord votre adresse e-mail grâce au lien reçu."
        : "E-mail ou mot de passe incorrect.",
    };
  }

  redirect(safeNext(formData.get("suite")));
}
