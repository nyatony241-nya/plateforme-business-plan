import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ConfigNotice } from "@/components/config-notice";
import { ButtonLink, buttonClass } from "@/components/ui";
import { computeScenarios } from "@/engine";
import { assumptionsSchema, toPlanInput } from "@/lib/assumptions";
import { planDocumentSchema } from "@/lib/business-plan";
import { getCountryParams } from "@/lib/data/country-params";
import { getAssumptions, getMyProject, getPlanDocument } from "@/lib/data/projects";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { PlanDocumentView } from "./document";
import { PrintButton } from "./print-button";
import { WriteButton } from "./write-button";

export const metadata: Metadata = { title: "Business plan" };
/** La rédaction par l'IA peut prendre jusqu'à une minute. */
export const maxDuration = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BusinessPlanPage({ params }: PageProps<"/projets/[id]/business-plan">) {
  const { id } = await params;
  if (!isSupabaseConfigured) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8">
          <ConfigNotice />
        </main>
      </>
    );
  }

  const user = await getCurrentUser();
  if (!user) redirect(`/connexion?suite=/projets/${id}/business-plan`);
  if (!UUID.test(id)) notFound();

  const project = await getMyProject(id);
  if (!project) notFound();

  const [savedAssumptions, savedDocument, country] = await Promise.all([
    getAssumptions(id),
    getPlanDocument(id),
    getCountryParams(project.country_code),
  ]);
  const assumptions = savedAssumptions ? assumptionsSchema.safeParse(savedAssumptions.data) : null;
  const doc = savedDocument ? planDocumentSchema.safeParse(savedDocument.data) : null;
  const minimumWage = country.provenance.find((p) => p.code === "revenu_minimum_mensuel")?.value ?? 150_000;

  return (
    <>
      <AppHeader name={(user.user_metadata?.full_name as string | undefined) ?? user.email} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:px-8 print:max-w-none print:p-0">
        <div className="print:hidden">
          <Link href={`/projets/${id}`} className="text-sm font-semibold text-forest hover:underline">
            ← {project.name}
          </Link>
        </div>

        {!assumptions?.success ? (
          <section className="mt-6 rounded-2xl border border-forest/30 bg-forest-50 p-6">
            <h1 className="font-display text-2xl font-semibold text-ink">Business plan</h1>
            <p className="mt-2 text-ink-soft">Le business plan s&apos;appuie sur votre plan financier. Générez-le d&apos;abord.</p>
            <ButtonLink href={`/projets/${id}/plan-financier`} className="mt-5">
              Aller au plan financier
            </ButtonLink>
          </section>
        ) : !doc?.success ? (
          <section className="mt-6 rounded-2xl border border-forest/30 bg-forest-50 p-6">
            <h1 className="font-display text-2xl font-semibold text-ink">Votre business plan en une minute</h1>
            <p className="mt-2 max-w-2xl text-ink-soft">
              À partir de votre plan financier, la plateforme rédige tout : présentation, marché, emplacement,
              marketing avec un calendrier de 90 jours, risques et démarches. Vous pourrez ensuite le télécharger en
              PDF.
            </p>
            <div className="mt-5">
              <WriteButton projectId={id} label="Rédiger mon business plan" />
            </div>
          </section>
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
              <p className="text-sm text-muted">Pour le PDF, choisissez « Enregistrer en PDF » dans la fenêtre qui s&apos;ouvre.</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <PrintButton />
                <a href={`/projets/${id}/business-plan/word`} className={buttonClass("secondary")} download>
                  Télécharger en Word
                </a>
              </div>
            </div>
            <div className="mt-6 print:mt-0">
              <PlanDocumentView
                doc={doc.data}
                a={assumptions.data}
                results={computeScenarios(toPlanInput(assumptions.data, country.params))}
                project={{
                  name: project.name,
                  sector: project.sector,
                  district: project.district,
                  city: project.city?.name ?? null,
                  country: project.country?.name ?? "Gabon",
                }}
                minimumWage={minimumWage}
              />
            </div>
            <details className="mt-6 rounded-2xl border border-line bg-surface px-5 py-4 print:hidden">
              <summary className="cursor-pointer text-sm font-semibold text-forest">Rédiger à nouveau</summary>
              <p className="mt-2 text-sm text-ink-soft">
                Utile si vous avez corrigé le plan financier. Le texte actuel sera remplacé.
              </p>
              <div className="mt-4">
                <WriteButton projectId={id} label="Rédiger à nouveau" />
              </div>
            </details>
          </>
        )}
      </main>
    </>
  );
}
