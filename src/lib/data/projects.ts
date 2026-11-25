import { aiCostUsd, type AiUsage } from "@/lib/ai/pricing";
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { NewProjectInput, ProjectContextInput } from "@/lib/validation";

export type City = {
  id: string;
  name: string;
  region: string | null;
  countryCode: string;
  countryName: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  sector: string | null;
  district: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  city: { name: string } | null;
};

export type Project = ProjectSummary & {
  idea: string | null;
  country_code: string;
  budget: number | null;
  mode: "local" | "en_ligne" | "mixte" | null;
  staffing: "seul" | "recruter" | null;
  plan_design: string;
  country: { name: string; creation_agency: string | null; creation_agency_url: string | null } | null;
};

/** Organisme de création d'entreprise du pays du projet, pour les textes (« auprès de … »). */
export function creationAgencyOf(project: Pick<Project, "country">): string {
  return project.country?.creation_agency ?? "le guichet unique de création d'entreprise";
}

const SUMMARY_COLUMNS =
  "id, name, sector, district, status, created_at, updated_at, city:cities(name)";

/** Villes proposées : celles des pays ouverts, pays par pays (Gabon d'abord), puis par ordre alphabétique. */
export async function listCities(): Promise<City[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cities")
    .select("id, name, region, country_code, country:countries!inner(name, priority, is_active)")
    .eq("is_pilot", true)
    .eq("country.is_active", true);
  if (error) throw new Error(`Lecture des villes impossible : ${error.message}`);
  type Row = {
    id: string;
    name: string;
    region: string | null;
    country_code: string;
    country: { name: string; priority: number | null };
  };
  return ((data ?? []) as unknown as Row[])
    .sort(
      (a, b) =>
        (a.country.priority ?? 99) - (b.country.priority ?? 99) || a.name.localeCompare(b.name, "fr"),
    )
    .map((r) => ({
      id: r.id,
      name: r.name,
      region: r.region,
      countryCode: r.country_code,
      countryName: r.country.name,
    }));
}

/** Projets de l'utilisateur connecté (la sécurité au niveau des lignes filtre le reste). */
export async function listMyProjects(): Promise<ProjectSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(SUMMARY_COLUMNS)
    .order("updated_at", { ascending: false })
    .returns<ProjectSummary[]>();
  if (error) throw new Error(`Lecture des projets impossible : ${error.message}`);
  return data ?? [];
}

export async function getMyProject(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      `${SUMMARY_COLUMNS}, idea, country_code, budget, mode, staffing, plan_design, country:countries(name, creation_agency, creation_agency_url)`,
    )
    .eq("id", id)
    .maybeSingle<Project>();
  if (error) throw new Error(`Lecture du projet impossible : ${error.message}`);
  return data;
}

/** Hypothèses financières enregistrées du projet, ou null si aucune saisie. */
export async function getAssumptions(projectId: string): Promise<{ data: unknown; updatedAt: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_assumptions")
    .select("data, updated_at")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw new Error(`Lecture des hypothèses impossible : ${error.message}`);
  return data ? { data: data.data, updatedAt: data.updated_at as string } : null;
}

/** Enregistre les hypothèses ; la sécurité au niveau des lignes vérifie le propriétaire. */
export async function upsertAssumptions(projectId: string, data: unknown): Promise<string> {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("project_assumptions")
    .upsert({ project_id: projectId, schema_version: 1, data }, { onConflict: "project_id" })
    .select("updated_at")
    .single();
  if (error) throw new Error(`Enregistrement des hypothèses impossible : ${error.message}`);
  return row.updated_at as string;
}

export async function insertProject(input: NewProjectInput): Promise<string> {
  const supabase = await createClient();
  const { data: city, error: cityError } = await supabase
    .from("cities")
    .select("country_code")
    .eq("id", input.cityId)
    .single();
  if (cityError || !city) throw new Error("Ville inconnue.");
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: input.name,
      city_id: input.cityId,
      district: input.district ?? null,
      sector: input.sector ?? null,
      idea: input.idea ?? null,
      country_code: city.country_code as string,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Création du projet impossible : ${error.message}`);
  return data.id as string;
}

/** Trace un appel à l'IA (coût et durée suivis par utilisateur). Ne bloque jamais l'utilisateur. */
export async function logAiRun(run: {
  projectId: string | null;
  purpose: string;
  model: string;
  status: "succes" | "echec";
  durationMs: number;
  usage: AiUsage;
  /** Coût connu directement (images facturées à l'unité). */
  costUsd?: number | null;
}) {
  try {
    const supabase = await createClient();
    await supabase.from("ai_runs").insert({
      project_id: run.projectId,
      purpose: run.purpose,
      model: run.model,
      status: run.status,
      duration_ms: run.durationMs,
      input_tokens: run.usage.inputTokens,
      output_tokens: run.usage.outputTokens,
      reasoning_tokens: run.usage.reasoningTokens,
      cached_input_tokens: run.usage.cachedInputTokens,
      cost_usd: run.costUsd ?? aiCostUsd(run.model, run.usage),
    });
  } catch {
    // Le journal ne doit pas faire échouer la génération.
  }
}

/** Enregistre le budget, le lieu de vente et l'organisation choisis. */
export async function updateProjectContext(projectId: string, input: ProjectContextInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ budget: input.budget, mode: input.mode, staffing: input.staffing })
    .eq("id", projectId);
  if (error) throw new Error(`Mise à jour du projet impossible : ${error.message}`);
}

/** Nombre de générations lancées par l'utilisateur depuis une date. */
export async function countMyAiRunsSince(since: Date, purpose: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("ai_runs")
    .select("id", { count: "exact", head: true })
    .eq("purpose", purpose)
    .gte("created_at", since.toISOString());
  if (error) throw new Error(`Lecture du journal impossible : ${error.message}`);
  return count ?? 0;
}

/** Business plan rédigé du projet (null s'il n'a pas encore été rédigé). */
export async function getPlanDocument(projectId: string): Promise<{ data: unknown; updatedAt: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_plans")
    .select("data, updated_at")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw new Error(`Lecture du business plan impossible : ${error.message}`);
  return data ? { data: data.data, updatedAt: data.updated_at as string } : null;
}

export async function upsertPlanDocument(projectId: string, data: unknown) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("business_plans")
    .upsert(
      { project_id: projectId, schema_version: 1, data, updated_at: new Date().toISOString() },
      { onConflict: "project_id" },
    );
  if (error) throw new Error(`Enregistrement du business plan impossible : ${error.message}`);
}
