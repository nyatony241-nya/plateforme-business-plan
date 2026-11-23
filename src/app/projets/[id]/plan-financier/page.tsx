import { recommendLegalForm } from "@/lib/creation-guide";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ConfigNotice } from "@/components/config-notice";
import { StatusBadge } from "@/components/ui";
import { assumptionsSchema } from "@/lib/assumptions";
import { getCountryParams } from "@/lib/data/country-params";
import { getAssumptions, getMyProject } from "@/lib/data/projects";
import { formatDateFr } from "@/lib/data-status";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { GenerateForm } from "../generate-form";
import { isPlanUnlocked } from "@/lib/data/credits";
import { PlanEditor } from "./editor";

export const metadata: Metadata = { title: "Plan financier" };
/** La régénération (IA + calcul) peut prendre jusqu'à une minute. */
export const maxDuration = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function FinancialPlanPage({ params }: PageProps<"/projets/[id]/plan-financier">) {
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
  if (!user) redirect(`/connexion?suite=/projets/${id}/plan-financier`);
  if (!UUID.test(id)) notFound();

  const project = await getMyProject(id);
  if (!project) notFound();

  const [saved, country, unlocked] = await Promise.all([
    getAssumptions(id),
    getCountryParams(project.country_code, { legalForm: recommendLegalForm(project).form }),
    isPlanUnlocked(id),
  ]);
  const parsed = saved ? assumptionsSchema.safeParse(saved.data) : null;
  const initial = parsed?.success ? parsed.data : null;
  const defaults = { budget: project.budget, mode: project.mode, staffing: project.staffing };
  const generation = initial?.generation;

  return (
    <>
      <AppHeader name={(user.user_metadata?.full_name as string | undefined) ?? user.email} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 pb-28 pt-8 sm:px-8">
        <Link href={`/projets/${id}`} className="text-sm font-semibold text-brand hover:underline">
          ← {project.name}
        </Link>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">Plan financier</h1>
        {initial && saved ? (
          <details className="mt-4 max-w-4xl">
            <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl bg-brand px-5 py-3 text-[0.95rem] font-semibold text-white [&::-webkit-details-marker]:hidden">
              <span aria-hidden>🔄</span> Regénérer le plan
            </summary>
            <div className="mt-4 rounded-2xl border border-brand/30 bg-brand-50 p-5">
              <p className="text-sm text-ink-soft">
                Tous les chiffres sont recalculés avec les dernières règles et les repères locaux. Vos corrections
                actuelles seront remplacées.
              </p>
              <div className="mt-4">
                <GenerateForm projectId={id} defaults={defaults} submitLabel="Regénérer le plan" />
              </div>
            </div>
          </details>
        ) : null}

        {!initial || !saved ? (
          <section className="mt-6 max-w-4xl rounded-2xl border border-brand/30 bg-brand-50 p-6">
            <h2 className="font-display text-2xl font-semibold text-ink">Générer le plan</h2>
            <p className="mt-1 text-ink-soft">
              Trois réponses, et la plateforme construit tout : investissements, prix, ventes, charges, personnel,
              financement, puis trois scénarios sur 3 ans.
            </p>
            <div className="mt-5">
              <GenerateForm projectId={id} defaults={defaults} />
            </div>
          </section>
        ) : (
          <>
            {generation ? (
              <section className="mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <StatusBadge status="hypothese" />
                  Plan proposé automatiquement le {formatDateFr(generation.generatedAt)}
                </div>
                <p className="mt-3 max-w-3xl leading-relaxed text-ink">{generation.summary}</p>
                {generation.warnings.length > 0 ? (
                  <div className="mt-4">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">À vérifier en priorité</h2>
                    <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed text-ink-soft">
                      {generation.warnings.map((w) => (
                        <li key={w} className="flex gap-2">
                          <span aria-hidden className="text-accent">•</span>
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {generation.references && generation.references.length > 0 ? (
                  <div className="mt-4">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">
                      Repères locaux utilisés
                    </h2>
                    <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed text-ink-soft">
                      {generation.references.map((r) => (
                        <li key={r.text} className="flex gap-2">
                          <span aria-hidden>📍</span>
                          <span>
                            {r.text}.{" "}
                            {r.url ? (
                              <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-muted underline">
                                {r.source}
                              </a>
                            ) : (
                              <span className="text-muted">{r.source}</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ) : null}
            <div className="mt-8">
              <PlanEditor
                key={saved.updatedAt}
                projectId={id}
                initial={initial}
                initialSavedAt={saved.updatedAt}
                params={country.params}
                provenance={country.provenance}
                countryName={project.country?.name}
                unlockHref={unlocked ? undefined : `/projets/${id}/business-plan`}
              />
            </div>
          </>
        )}
      </main>
    </>
  );
}
