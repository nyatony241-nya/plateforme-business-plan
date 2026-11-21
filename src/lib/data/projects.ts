import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { NewProjectInput } from "@/lib/validation";

export type City = { id: string; name: string; region: string | null };

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
};

const SUMMARY_COLUMNS =
  "id, name, sector, district, status, created_at, updated_at, city:cities(name)";

/** Villes ouvertes du pays pilote, dans l'ordre alphabétique. */
export async function listPilotCities(countryCode = "GA"): Promise<City[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cities")
    .select("id, name, region")
    .eq("country_code", countryCode)
    .eq("is_pilot", true)
    .order("name");
  if (error) throw new Error(`Lecture des villes impossible : ${error.message}`);
  return data ?? [];
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
    .select(`${SUMMARY_COLUMNS}, idea, country_code`)
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
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: input.name,
      city_id: input.cityId,
      district: input.district ?? null,
      sector: input.sector ?? null,
      idea: input.idea ?? null,
      country_code: "GA",
    })
    .select("id")
    .single();
  if (error) throw new Error(`Création du projet impossible : ${error.message}`);
  return data.id as string;
}
