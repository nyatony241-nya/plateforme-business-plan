import { computeScenarios } from "@/engine";
import { assumptionsSchema, toPlanInput } from "@/lib/assumptions";
import { planDocumentSchema } from "@/lib/business-plan";
import { getCountryParams } from "@/lib/data/country-params";
import { getCreationSummary } from "@/lib/data/creation";
import { getAssumptions, getMyProject, getPlanDocument } from "@/lib/data/projects";
import { getCurrentUser } from "@/lib/supabase/server";
import { businessPlanDocx } from "@/lib/word/business-plan-docx";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Nom de fichier sans accents ni caractères spéciaux. */
function fileName(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 60);
  return `business-plan-${slug || "projet"}.docx`;
}

export async function GET(_request: Request, ctx: RouteContext<"/projets/[id]/business-plan/word">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response("Projet introuvable.", { status: 404 });

  const user = await getCurrentUser();
  if (!user) return new Response("Connexion requise.", { status: 401 });

  const project = await getMyProject(id);
  if (!project) return new Response("Projet introuvable.", { status: 404 });

  const [savedAssumptions, savedDocument, country] = await Promise.all([
    getAssumptions(id),
    getPlanDocument(id),
    getCountryParams(project.country_code),
  ]);
  const creation = await getCreationSummary(project).catch(() => undefined);
  const assumptions = savedAssumptions ? assumptionsSchema.safeParse(savedAssumptions.data) : null;
  const doc = savedDocument ? planDocumentSchema.safeParse(savedDocument.data) : null;
  if (!assumptions?.success || !doc?.success) {
    return new Response("Le business plan n'est pas encore rédigé.", { status: 404 });
  }

  const buffer = await businessPlanDocx({
    doc: doc.data,
    a: assumptions.data,
    results: computeScenarios(toPlanInput(assumptions.data, country.params)),
    project: {
      name: project.name,
      sector: project.sector,
      district: project.district,
      city: project.city?.name ?? null,
      country: project.country?.name ?? "Gabon",
    },
    minimumWage: country.provenance.find((p) => p.code === "revenu_minimum_mensuel")?.value ?? 150_000,
    creation,
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName(project.name)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
