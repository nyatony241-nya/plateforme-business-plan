import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ConfigNotice } from "@/components/config-notice";
import { computeScenarios } from "@/engine";
import { assumptionsSchema, toPlanInput } from "@/lib/assumptions";
import { getCountryParams } from "@/lib/data/country-params";
import { getCreationGuide } from "@/lib/data/creation";
import { getAssumptions, getMyProject } from "@/lib/data/projects";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { CreationGuideView } from "./guide-view";

export const metadata: Metadata = { title: "Créer mon entreprise" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CreateCompanyPage({ params }: PageProps<"/projets/[id]/creer-mon-entreprise">) {
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
  if (!user) redirect(`/connexion?suite=/projets/${id}/creer-mon-entreprise`);
  if (!UUID.test(id)) notFound();
  const project = await getMyProject(id);
  if (!project) notFound();

  const [guide, country, saved] = await Promise.all([
    getCreationGuide(project.country_code),
    getCountryParams(project.country_code),
    getAssumptions(id),
  ]);

  // Chiffre d'affaires prévu la 1re année (scénario réaliste), pour situer le régime fiscal.
  const parsed = saved ? assumptionsSchema.safeParse(saved.data) : null;
  const revenue1 = parsed?.success
    ? computeScenarios(toPlanInput(parsed.data, country.params)).realiste.years[0].revenue
    : null;

  return (
    <>
      <AppHeader name={(user.user_metadata?.full_name as string | undefined) ?? user.email} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-8">
        <CreationGuideView
          project={{ id, name: project.name, staffing: project.staffing, budget: project.budget }}
          guide={guide}
          provenance={country.provenance}
          revenue1={revenue1}
        />
      </main>
    </>
  );
}
