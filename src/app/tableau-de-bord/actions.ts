"use server";

import { redirect } from "next/navigation";
import { usageFromError } from "@/lib/ai/pricing";
import { analyzeIdea, type IdeaAnalysis } from "@/lib/ai/analyze-idea";
import { DEFAULT_MODEL } from "@/lib/ai/model";
import {
  countMyAiRunsSince,
  getMyProject,
  insertProject,
  listCities,
  logAiRun,
  updateProjectContext,
} from "@/lib/data/projects";
import { isSupabaseConfigured } from "@/lib/env";
import { generateAndSavePlan, planQuotaReached } from "@/lib/generation/plan";
import { getCurrentUser } from "@/lib/supabase/server";
import { assistantProjectSchema, formDataToObject, toFieldErrors, type FormState } from "@/lib/validation";

const ANALYSIS_PURPOSE = "analyse_idee";
const ANALYSIS_DAILY_LIMIT = 30;

export type AnalysisState = { ok: boolean; idea: string; analysis?: IdeaAnalysis; message?: string };

/** Étape 1 : l'assistant lit l'idée décrite librement. */
export async function analyzeIdeaAction(_prev: AnalysisState, formData: FormData): Promise<AnalysisState> {
  const idea = String(formData.get("idea") ?? "").trim().slice(0, 2000);
  if (!isSupabaseConfigured) return { ok: false, idea, message: "La base de données n'est pas encore raccordée." };
  if (idea.length < 10) return { ok: false, idea, message: "Décrivez votre idée en une phrase au moins." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, idea, message: "Votre session a expiré. Reconnectez-vous." };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if ((await countMyAiRunsSince(since, ANALYSIS_PURPOSE)) >= ANALYSIS_DAILY_LIMIT) {
    return { ok: false, idea, message: "Limite d'analyses atteinte pour aujourd'hui. Réessayez demain." };
  }

  const cities = await listCities();
  const started = Date.now();
  try {
    const result = await analyzeIdea(idea, cities);
    await logAiRun({
      projectId: null,
      purpose: ANALYSIS_PURPOSE,
      model: DEFAULT_MODEL,
      status: "succes",
      durationMs: result.durationMs,
      usage: result.usage,
    });
    return { ok: true, idea, analysis: result.analysis };
  } catch (error) {
    console.error("Analyse de l'idée impossible", error);
    await logAiRun({
      projectId: null,
      purpose: ANALYSIS_PURPOSE,
      model: DEFAULT_MODEL,
      status: "echec",
      durationMs: Date.now() - started,
      usage: usageFromError(error),
    });
    return { ok: false, idea, message: "L'analyse n'a pas abouti. Réessayez dans un instant." };
  }
}

const FIELDS = ["idea", "name", "cityId", "district", "sector", "budget", "mode", "staffing"] as const;

/** Étape 2 : création du projet puis génération du plan financier, en un clic. */
export async function createFromAssistant(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formDataToObject(formData, FIELDS);
  if (!isSupabaseConfigured) return { ok: false, values, message: "La base de données n'est pas encore raccordée." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, values, message: "Votre session a expiré. Reconnectez-vous." };

  const parsed = assistantProjectSchema.safeParse(values);
  if (!parsed.success) return { ok: false, values, fieldErrors: toFieldErrors(parsed.error) };
  const { budget, mode, staffing, ...base } = parsed.data;

  let id: string;
  try {
    id = await insertProject(base);
  } catch {
    return { ok: false, values, message: "Le projet n'a pas pu être enregistré. Réessayez." };
  }

  // Le projet existe : ses choix sont enregistrés, puis le plan financier est produit tout de suite
  // s'il reste des générations aujourd'hui (sinon, le bouton de génération attend sur la page du projet).
  const context = { budget, mode, staffing };
  await updateProjectContext(id, context);
  const project = await getMyProject(id);
  if (project && !(await planQuotaReached())) {
    await generateAndSavePlan(project, context);
    redirect(`/projets/${id}/plan-financier`);
  }
  redirect(`/projets/${id}`);
}
