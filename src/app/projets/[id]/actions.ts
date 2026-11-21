"use server";

import { redirect } from "next/navigation";
import { computeScenarios } from "@/engine";
import { ASSUMPTIONS_MODEL, generateAssumptions } from "@/lib/ai/generate-assumptions";
import { toPlanInput } from "@/lib/assumptions";
import { getCountryParams } from "@/lib/data/country-params";
import {
  countMyAiRunsSince,
  getMyProject,
  logAiRun,
  updateProjectContext,
  upsertAssumptions,
} from "@/lib/data/projects";
import { getCurrentUser } from "@/lib/supabase/server";
import { formDataToObject, projectContextSchema, toFieldErrors, type FormState } from "@/lib/validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PURPOSE = "hypotheses_plan_financier";
/** Générations autorisées par utilisateur et par jour (maîtrise des coûts). */
const DAILY_LIMIT = 10;

export async function generatePlan(projectId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToObject(formData, ["budget", "mode", "staffing"]);
  if (!UUID.test(projectId)) return { ok: false, values, message: "Projet introuvable." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, values, message: "Votre session a expiré. Reconnectez-vous." };

  const parsed = projectContextSchema.safeParse(values);
  if (!parsed.success) return { ok: false, values, fieldErrors: toFieldErrors(parsed.error) };

  const project = await getMyProject(projectId);
  if (!project) return { ok: false, values, message: "Projet introuvable." };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if ((await countMyAiRunsSince(since, PURPOSE)) >= DAILY_LIMIT) {
    return {
      ok: false,
      values,
      message: `Vous avez atteint la limite de ${DAILY_LIMIT} générations sur 24 heures. Réessayez demain.`,
    };
  }

  await updateProjectContext(projectId, parsed.data);
  const country = await getCountryParams(project.country_code);
  const started = Date.now();

  try {
    const result = await generateAssumptions(
      {
        name: project.name,
        countryName: project.country?.name ?? "Gabon",
        city: project.city?.name ?? null,
        district: project.district,
        sector: project.sector,
        idea: project.idea,
        ...parsed.data,
      },
      country.params,
      country.provenance,
    );
    // Le moteur doit pouvoir calculer ces hypothèses avant qu'on les enregistre.
    computeScenarios(toPlanInput(result.assumptions, country.params));
    await upsertAssumptions(projectId, result.assumptions);
    await logAiRun({
      projectId,
      purpose: PURPOSE,
      model: ASSUMPTIONS_MODEL,
      status: "succes",
      durationMs: result.durationMs,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    });
  } catch (error) {
    console.error("Génération du plan impossible", error);
    await logAiRun({
      projectId,
      purpose: PURPOSE,
      model: ASSUMPTIONS_MODEL,
      status: "echec",
      durationMs: Date.now() - started,
      inputTokens: null,
      outputTokens: null,
    });
    return { ok: false, values, message: "La génération n'a pas abouti. Réessayez dans un instant." };
  }

  redirect(`/projets/${projectId}/plan-financier`);
}
