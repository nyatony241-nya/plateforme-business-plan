import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ConfigNotice } from "@/components/config-notice";
import { Card } from "@/components/ui";
import { isAdmin } from "@/lib/data/admin";
import { listMyProjects, listCities } from "@/lib/data/projects";
import { formatDateFr } from "@/lib/data-status";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { IdeaAssistant } from "./idea-assistant";

export const metadata: Metadata = { title: "Mes projets" };
/** Créer un projet lance aussi la génération du plan (IA + calcul), jusqu'à une minute. */
export const maxDuration = 120;

export default async function DashboardPage() {
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
  if (!user) redirect("/connexion?suite=/tableau-de-bord");

  const [projects, cities] = await Promise.all([listMyProjects(), listCities()]);
  const fullName = (user.user_metadata?.full_name as string | undefined) ?? user.email;

  return (
    <>
      <AppHeader name={fullName} admin={await isAdmin()} />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_1.1fr]">
        <section aria-labelledby="mes-projets">
          <h1 id="mes-projets" className="font-display text-4xl font-semibold tracking-tight text-ink">
            Mes projets
          </h1>
          {projects.length === 0 ? (
            <p className="mt-4 text-ink-soft">
              Aucun projet pour l&apos;instant. Décrivez votre idée : la plateforme s&apos;occupe du reste.
            </p>
          ) : (
            <ul className="mt-6 flex flex-col gap-3">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projets/${project.id}`}
                    className="block rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-brand"
                  >
                    <p className="text-lg font-bold text-ink">{project.name}</p>
                    <p className="mt-1 text-sm text-muted">
                      {[project.city?.name, project.district, project.sector].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                      Brouillon · modifié le {formatDateFr(project.updated_at)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="nouveau-projet">
          <Card>
            <h2 id="nouveau-projet" className="font-display text-2xl font-semibold text-ink">
              Nouveau projet
            </h2>
            <p className="mt-2 text-ink-soft">
              Quelques phrases suffisent. Pilote ouvert à Libreville, Akanda et Owendo.
            </p>
            <div className="mt-6">
              <IdeaAssistant cities={cities} />
            </div>
          </Card>
        </section>
      </main>
    </>
  );
}
