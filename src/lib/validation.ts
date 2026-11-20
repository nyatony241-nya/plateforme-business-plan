import { z } from "zod";

/** Messages d'erreur en français, affichés tels quels sous les champs. */
const requis = "Ce champ est obligatoire.";

export const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Indiquez votre nom complet.")
    .max(120, "120 caractères au maximum."),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  password: z
    .string()
    .min(8, "8 caractères au minimum.")
    .max(72, "72 caractères au maximum."),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  password: z.string().min(1, requis),
});

export const newProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Donnez un nom d'au moins 3 caractères.")
    .max(120, "120 caractères au maximum."),
  cityId: z.string().uuid("Choisissez une ville."),
  district: z.string().trim().max(120, "120 caractères au maximum.").optional(),
  sector: z.string().trim().max(120, "120 caractères au maximum.").optional(),
  idea: z.string().trim().max(2000, "2 000 caractères au maximum.").optional(),
});

export type NewProjectInput = z.infer<typeof newProjectSchema>;

/** Résultat d'une action de formulaire, compatible avec useActionState. */
export type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

export const initialFormState: FormState = { ok: false };

/** Transforme les erreurs Zod en un message par champ (le premier). */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Lit un FormData en objet de chaînes, en ignorant les champs vides. */
export function formDataToObject(formData: FormData, keys: readonly string[]) {
  const values: Record<string, string> = {};
  for (const key of keys) {
    const raw = formData.get(key);
    if (typeof raw === "string" && raw.trim() !== "") values[key] = raw;
  }
  return values;
}
