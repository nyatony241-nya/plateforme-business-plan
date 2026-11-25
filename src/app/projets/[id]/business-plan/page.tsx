import { recommendLegalForm } from "@/lib/creation-guide";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ConfigNotice } from "@/components/config-notice";
import { ButtonLink, buttonClass } from "@/components/ui";
import { computeScenarios } from "@/engine";
import { assumptionsSchema, toPlanInput } from "@/lib/assumptions";
import { isCompleteDocument, planDocumentSchema } from "@/lib/business-plan";
import { getCountryParams } from "@/lib/data/country-params";
import { getCreationSummary } from "@/lib/data/creation";
import { getCreditBalance, getCreditPacks, isPlanUnlocked } from "@/lib/data/credits";
import { formatXaf } from "@/lib/format";
import { bestPerPlan, singlePrice } from "@/lib/packs";
import { previewDocument } from "@/lib/plan-preview";
import { creationAgencyOf,
  getAssumptions,
  getMyProject,
  getPlanDocument,
} from "@/lib/data/projects";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { getPlanDesign } from "@/lib/plan-designs";
import { CompleteRunner } from "./complete-runner";
import { DesignPicker } from "./design-picker";
import { PlanDocumentView } from "./document";
import { unlockPlanAction } from "./actions";
import { PrintButton } from "./print-button";
import { WriteButton } from "./write-button";

