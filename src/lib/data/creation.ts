import "server-only";
import {
  LEGAL_FORM_LABEL,
  procedureDetailsSchema,
  recommendLegalForm,
  procedureStepsSchema,
  type LegalForm,
  type ProcedureDetails,
  type ProcedureSteps,
} from "@/lib/creation-guide";
import { createClient } from "@/lib/supabase/server";

export type SourceRef = { id: string; title: string; url: string | null; publisher: string | null; accessedAt: string };

export type Procedure = {
  legalForm: LegalForm;
  title: string;
  summary: string | null;
  steps: ProcedureSteps;
  details: ProcedureDetails;
  verifiedAt: string;
  expiresAt: string;
  source: SourceRef;
};

export type Institution = {
  name: string;
  acronym: string | null;
  role: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
  verifiedAt: string;
  source: SourceRef;
};

type SourceRow = { id: string; title: string; url: string | null; publisher: string | null; accessed_at: string };
const toSource = (s: SourceRow | null): SourceRef =>
  s
    ? { id: s.id, title: s.title, url: s.url, publisher: s.publisher, accessedAt: s.accessed_at }
    : { id: "", title: "Source inconnue", url: null, publisher: null, accessedAt: "" };

const SOURCE_COLUMNS = "id, title, url, publisher, accessed_at";

/** Démarches de création, guichet unique et sources citées, pour un pays. */
export async function getCreationGuide(countryCode = "GA") {
  const supabase = await createClient();
  const [proc, inst] = await Promise.all([
    supabase
      .from("procedures")
      .select(`title, legal_form, summary, steps, details, verified_at, expires_at, source:sources(${SOURCE_COLUMNS})`)
      .eq("country_code", countryCode)
      .order("sort_order")
      .returns<
        {
          title: string;
          legal_form: string;
          summary: string | null;
          steps: unknown;
          details: unknown;
          verified_at: string;
          expires_at: string;
          source: SourceRow | null;
        }[]
      >(),
    supabase
      .from("institutions")
      .select(
        `name, acronym, role, address, phone, website, opening_hours, verified_at, source:sources(${SOURCE_COLUMNS})`,
      )
      .eq("country_code", countryCode)
      .ilike("acronym", "ANPI%")
      .limit(1)
      .returns<
        {
          name: string;
          acronym: string | null;
          role: string;
          address: string | null;
          phone: string | null;
          website: string | null;
          opening_hours: string | null;
          verified_at: string;
          source: SourceRow | null;
        }[]
      >(),
  ]);
  if (proc.error) throw new Error(`Lecture des démarches impossible : ${proc.error.message}`);
  if (inst.error) throw new Error(`Lecture du guichet impossible : ${inst.error.message}`);

  const procedures: Procedure[] = (proc.data ?? []).flatMap((row) => {
    const steps = procedureStepsSchema.safeParse(row.steps);
    const details = procedureDetailsSchema.safeParse(row.details);
    if (!steps.success || !details.success || (row.legal_form !== "EI" && row.legal_form !== "SOCIETE")) return [];
    return [
      {
        legalForm: row.legal_form,
        title: row.title,
        summary: row.summary,
        steps: steps.data,
        details: details.data,
        verifiedAt: row.verified_at,
        expiresAt: row.expires_at,
        source: toSource(row.source),
      },
    ];
  });

  // Sources citées par les frais et les délais (référencées par identifiant).
  const ids = [
    ...new Set(
      procedures.flatMap((p) => [
        ...p.details.frais.map((f) => f.source_id),
        p.details.delai?.source_id,
      ]),
    ),
  ].filter((id): id is string => Boolean(id));
  const sources = new Map<string, SourceRef>();
  if (ids.length > 0) {
    const { data, error } = await supabase.from("sources").select(SOURCE_COLUMNS).in("id", ids).returns<SourceRow[]>();
    if (error) throw new Error(`Lecture des sources impossible : ${error.message}`);
    for (const s of data ?? []) sources.set(s.id, toSource(s));
  }

  const row = inst.data?.[0];
  const institution: Institution | null = row
    ? {
        name: row.name,
        acronym: row.acronym,
        role: row.role,
        address: row.address,
        phone: row.phone,
        website: row.website,
        openingHours: row.opening_hours,
        verifiedAt: row.verified_at,
        source: toSource(row.source),
      }
    : null;

  return { procedures, institution, sources };
}

/** Résumé des démarches pour le business plan : forme conseillée, frais, délai, guichet. */
export async function getCreationSummary(project: {
  country_code: string;
  staffing: "seul" | "recruter" | null;
  budget: number | null;
}) {
  const guide = await getCreationGuide(project.country_code);
  const { form } = recommendLegalForm({ staffing: project.staffing, budget: project.budget });
  const procedure = guide.procedures.find((p) => p.legalForm === form);
  if (!procedure) return undefined;
  const phone = guide.institution?.phone?.match(/\+241[\d\s]{8,14}\d/)?.[0]?.replace(/\s+/g, " ") ?? null;
  return {
    form: LEGAL_FORM_LABEL[form],
    fee: procedure.details.frais.find((f) => f.libelle === "Création")?.gabonais ?? null,
    delay: procedure.details.delai?.texte ?? null,
    website: guide.institution?.website ?? null,
    phone,
  };
}
