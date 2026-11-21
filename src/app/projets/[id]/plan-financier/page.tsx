import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ConfigNotice } from "@/components/config-notice";
import { assumptionsSchema, defaultAssumptions } from "@/lib/assumptions";
import { getCountryParams } from "@/lib/data/country-params";
import { getAssumptions, getMyProject } from "@/lib/data/projects";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { PlanEditor } from "./editor";

export const metadata: Metadata = { title: "Plan financier" };

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

  const [saved, country] = await Promise.all([getAssumptions(id), getCountryParams(project.country_code)]);
  const parsed = saved ? assumptionsSchema.safeParse(saved.data) : null;
  const initial = parsed?.success ? parsed.data : defaultAssumptions();

  return (
    <>
      <AppHeader name={(user.user_metadata?.full_name as string | undefined) ?? user.email} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 pb-28 pt-8 sm:px-8 lg:pb-8">
        <Link href={`/projets/${id}`} className="text-sm font-semibold text-forest hover:underline">
          ← {project.name}
        </Link>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">Plan financier</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Saisissez vos chiffres à gauche : les résultats des trois scénarios se mettent à jour à droite, et tout est
          enregistré automatiquement.
        </p>
        <div className="mt-8">
          <PlanEditor
            projectId={id}
            initial={initial}
            initialSavedAt={saved?.updatedAt ?? null}
            params={country.params}
            provenance={country.provenance}
          />
        </div>
      </main>
    </>
  );
}
