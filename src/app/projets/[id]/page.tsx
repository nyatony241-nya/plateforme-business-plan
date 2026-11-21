import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ConfigNotice } from "@/components/config-notice";
import { Card } from "@/components/ui";
import { getMyProject } from "@/lib/data/projects";
import { formatDateFr } from "@/lib/data-status";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Projet" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const prochainesEtapes = [
  { title: "Assistant de cadrage", text: "Questions ciblées pour compléter votre idée." },
  { title: "Rédaction et export", text: "Plan complet, export PDF et Word." },
];

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

        <Link
          href={`/projets/${project.id}/plan-financier`}
          className="mt-8 flex flex-col gap-4 rounded-2xl border border-forest/30 bg-forest-50 p-6 transition-colors hover:border-forest sm:flex-row sm:items-center sm:justify-between"
        >
          <span>
            <span className="block font-display text-2xl font-semibold text-ink">Plan financier</span>
            <span className="mt-1 block text-ink-soft">
              Investissements, ventes, personnel, charges, financement : trois scénarios calculés sur 3 ou 5 ans.
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center justify-center rounded-xl bg-forest px-5 py-3 text-[0.95rem] font-semibold text-white">
            Ouvrir
          </span>
        </Link>

        <section className="mt-10" aria-labelledby="etapes">
          <h2 id="etapes" className="font-display text-2xl font-semibold text-ink">
            Prochaines étapes
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {prochainesEtapes.map((step) => (
              <li key={step.title} className="rounded-2xl border border-dashed border-line-strong p-5">
                <p className="font-bold text-ink">{step.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.text}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-gold">Bientôt</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
