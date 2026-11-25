"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { computeScenarios } from "@/engine";
import type { ProjectContext } from "@/lib/ai/generate-assumptions";
import { generatePlanDocument, generatePlanPreview, generatePlanRest } from "@/lib/ai/generate-plan-document";
import { DEFAULT_MODEL } from "@/lib/ai/model";
import { EMPTY_USAGE, usageFromError, type AiUsage } from "@/lib/ai/pricing";
import { assumptionsSchema, toPlanInput } from "@/lib/assumptions";
import { isCompleteDocument, planDocumentSchema, type PlanDocument, type PhotoSlot } from "@/lib/business-plan";
import { recommendLegalForm } from "@/lib/creation-guide";
import { getCountryParams } from "@/lib/data/country-params";
import { dailyLimit, isPlanUnlocked, unlockPlan } from "@/lib/data/credits";
import {
  countMyAiRunsSince,
  creationAgencyOf,
  getAssumptions,
  getMyProject,
  getPlanDocument,
  logAiRun,
  upsertPlanDocument,
  type Project,
} from "@/lib/data/projects";
import { IMAGE_COST_USD, IMAGE_MODEL, aiImagesEnabled, createAiCover } from "@/lib/images/ai-image";
import { findPlanPhotos, reportDownload } from "@/lib/images/photos";
import { isPlanDesignId } from "@/lib/plan-designs";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PURPOSE = "redaction_business_plan";
const REST_PURPOSE = "redaction_suite";
/** Rédactions sur 24 h : 10 pour un compte qui a déjà payé, 3 sinon (aperçus gratuits). */
const WRITE_LIMITS = { paid: 10, free: 3 };

/** Photos de l'aperçu : couverture (illustration IA) et projet ; les autres attendent le paiement. */
const REST_SLOTS: PhotoSlot[] = ["marche", "marketing"];

const contextOf = (project: Project): ProjectContext => ({
  name: project.name,
  countryName: project.country?.name ?? "Gabon",
  creationAgency: creationAgencyOf(project),
  city: project.city?.name ?? null,
  district: project.district,
  sector: project.sector,
  idea: project.idea,
  budget: project.budget,
  mode: project.mode,
  staffing: project.staffing,
});

/** Cherche les photos des sections demandées, en évitant celles déjà retenues. */
async function photosFor(doc: PlanDocument, project: Project, slots: PhotoSlot[]) {
  const queries = Object.fromEntries(slots.map((slot) => [slot, doc.photoQueries?.[slot] ?? ""]));
  const found = await findPlanPhotos(queries, {
    keywords: doc.photoKeywords ?? [],
    category: doc.photoCategory,
    trade: doc.photoTrade ?? [],
    online: project.mode === "en_ligne" || project.mode === "mixte",
    exclude: Object.values(doc.photos ?? {}).map((p) => String(p.id)),
  });
  // Unsplash demande de signaler chaque photo utilisée.
  await Promise.all(Object.values(found).map((photo) => reportDownload(photo)));
  return found;
}

/**
 * Couverture créée par IA pour ce projet (nom du commerce visible). En cas d'échec,
 * la couverture reste une photo libre de droit : le plan n'est jamais bloqué par l'image.
 */
async function aiCoverFor(projectId: string, doc: PlanDocument, project: Project) {
  if (!aiImagesEnabled()) return null;
  const started = Date.now();
  const model = `google/${IMAGE_MODEL}`;
  try {
    const photo = await createAiCover(projectId, {
      name: project.name,
      sector: project.sector ?? "",
      idea: project.idea ?? "",
      city: project.city?.name ?? null,
      country: project.country?.name ?? "Gabon",
      scene: doc.photoQueries?.couverture,
      keywords: doc.photoKeywords,
      online: project.mode === "en_ligne",
    });
    await logAiRun({ projectId, purpose: "image_couverture", model, status: "succes", durationMs: Date.now() - started, usage: EMPTY_USAGE, costUsd: IMAGE_COST_USD });
    return photo;
  } catch (error) {
    console.error("Illustration IA impossible", error);
    await logAiRun({ projectId, purpose: "image_couverture", model, status: "echec", durationMs: Date.now() - started, usage: EMPTY_USAGE, costUsd: null });
    return null;
  }
}

/** Couverture IA déjà créée pour ce projet, tant que son nom n'a pas changé : pas de nouvelle dépense. */
async function existingAiCover(projectId: string, project: Project) {
  const saved = await getPlanDocument(projectId);
  const parsed = saved ? planDocumentSchema.safeParse(saved.data) : null;
  const cover = parsed?.success ? parsed.data.photos?.couverture : undefined;
  return cover?.source === "ia" && cover.alt.startsWith(`Illustration de ${project.name},`) ? cover : null;
}

async function loadInputs(projectId: string) {
  const project = await getMyProject(projectId);
  if (!project) return { error: "Projet introuvable." } as const;
  const saved = await getAssumptions(projectId);
  const parsed = saved ? assumptionsSchema.safeParse(saved.data) : null;
  if (!parsed?.success) return { error: "Générez d'abord le plan financier." } as const;
  const country = await getCountryParams(project.country_code, { legalForm: recommendLegalForm(project).form });
  return { project, a: parsed.data, params: country.params } as const;
}

async function logRun(projectId: string, purpose: string, status: "succes" | "echec", durationMs: number, usage: AiUsage) {
  await logAiRun({ projectId, purpose, model: DEFAULT_MODEL, status, durationMs, usage });
}

