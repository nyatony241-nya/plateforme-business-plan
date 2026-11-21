"use server";

import { recommendLegalForm } from "@/lib/creation-guide";
import { redirect } from "next/navigation";
import { computeScenarios } from "@/engine";
import { generatePlanDocument } from "@/lib/ai/generate-plan-document";
import { DEFAULT_MODEL } from "@/lib/ai/model";
import { assumptionsSchema, toPlanInput } from "@/lib/assumptions";
import { getCountryParams } from "@/lib/data/country-params";
import { findPlanPhotos } from "@/lib/images/photos";
import {
  countMyAiRunsSince,
  getAssumptions,
  getMyProject,
  logAiRun,
  upsertPlanDocument,
} from "@/lib/data/projects";
import { getCurrentUser } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PURPOSE = "redaction_business_plan";
const DAILY_LIMIT = 10;

export async function writeBusinessPlan(projectId: string): Promise<FormState> {
  if (!UUID.test(projectId)) return { ok: false, message: "Projet introuvable." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Votre session a expiré. Reconnectez-vous." };

  const project = await getMyProject(projectId);
  if (!project) return { ok: false, message: "Projet introuvable." };

  const saved = await getAssumptions(projectId);
  const parsed = saved ? assumptionsSchema.safeParse(saved.data) : null;
  if (!parsed?.success) return { ok: false, message: "Générez d'abord le plan financier." };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if ((await countMyAiRunsSince(since, PURPOSE)) >= DAILY_LIMIT) {
    return { ok: false, message: `Limite de ${DAILY_LIMIT} rédactions sur 24 heures atteinte. Réessayez demain.` };
  }

  const country = await getCountryParams(project.country_code, { legalForm: recommendLegalForm(project).form });
  const started = Date.now();
  try {
    const results = computeScenarios(toPlanInput(parsed.data, country.params));
    const out = await generatePlanDocument(
      {
        name: project.name,
        countryName: project.country?.name ?? "Gabon",
        city: project.city?.name ?? null,
        district: project.district,
        sector: project.sector,
        idea: project.idea,
        budget: project.budget,
        mode: project.mode,
        staffing: project.staffing,
      },
      parsed.data,
      results.realiste,
    );
    const photos = await findPlanPhotos(out.document.photoQueries ?? {}, out.document.photoKeywords ?? []);
    await upsertPlanDocument(projectId, { ...out.document, photos });
    await logAiRun({
      projectId,
      purpose: PURPOSE,
      model: DEFAULT_MODEL,
      status: "succes",
      durationMs: out.durationMs,
      inputTokens: out.usage.inputTokens,
      outputTokens: out.usage.outputTokens,
    });
  } catch (error) {
    console.error("Rédaction du business plan impossible", error);
    await logAiRun({
      projectId,
      purpose: PURPOSE,
      model: DEFAULT_MODEL,
      status: "echec",
      durationMs: Date.now() - started,
      inputTokens: null,
      outputTokens: null,
    });
    return { ok: false, message: "La rédaction n'a pas abouti. Réessayez dans un instant." };
  }

  redirect(`/projets/${projectId}/business-plan`);
}
