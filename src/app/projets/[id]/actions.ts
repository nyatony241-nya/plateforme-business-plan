"use server";

import { redirect } from "next/navigation";
import { getMyProject } from "@/lib/data/projects";
import { PLAN_DAILY_LIMIT, generateAndSavePlan, planQuotaReached } from "@/lib/generation/plan";
import { getCurrentUser } from "@/lib/supabase/server";
import { formDataToObject, projectContextSchema, toFieldErrors, type FormState } from "@/lib/validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generatePlan(projectId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToObject(formData, ["budget", "mode", "staffing"]);
  if (!UUID.test(projectId)) return { ok: false, values, message: "Projet introuvable." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, values, message: "Votre session a expiré. Reconnectez-vous." };

  const parsed = projectContextSchema.safeParse(values);
  if (!parsed.success) return { ok: false, values, fieldErrors: toFieldErrors(parsed.error) };

  const project = await getMyProject(projectId);
  if (!project) return { ok: false, values, message: "Projet introuvable." };

  if (await planQuotaReached()) {
    return {
      ok: false,
      values,
      message: `Vous avez atteint la limite de ${PLAN_DAILY_LIMIT} générations sur 24 heures. Réessayez demain.`,
    };
  }

  if (!(await generateAndSavePlan(project, parsed.data))) {
    return { ok: false, values, message: "La génération n'a pas abouti. Réessayez dans un instant." };
  }

  redirect(`/projets/${projectId}/plan-financier`);
}