export const metadata: Metadata = { title: "Business plan" };
/** La rédaction par l'IA peut prendre jusqu'à une minute. */
export const maxDuration = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BusinessPlanPage({
  params,
}: PageProps<"/projets/[id]/business-plan">) {
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
    getCountryParams(project.country_code, { legalForm: recommendLegalForm(project).form }),
  ]);
  const [creation, unlocked, balance, packs] = await Promise.all([
    getCreationSummary(project).catch(() => undefined),
    isPlanUnlocked(id),
    getCreditBalance().catch(() => 0),
    getCreditPacks().catch(() => []),
  ]);
  const fromPrice = packs.length > 0 ? singlePrice(packs) : null;
  const packPrice = packs.length > 1 ? bestPerPlan(packs) : null;
  const assumptions = savedAssumptions
    ? assumptionsSchema.safeParse(savedAssumptions.data)
    : null;
  const doc = savedDocument
    ? planDocumentSchema.safeParse(savedDocument.data)
    : null;
  const minimumWage =
    country.provenance.find((p) => p.code === "revenu_minimum_mensuel")
      ?.value ?? 150_000;
  // Débloqué mais seulement l'aperçu rédigé : la suite s'écrit maintenant (payée).
  const pending = unlocked && Boolean(doc?.success && !isCompleteDocument(doc.data));
  const full = unlocked && !pending;

  return (
    <>
      <AppHeader
        name={
          (user.user_metadata?.full_name as string | undefined) ?? user.email
        }
      />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:px-8 print:max-w-none print:p-0">
        <div className="print:hidden">
          <Link
            href={`/projets/${id}`}
            className="text-sm font-semibold text-brand hover:underline"
          >
            ← {project.name}
          </Link>
        </div>

        {!assumptions?.success ? (
          <section className="mt-6 rounded-2xl border border-brand/30 bg-brand-50 p-6">
            <h1 className="font-display text-2xl font-semibold text-ink">
              Business plan
            </h1>
            <p className="mt-2 text-ink-soft">
              Le business plan s&apos;appuie sur votre plan financier.
              Générez-le d&apos;abord.
            </p>
            <ButtonLink href={`/projets/${id}/plan-financier`} className="mt-5">
              Aller au plan financier
            </ButtonLink>
          </section>
        ) : !doc?.success ? (
          <section className="mt-6 rounded-2xl border border-brand/30 bg-brand-50 p-6">
            <h1 className="font-display text-2xl font-semibold text-ink">
              Votre business plan en une minute
            </h1>
            <p className="mt-2 max-w-2xl text-ink-soft">
              À partir de votre plan financier, la plateforme rédige tout :
              présentation, marché, emplacement, marketing avec un calendrier de
              90 jours, risques et démarches. Vous pourrez ensuite le
              télécharger en PDF.
            </p>
            <div className="mt-5">
              <WriteButton projectId={id} label="Rédiger mon business plan" />
            </div>
          </section>
        ) : (
          <>
            {savedAssumptions && savedDocument && savedAssumptions.updatedAt > savedDocument.updatedAt ? (
              <section className="mt-4 rounded-2xl border border-accent/40 bg-accent-50 p-5 print:hidden">
                <p className="font-semibold text-ink">⚠️ Le plan financier a changé depuis la rédaction.</p>
                <p className="mt-1 text-sm text-ink-soft">
                  Les tableaux sont à jour, mais le texte décrit peut-être l&apos;ancienne version. Rédigez-le à
                  nouveau avant de le télécharger.
                </p>
                <div className="mt-4">
                  <WriteButton projectId={id} label="Rédiger à nouveau" />
                </div>
              </section>
            ) : null}
            {pending ? <CompleteRunner projectId={id} /> : null}
            {full ? (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
              <p className="text-sm text-muted">
                Pour le PDF, choisissez « Enregistrer en PDF » dans la fenêtre
                qui s&apos;ouvre.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <PrintButton />
                <a
                  href={`/projets/${id}/business-plan/word`}
                  className={buttonClass("secondary")}
                  download
                >
                  Télécharger en Word
                </a>
              </div>
            </div>
            ) : pending ? null : (
              <UnlockPanel projectId={id} balance={balance} fromPrice={fromPrice} packPrice={packPrice} />
            )}
            <DesignPicker projectId={id} current={project.plan_design} />
            {/* Cadre d'impression : marges sur chaque page, sans l'adresse ni la date du navigateur. */}
            <table className="print-frame mt-6 print:mt-0">
              <thead aria-hidden>
                <tr>
                  <td>
                    <div />
                  </td>
                </tr>
              </thead>
              <tfoot aria-hidden>
                <tr>
                  <td>
                    <div />
                  </td>
                </tr>
              </tfoot>
              <tbody>
                <tr>
                  <td>
                    <PlanDocumentView
                      doc={full ? doc.data : previewDocument(doc.data)}
                      preview={!full}
                      pending={pending}
                      design={getPlanDesign(project.plan_design)}
                      a={assumptions.data}
                      results={computeScenarios(
                        toPlanInput(assumptions.data, country.params),
                      )}
                      project={{
                        name: project.name,
                        sector: project.sector,
                        district: project.district,
                        city: project.city?.name ?? null,
                        country: project.country?.name ?? "Gabon",
                        creationAgency: creationAgencyOf(project),
                      }}
                      minimumWage={minimumWage}
                creation={creation}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            {unlocked ? null : (
              <div className="mt-6">
                <UnlockPanel projectId={id} balance={balance} fromPrice={fromPrice} packPrice={packPrice} />
              </div>
            )}
            <details className="mt-6 rounded-2xl border border-line bg-surface px-5 py-4 print:hidden">
              <summary className="cursor-pointer text-sm font-semibold text-brand">
                Rédiger à nouveau
              </summary>
              <p className="mt-2 text-sm text-ink-soft">
                Utile si vous avez corrigé le plan financier. Le texte actuel
                sera remplacé.
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

/** Ce que le plan complet ajoute à l'aperçu gratuit. */
const UNLOCKED = [
  "Couverture illustrée par IA, à votre nom",
  "Marché, clientèle et concurrence",
  "Emplacement noté critère par critère",
  "Plan financier sur 3 ans, 3 scénarios",
  "Trésorerie mois par mois",
  "Marketing et calendrier des 90 premiers jours",
  "Analyse SWOT, risques et parades",
  "Démarches de création dans votre pays",
  "PDF et Word, sans le marquage AfriBiz",
];

/** Aperçu gratuit : ce que débloque le plan complet, et pour combien. */
function UnlockPanel({
  projectId,
  balance,
  fromPrice,
  packPrice,
}: {
  projectId: string;
  balance: number;
  fromPrice: number | null;
  /** Prix d'un plan dans la formule la plus avantageuse. */
  packPrice: number | null;
}) {
  return (
    <section className="mt-4 overflow-hidden rounded-3xl border border-brand/25 bg-surface shadow-[0_18px_40px_-28px_rgba(210,57,12,0.6)] print:hidden">
      <div className="grid gap-6 p-6 sm:grid-cols-[1.4fr_1fr] sm:p-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">🔒 Aperçu gratuit : 3 pages</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-ink">Débloquez le plan complet</h2>
          <ul className="mt-4 grid gap-2 text-sm text-ink">
            {UNLOCKED.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden className="font-bold text-ok">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col justify-center rounded-2xl bg-brand-50 p-5 text-center">
          {balance > 0 ? (
            <>
              <p className="font-display text-3xl font-bold text-ink">1 crédit</p>
              <p className="mt-1 text-sm text-ink-soft">
                Il vous reste {balance} crédit{balance > 1 ? "s" : ""}.
              </p>
              <form action={unlockPlanAction.bind(null, projectId)} className="mt-4">
                <button type="submit" className={buttonClass("primary", "w-full")}>
                  🔓 Débloquer maintenant
                </button>
              </form>
            </>
          ) : (
            <>
              {fromPrice ? <p className="font-display text-4xl font-bold text-ink">{formatXaf(fromPrice)}</p> : null}
              <p className="mt-1 text-sm text-ink-soft">pour ce business plan</p>
              {packPrice && fromPrice && packPrice < fromPrice ? (
                <p className="mt-1 text-xs font-semibold text-ok">ou dès {formatXaf(packPrice)} le plan en formule</p>
              ) : null}
              <ButtonLink href={`/credits?projet=${projectId}`} className="mt-4 w-full">
                🔓 Débloquer maintenant
              </ButtonLink>
            </>
          )}
          <p className="mt-3 text-xs text-muted">Paiement unique · Sans abonnement · À vous pour toujours</p>
          <p className="mt-1 text-xs text-muted">📱 Mobile money</p>
        </div>
      </div>
    </section>
  );
}
