"use server";

import { redirect } from "next/navigation";
import { insertProject } from "@/lib/data/projects";
import { isSupabaseConfigured } from "@/lib/env";
import {
  formDataToObject,
  newProjectSchema,
  toFieldErrors,
  type FormState,
} from "@/lib/validation";

const FIELDS = ["name", "cityId", "district", "sector", "idea"] as const;

export async function createProject(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "La base de données n'est pas encore raccordée." };
  }

  const values = formDataToObject(formData, FIELDS);
  const parsed = newProjectSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: toFieldErrors(parsed.error), values };

  let id: string;
  try {
    id = await insertProject(parsed.data);
  } catch {
    return { ok: false, values, message: "Le projet n'a pas pu être enregistré. Réessayez." };
  }
  redirect(`/projets/${id}`);
}
