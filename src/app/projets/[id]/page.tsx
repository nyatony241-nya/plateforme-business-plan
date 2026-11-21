import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ConfigNotice } from "@/components/config-notice";
import { Card } from "@/components/ui";
import { getAssumptions, getMyProject } from "@/lib/data/projects";
import { formatDateFr } from "@/lib/data-status";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { GenerateForm } from "./generate-form";

export const metadata: Metadata = { title: "Projet" };
/** La génération automatique (IA + calcul) peut prendre jusqu'à une minute. */
export const maxDuration = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


export default async function ProjectPage({ params }: PageProps<"/projets/[id]">) {
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
  if (!user) redirect(`/connexion?suite=/projets/${id}`);
  if (!UUID.test(id)) notFound();

  const project = await getMyProject(id);
  if (!project) notFound();
  const saved = await getAssumptions(id);

  return (
    <>
      <AppHeader name={(user.user_metadata?.full_name as string | undefined) ?? user.email} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10 sm:px-8">
        <Link href="/tableau-de-bord" className="text-sm font-semibold text-forest hover:underline">
          ← Mes projets
        </Link>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          {project.name}
        </h1>
        <p className="mt-3 text-ink-soft">
          {[project.city?.name, project.district, project.sector].filter(Boolean).join(" · ")}
        </p>
        <p className="mt-2 text-sm text-muted">Créé le {formatDateFr(project.created_at)}</p>

        {project.idea ? (
          <Card className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Votre idée</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-ink">{project.idea}</p>
          </Card>
        ) : null}

        {saved ? (
          <Link
            href={`/projets/${project.id}/plan-financier`}
            className="mt-8 flex flex-col gap-4 rounded-2xl border border-forest/30 bg-forest-50 p-6 transition-colors hover:border-forest sm:flex-row sm:items-center sm:justify-between"
          >
            <span>
              <span className="block font-display text-2xl font-semibold text-ink">Plan financier</span>
              <span className="mt-1 block text-ink-soft">
                Prêt : trois scénarios calculés, avec l&apos;explication de chaque chiffre.
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center justify-center rounded-xl bg-forest px-5 py-3 text-[0.95rem] font-semibold text-white">
              Ouvrir
            </span>
          </Link>
        ) : null}
        {saved ? (
          <Link
            href={`/projets/${project.id}/business-plan`}
            className="mt-4 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-forest sm:flex-row sm:items-center sm:justify-between"
          >
            <span>
              <span className="block font-display text-2xl font-semibold text-ink">Business plan</span>
              <span className="mt-1 block text-ink-soft">
                Le document complet, rédigé à partir du plan financier, à télécharger en PDF.
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center justify-center rounded-xl border border-line-strong px-5 py-3 text-[0.95rem] font-semibold text-forest">
              Ouvrir
            </span>
          </Link>
        ) : (
          <section aria-labelledby="generer" className="mt-8 rounded-2xl border border-forest/30 bg-forest-50 p-6">
            <h2 id="generer" className="font-display text-2xl font-semibold text-ink">
              Votre plan financier en une minute
            </h2>
            <p className="mt-1 max-w-2xl text-ink-soft">
              Trois réponses, et la plateforme construit tout : investissements, prix, ventes, charges, personnel,
              financement, puis trois scénarios sur 3 ans.
            </p>
            <div className="mt-5">
              <GenerateForm
                projectId={project.id}
                defaults={{ budget: project.budget, mode: project.mode, staffing: project.staffing }}
              />
            </div>
          </section>
        )}

      </main>
    </>
  );
}