/**
 * Rédige le business plan. Plan débloqué : tout le document. Sinon : l'aperçu seulement
 * (résumé, projet), pour ne pas payer l'IA si le client n'achète pas.
 */
export async function writeBusinessPlan(projectId: string): Promise<FormState> {
  if (!UUID.test(projectId)) return { ok: false, message: "Projet introuvable." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Votre session a expiré. Reconnectez-vous." };

  const inputs = await loadInputs(projectId);
  if ("error" in inputs) return { ok: false, message: inputs.error };
  const { project, a, params } = inputs;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const limit = await dailyLimit(WRITE_LIMITS);
  if ((await countMyAiRunsSince(since, PURPOSE)) >= limit) {
    return { ok: false, message: `Limite de ${limit} rédactions sur 24 heures atteinte. Réessayez demain.` };
  }

  const full = await isPlanUnlocked(projectId);
  const started = Date.now();
  try {
    const realiste = computeScenarios(toPlanInput(a, params)).realiste;
    const out = full
      ? await generatePlanDocument(contextOf(project), a, realiste)
      : await generatePlanPreview(contextOf(project), a, realiste);
    const fresh = { ...out.document, photos: {} };
    const others: PhotoSlot[] = full ? ["projet", ...REST_SLOTS] : ["projet"];
    // Couverture IA : après paiement seulement (sauf AI_COVER_IN_PREVIEW=on), et réutilisée si elle existe déjà.
    const wantAi = full || process.env.AI_COVER_IN_PREVIEW?.trim() === "on";
    const reusable = wantAi ? await existingAiCover(projectId, project) : null;
    const [cover, photos] = await Promise.all([
      reusable ?? (wantAi ? aiCoverFor(projectId, fresh, project) : null),
      photosFor(fresh, project, others),
    ]);
    const couverture = cover ?? (await photosFor({ ...fresh, photos }, project, ["couverture"])).couverture;
    await upsertPlanDocument(projectId, { ...out.document, photos: { ...photos, ...(couverture ? { couverture } : {}) } });
    await logRun(projectId, PURPOSE, "succes", out.durationMs, out.usage);
  } catch (error) {
    console.error("Rédaction du business plan impossible", error);
    await logRun(projectId, PURPOSE, "echec", Date.now() - started, usageFromError(error));
    return { ok: false, message: "La rédaction n'a pas abouti. Réessayez dans un instant." };
  }

  redirect(`/projets/${projectId}/business-plan`);
}

/** Après paiement : rédige la suite d'un aperçu, une seule fois. */
export async function completeBusinessPlan(projectId: string): Promise<FormState> {
  if (!UUID.test(projectId)) return { ok: false, message: "Projet introuvable." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Votre session a expiré. Reconnectez-vous." };
  if (!(await isPlanUnlocked(projectId))) return { ok: false, message: "Débloquez d'abord le business plan." };

  const saved = await getPlanDocument(projectId);
  const parsed = saved ? planDocumentSchema.safeParse(saved.data) : null;
  if (!parsed?.success) return { ok: false, message: "Rédigez d'abord le business plan." };
  const doc = parsed.data;
  if (isCompleteDocument(doc)) return { ok: true };

  const inputs = await loadInputs(projectId);
  if ("error" in inputs) return { ok: false, message: inputs.error };
  const { project, a, params } = inputs;

  const started = Date.now();
  try {
    const realiste = computeScenarios(toPlanInput(a, params)).realiste;
    const out = await generatePlanRest(contextOf(project), a, realiste, doc);
    const complete: PlanDocument = planDocumentSchema.parse({ ...doc, ...out.fields, stage: "complet" });
    // Après paiement : sections restantes et couverture illustrée par IA (une seule fois par projet).
    const [photos, cover] = await Promise.all([
      photosFor(complete, project, REST_SLOTS),
      complete.photos?.couverture?.source === "ia" ? null : aiCoverFor(projectId, complete, project),
    ]);
    await upsertPlanDocument(projectId, {
      ...complete,
      photos: { ...complete.photos, ...photos, ...(cover ? { couverture: cover } : {}) },
    });
    await logRun(projectId, REST_PURPOSE, "succes", out.durationMs, out.usage);
  } catch (error) {
    console.error("Rédaction de la suite impossible", error);
    await logRun(projectId, REST_PURPOSE, "echec", Date.now() - started, usageFromError(error));
    return { ok: false, message: "La rédaction de la suite n'a pas abouti. Réessayez dans un instant." };
  }
  return { ok: true };
}

/** Débloque le business plan contre 1 crédit ; sans crédit, envoie vers l'achat. */
export async function unlockPlanAction(projectId: string): Promise<void> {
  if (!UUID.test(projectId)) redirect("/tableau-de-bord");
  const user = await getCurrentUser();
  if (!user) redirect(`/connexion?suite=/projets/${projectId}/business-plan`);
  const ok = await unlockPlan(projectId);
  redirect(ok ? `/projets/${projectId}/business-plan` : `/credits?projet=${projectId}`);
}

/** Enregistre le design choisi pour le business plan (aucun appel à l'IA). */
export async function setPlanDesign(projectId: string, formData: FormData): Promise<void> {
  const design = String(formData.get("design") ?? "");
  if (!isPlanDesignId(design)) return;
  const supabase = await createClient();
  await supabase.from("projects").update({ plan_design: design }).eq("id", projectId);
  revalidatePath(`/projets/${projectId}/business-plan`);
}
