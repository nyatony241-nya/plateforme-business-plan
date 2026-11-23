import "server-only";
import { creationAgencyOf } from "@/lib/data/projects";
import { usageFromError } from "@/lib/ai/pricing";
import { recommendLegalForm } from "@/lib/creation-guide";
import { computeScenarios } from "@/engine";
import { ASSUMPTIONS_MODEL, generateAssumptions } from "@/lib/ai/generate-assumptions";
import { toPlanInput } from "@/lib/assumptions";
import { getCountryParams } from "@/lib/data/country-params";
import { getCreationSummary } from "@/lib/data/creation";
import { getLocalReferences } from "@/lib/data/local-references";
import {
  countMyAiRunsSince,
  logAiRun,
  updateProjectContext,
  upsertAssumptions,
  type Project,
} from "@/lib/data/projects";
import type { ProjectContextInput } from "@/lib/validation";

export const PLAN_PURPOSE = "hypotheses_plan_financier";
/** Générations autorisées par utilisateur et par jour (maîtrise des coûts). */
export const PLAN_DAILY_LIMIT = 10;

export async function planQuotaReached() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return (await countMyAiRunsSince(since, PLAN_PURPOSE)) >= PLAN_DAILY_LIMIT;
}

/**
 * Enregistre le contexte choisi, fait proposer les hypothèses par l'IA, vérifie que le
 * moteur les calcule, puis les enregistre. Renvoie false si la génération a échoué.
 */
export async function generateAndSavePlan(project: Project, context: ProjectContextInput): Promise<boolean> {
  await updateProjectContext(project.id, context);
  const [country, references, creation] = await Promise.all([
    getCountryParams(project.country_code, { legalForm: recommendLegalForm(context).form }),
    getLocalReferences(project.country_code, project.city?.name ?? null),
    getCreationSummary({ country_code: project.country_code, staffing: context.staffing, budget: context.budget }).catch(
      () => undefined,
    ),
  ]);
  const started = Date.now();
  try {
    const result = await generateAssumptions(
      {
        name: project.name,
        countryName: project.country?.name ?? "Gabon",
        creationAgency: creationAgencyOf(project),
        city: project.city?.name ?? null,
        district: project.district,
        sector: project.sector,
        idea: project.idea,
        ...context,
      },
      country.params,
      country.provenance,
      { references, creationFee: creation?.fee ?? null, legalForm: creation?.form },
    );
    // Le moteur doit pouvoir calculer ces hypothèses avant qu'on les enregistre.
    computeScenarios(toPlanInput(result.assumptions, country.params));
    await upsertAssumptions(project.id, result.assumptions);
    await logAiRun({
      projectId: project.id,
      purpose: PLAN_PURPOSE,
      model: ASSUMPTIONS_MODEL,
      status: "succes",
      durationMs: result.durationMs,
      usage: result.usage,
    });
    return true;
  } catch (error) {
    console.error("Génération du plan impossible", error);
    await logAiRun({
      projectId: project.id,
      purpose: PLAN_PURPOSE,
      model: ASSUMPTIONS_MODEL,
      status: "echec",
      durationMs: Date.now() - started,
      usage: usageFromError(error),
    });
    return false;
  }
}
