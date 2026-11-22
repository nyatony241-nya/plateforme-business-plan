import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ConfigNotice } from "@/components/config-notice";
import { isSupabaseConfigured } from "@/lib/env";
import { getCreditBalance, getCreditPacks, getRecentLedger } from "@/lib/data/credits";
import { getMyProject } from "@/lib/data/projects";
import { chariowConfigured } from "@/lib/payments/chariow";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/server";
import { BuyForm } from "./buy-form";

export const metadata: Metadata = { title: "Crédits" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REASON: Record<string, string> = {
  achat: "Achat",
  deblocage: "Business plan débloqué",
  offert: "Crédit offert",
  remboursement: "Remboursement",
};

export default async function CreditsPage({ searchParams }: PageProps<"/credits">) {
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
  if (!user) redirect("/connexion?suite=/credits");
  const query = await searchParams;
  const projectId = typeof query.projet === "string" && UUID.test(query.projet) ? query.projet : undefined;

  const [balance, packs, ledger, project] = await Promise.all([
    getCreditBalance(),
    getCreditPacks(),
    getRecentLedger(),
    projectId ? getMyProject(projectId) : Promise.resolve(null),
  ]);
  const open = chariowConfigured() && createAdminClient() !== null && packs.some((p) => p.chariow_product_id);
  const fullName = ((user.user_metadata?.full_name as string | undefined) ?? "").trim();
  const [prenom = "", ...rest] = fullName.split(/\s+/);

  return (
    <>
      <AppHeader name={fullName || user.email} />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-5 py-10 sm:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold">🪙 Crédits</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">
            {balance} crédit{balance > 1 ? "s" : ""}
          </h1>
          <p className="mt-2 text-ink-soft">
            1 crédit débloque un business plan complet, pour toujours : toutes les parties, sans filigrane, en PDF et
            en Word.
          </p>
        </div>

        {project ? (
          <div className="rounded-2xl border border-forest/30 bg-forest-50 p-5 text-sm text-ink">
            {balance > 0 ? (
              <>
                Vous avez déjà {balance} crédit{balance > 1 ? "s" : ""}.{" "}
                <Link href={`/projets/${project.id}/business-plan`} className="font-semibold text-forest underline">
                  Débloquer « {project.name} »
                </Link>
              </>
            ) : (
              <>Choisissez une formule : « {project.name} » sera débloqué juste après le paiement.</>
            )}
          </div>
        ) : null}

        <BuyForm
          packs={packs}
          open={open}
          projectId={project?.id}
          defaults={{ prenom, nom: rest.join(" ") }}
        />

        {ledger.length > 0 ? (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Historique</h2>
            <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
              {ledger.map((e, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span className="text-ink">
                    {REASON[e.reason] ?? e.reason}
                    {e.project ? <span className="text-muted"> · {e.project.name}</span> : null}
                    <span className="block text-xs text-muted">
                      {new Date(e.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </span>
                  <span className={`font-semibold tabular-nums ${e.delta > 0 ? "text-forest" : "text-ink-soft"}`}>
                    {e.delta > 0 ? `+${e.delta}` : e.delta}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </>
  );
}
