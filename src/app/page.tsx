import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLink } from "@/components/brand";
import { SectionNav } from "@/components/landing/section-nav";
import {
  Arcs,
  DocumentMockup,
  FUNNEL_STEPS,
  FunnelGraphic,
  GrowthChart,
  Hexagon,
  PhoneMockup,
} from "@/components/landing/visuals";
import { ButtonLink, buttonClass } from "@/components/ui";
import { brand } from "@/config/brand";
import { SECTIONS } from "@/lib/business-plan-view";
import { getCreditPacks, type CreditPack } from "@/lib/data/credits";
import { isSupabaseConfigured } from "@/lib/env";
import { formatXaf } from "@/lib/format";
import { PLAN_DESIGNS } from "@/lib/plan-designs";
import { getCurrentUser } from "@/lib/supabase/server";

/** Grille affichée si la base est injoignable (mêmes valeurs que la base au 22/11/2026). */
const FALLBACK_PACKS: CreditPack[] = [
  { code: "starter", name: "Essentiel", credits: 1, price_xaf: 10000, chariow_product_id: null },
  { code: "pro", name: "Pro", credits: 3, price_xaf: 20000, chariow_product_id: null },
  { code: "business", name: "Business", credits: 10, price_xaf: 50000, chariow_product_id: null },
];

const PACK_AUDIENCE: Record<string, string> = {
  starter: "Pour votre projet",
  pro: "Pour comparer plusieurs idées",
  business: "Incubateurs, consultants, associations",
};

const NAV = [
  { id: "probleme", label: "Le problème" },
  { id: "solution", label: "La solution" },
  { id: "chiffres", label: "Les chiffres" },
  { id: "contenu", label: "Votre plan" },
  { id: "tarifs", label: "Tarifs" },
  { id: "questions", label: "Questions" },
];

const PROBLEMS = [
  {
    title: "Un consultant",
    text: "Cher, souvent plusieurs centaines de milliers de FCFA, et plusieurs semaines d'attente.",
  },
  {
    title: "Un modèle trouvé en ligne",
    text: "Des chiffres venus d'ailleurs : rien sur les loyers, les salaires ou les impôts de Libreville.",
  },
  {
    title: "Le faire seul",
    text: "Impôts, trésorerie, scénarios : une erreur de calcul et le dossier perd sa crédibilité.",
  },
];

const STRENGTHS = [
  {
    icon: "🏷️",
    title: "Chaque chiffre a un statut",
    text: "Vérifié, estimation ou hypothèse : vous savez d'où vient chaque montant, avec sa source et sa date.",
  },
  {
    icon: "🛡️",
    title: "Aucune hypothèse absurde",
    text: "Des contrôles bloquent la vente à perte, le bénéfice irréaliste ou le local sans loyer.",
  },
  {
    icon: "🏦",
    title: "Prêt pour la banque",
    text: "PDF et Word, plan financier sur 3 ans, trois scénarios, argent en caisse mois par mois.",
  },
];

const AUDIENCE = [
  { icon: "🛍️", label: "Commerce" },
  { icon: "✂️", label: "Beauté et services" },
  { icon: "🍲", label: "Restauration" },
  { icon: "💻", label: "Numérique", active: true },
  { icon: "🌾", label: "Agriculture et élevage" },
  { icon: "🔧", label: "Artisanat" },
];

const FAQ = [
  {
    q: "Dois-je saisir des chiffres ?",
    a: "Non. Vous décrivez votre idée avec vos mots ; l'assistant pose seulement les questions utiles (ville, quartier, budget). Tous les montants sont calculés pour vous, et vous pouvez les corriger ensuite.",
  },
  {
    q: "D'où viennent les chiffres ?",
    a: "Des tarifs officiels (ANPI, impôts du Gabon) et de repères relevés localement (loyers, salaires, électricité), chacun avec sa source et sa date. Ce qui reste une hypothèse est signalé comme tel.",
  },
  {
    q: "Le plan est-il accepté par les banques ?",
    a: "Il contient ce qu'une banque demande : présentation, marché, investissements, financement, comptes prévisionnels sur 3 ans et trois scénarios. La décision de financement reste celle de la banque.",
  },
  {
    q: "Combien de temps faut-il ?",
    a: "Quelques minutes : le temps de décrire votre idée, puis de laisser la plateforme calculer et rédiger.",
  },
  {
    q: "Comment payer ?",
    a: "En ligne, par Mobile Money. Vos crédits arrivent dès que le paiement est confirmé ; un crédit débloque un business plan complet, pour toujours.",
  },
  {
    q: "Mon projet reste-t-il privé ?",
    a: "Oui. Votre projet n'est visible que par vous. Personne d'autre, ni l'équipe de la plateforme, ne lit son contenu.",
  },
];

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-brand">
      <span aria-hidden className="h-px w-8 bg-brand" />
      {children}
    </p>
  );
}

function Title({ before, highlight, after = "" }: { before?: string; highlight: string; after?: string }) {
  return (
    <h2 className="mt-3 font-display text-[2.1rem] font-medium leading-tight tracking-tight text-ink sm:text-[2.7rem]">
      {before ? `${before} ` : ""}
      <span className="text-brand">{highlight}</span>
      {after}
    </h2>
  );
}

async function loadPacks(): Promise<CreditPack[]> {
  if (!isSupabaseConfigured) return FALLBACK_PACKS;
  try {
    const packs = await getCreditPacks();
    return packs.length ? packs : FALLBACK_PACKS;
  } catch {
    return FALLBACK_PACKS;
  }
}

export default async function HomePage() {
  const [packs, user] = await Promise.all([loadPacks(), isSupabaseConfigured ? getCurrentUser() : null]);
  const single = packs.find((p) => p.credits === 1) ?? packs[0];
  const unit = single ? single.price_xaf : 0;
  const start = user ? { href: "/tableau-de-bord", label: "Mon tableau de bord" } : { href: "/inscription", label: "Commencer" };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-3.5 sm:px-8">
          <BrandLink />
          <nav className="flex items-center gap-1 sm:gap-2">
            <a href="#solution" className="hidden px-3 py-2 text-sm font-semibold text-ink-soft hover:text-brand md:inline">
              La solution
            </a>
            <a href="#tarifs" className="hidden px-3 py-2 text-sm font-semibold text-ink-soft hover:text-brand md:inline">
              Tarifs
            </a>
            {user ? null : (
              <Link href="/connexion" className="hidden px-3 py-2 text-sm font-semibold text-ink-soft hover:text-brand sm:inline">
                Connexion
              </Link>
            )}
            <ButtonLink href={start.href} className="px-4 py-2.5 text-sm">
              {start.label}
            </ButtonLink>
          </nav>
        </div>
      </header>

      <main className="flex-1 pb-10 lg:pb-24">
        {/* Accueil */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:pb-24 lg:pt-16">
            <div>
              <Eyebrow>
                Pilote au {brand.pilot.country} · {brand.pilot.cities.join(", ")}
              </Eyebrow>
              <h1 className="mt-5 font-display text-[2.6rem] font-medium leading-[1.05] tracking-tight text-ink sm:text-[3.6rem]">
                Votre idée devient un <span className="text-brand">business plan</span> prêt pour la banque.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
                Décrivez votre projet avec vos mots. En quelques minutes, vous recevez un business plan complet,
                chiffré avec les réalités de votre ville, et les démarches pour créer votre entreprise.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <ButtonLink href={user ? "/tableau-de-bord" : "/inscription"} className="px-6 py-3.5 text-base">
                  Créer mon plan gratuitement
                </ButtonLink>
                <a href="#solution" className="group flex items-center gap-3 text-sm font-semibold text-ink">
                  <span className="grid size-12 place-items-center rounded-full bg-linear-to-br from-flame to-brand text-white shadow-[0_10px_24px_-10px_rgba(210,57,12,0.8)] ring-8 ring-brand/10 transition-transform group-hover:scale-105">
                    ▶
                  </span>
                  Comment ça marche
                </a>
              </div>
              <dl className="mt-12 grid max-w-lg grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                {[
                  ["0", "chiffre à saisir"],
                  ["9", "parties rédigées"],
                  ["3", "scénarios"],
                  [String(PLAN_DESIGNS.length), "designs au choix"],
                ].map(([n, l]) => (
                  <div key={l} className="border-l-2 border-brand/60 pl-3">
                    <dt className="sr-only">{l}</dt>
                    <dd className="font-display text-3xl font-semibold text-ink">{n}</dd>
                    <dd className="text-xs text-muted">{l}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative mx-auto grid w-full max-w-[460px] place-items-center">
              <Arcs className="absolute inset-0 m-auto w-full" />
              <div className="relative py-8">
                <PhoneMockup />
                <p className="mt-3 text-center text-xs text-muted">Exemple d&apos;écran</p>
              </div>
            </div>
          </div>
        </section>

        {/* Le problème */}
        <section id="probleme" className="scroll-mt-20 border-y border-line bg-surface">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_1.4fr] lg:items-center lg:py-24">
            <div>
              <Eyebrow>Le constat</Eyebrow>
              <Title before="Le" highlight="problème" />
              <p className="mt-5 leading-relaxed text-ink-soft">
                Pour obtenir un prêt, convaincre un associé ou se lancer sereinement, il faut un business plan sérieux.
                Aujourd&apos;hui, l&apos;entrepreneur a trois options, toutes difficiles.
              </p>
            </div>
            <ol className="grid gap-4 sm:grid-cols-3">
              {PROBLEMS.map((p, i) => (
                <li key={p.title} className="rounded-2xl border border-line bg-paper p-5">
                  <span className="font-display text-3xl font-semibold text-brand">0{i + 1}</span>
                  <h3 className="mt-3 font-display text-lg font-semibold text-ink">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* La solution */}
        <section id="solution" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
            <div className="max-w-2xl">
              <Eyebrow>Six étapes automatiques</Eyebrow>
              <Title before="La" highlight="solution" />
              <p className="mt-4 leading-relaxed text-ink-soft">
                De votre idée au plan complet : vous écrivez quelques phrases, la plateforme fait le reste.
              </p>
            </div>
            <div className="mt-12 grid items-center gap-8 lg:grid-cols-[1fr_300px_1fr]">
              <ul className="hidden flex-col gap-12 lg:flex">
                {FUNNEL_STEPS.filter((_, i) => i % 2 === 0).map((s) => (
                  <li key={s.letter} className="flex items-start justify-end gap-4 text-right">
                    <div>
                      <p className="font-display font-semibold text-brand">
                        {s.letter}. {s.title}
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">{s.text}</p>
                    </div>
                    <span aria-hidden className="mt-2 flex items-center gap-1">
                      <span className="w-10 border-t-2 border-dotted border-line-strong" />
                      <span className="size-2.5 rounded-full bg-brand ring-4 ring-brand/15" />
                    </span>
                  </li>
                ))}
              </ul>
              <FunnelGraphic className="mx-auto w-full max-w-[300px]" />
              <ul className="hidden flex-col gap-12 lg:flex">
                {FUNNEL_STEPS.filter((_, i) => i % 2 === 1).map((s) => (
                  <li key={s.letter} className="flex items-start gap-4">
                    <span aria-hidden className="mt-2 flex items-center gap-1">
                      <span className="size-2.5 rounded-full bg-brand ring-4 ring-brand/15" />
                      <span className="w-10 border-t-2 border-dotted border-line-strong" />
                    </span>
                    <div>
                      <p className="font-display font-semibold text-brand">
                        {s.letter}. {s.title}
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <ol className="grid gap-4 sm:grid-cols-2 lg:hidden">
                {FUNNEL_STEPS.map((s) => (
                  <li key={s.letter} className="flex gap-3 rounded-2xl border border-line bg-surface p-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand font-display font-bold text-white">
                      {s.letter}
                    </span>
                    <div>
                      <p className="font-display font-semibold text-ink">{s.title}</p>
                      <p className="mt-1 text-sm text-ink-soft">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Les chiffres */}
        <section id="chiffres" className="scroll-mt-20 border-y border-line bg-surface">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:py-24">
            <div className="flex justify-center lg:order-2 lg:justify-start">
              <div className="w-full rounded-3xl border border-line bg-paper p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Exemple · chiffre d&apos;affaires prévu, scénario réaliste
                </p>
                <div className="mt-4">
                  <GrowthChart />
                </div>
              </div>
            </div>
            <div className="lg:order-1">
              <Eyebrow>Moteur financier</Eyebrow>
              <Title before="Des chiffres" highlight="qui tiennent" />
              <p className="mt-5 leading-relaxed text-ink-soft">
                Ventes, charges, impôts du Gabon, argent en caisse mois par mois : tout est calculé par un moteur
                financier, en trois scénarios (prudent, réaliste, optimiste). L&apos;intelligence artificielle rédige ;
                elle ne calcule jamais.
              </p>
              <ul className="mt-8 flex flex-col gap-5">
                {STRENGTHS.map((s) => (
                  <li key={s.title} className="flex gap-4">
                    <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-xl border border-line bg-paper text-xl">
                      {s.icon}
                    </span>
                    <div>
                      <h3 className="font-display font-semibold text-ink">{s.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Votre plan */}
        <section id="contenu" className="scroll-mt-20">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.5fr_1fr] lg:items-center lg:py-24">
            <div>
              <Eyebrow>Le document</Eyebrow>
              <Title before="Votre" highlight="plan" after=" contient" />
              <p className="mt-4 leading-relaxed text-ink-soft">
                Neuf parties rédigées, illustrées de photos adaptées à votre activité, dans le design de votre choix
                parmi {PLAN_DESIGNS.length}.
              </p>
              <ol className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                {SECTIONS.map((s, i) => (
                  <li
                    key={s.title}
                    className="flex min-h-20 flex-col justify-between rounded-xl border border-brand/25 bg-surface p-3 text-[13px] font-semibold leading-tight text-ink"
                  >
                    <span className="text-xs text-brand">{String(i + 1).padStart(2, "0")}</span>
                    {s.title}
                  </li>
                ))}
                <li>
                  <Link
                    href={start.href}
                    className="flex h-full min-h-20 flex-col justify-between rounded-xl bg-linear-to-br from-brand to-brand-2 p-3 text-[13px] font-bold text-white"
                  >
                    <span aria-hidden>→</span>
                    {user ? "Mes projets" : "Commencer"}
                  </Link>
                </li>
              </ol>
              <div className="mt-6 flex flex-wrap gap-2" aria-label="Designs disponibles">
                {PLAN_DESIGNS.map((d) => (
                  <span key={d.id} className="flex items-center gap-1.5 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-xs text-ink-soft">
                    <span aria-hidden className="size-4 rounded-full" style={{ background: `linear-gradient(135deg, ${d.primary}, ${d.accent})` }} />
                    {d.name}
                  </span>
                ))}
              </div>
            </div>
            <DocumentMockup />
          </div>
        </section>

        {/* Pour qui */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
            <div className="max-w-2xl">
              <Eyebrow>Pour qui</Eyebrow>
              <Title before="Tous les" highlight="métiers" />
              <p className="mt-4 leading-relaxed text-ink-soft">
                Du commerce de quartier au projet numérique : l&apos;assistant adapte les chiffres et le texte à votre activité.
              </p>
            </div>
            <ul className="mt-10 flex flex-wrap justify-center gap-3 sm:gap-5">
              {AUDIENCE.map((a) => (
                <li key={a.label}>
                  <Hexagon active={a.active}>
                    <span aria-hidden className="block text-2xl">
                      {a.icon}
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold leading-tight">{a.label}</span>
                  </Hexagon>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Tarifs */}
        <section id="tarifs" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
            <div className="max-w-2xl">
              <Eyebrow>Paiement par plan, sans abonnement</Eyebrow>
              <Title before="Nos" highlight="tarifs" />
              <p className="mt-4 leading-relaxed text-ink-soft">
                L&apos;aperçu est gratuit. Un crédit débloque un business plan complet, à vous pour toujours.
              </p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <PriceCard
                name="Aperçu"
                audience="Pour découvrir"
                price="Gratuit"
                rows={["Résumé et présentation du projet", "Chiffres clés", "Avec filigrane, sans téléchargement"]}
                cta={{ href: start.href, label: "Essayer" }}
              />
              {packs.map((p) => {
                const saving = unit * p.credits - p.price_xaf;
                return (
                  <PriceCard
                    key={p.code}
                    name={p.name}
                    audience={PACK_AUDIENCE[p.code] ?? ""}
                    price={formatXaf(p.price_xaf)}
                    highlight={p.code === "pro"}
                    badge={saving > 0 ? `Économie ${formatXaf(saving)}` : undefined}
                    rows={[
                      `${p.credits} business plan${p.credits > 1 ? "s" : ""} complet${p.credits > 1 ? "s" : ""}`,
                      p.credits > 1 ? `Soit ${formatXaf(p.price_xaf / p.credits)} le plan` : "9 parties et plan financier",
                      "PDF et Word, sans filigrane",
                      `${PLAN_DESIGNS.length} designs au choix`,
                    ]}
                    cta={{ href: user ? "/credits" : "/inscription", label: "Choisir" }}
                  />
                );
              })}
            </div>
            <p className="mt-6 text-sm text-muted">Prix en FCFA, toutes taxes comprises. Les crédits n&apos;expirent pas.</p>
          </div>
        </section>

        {/* Questions */}
        <section id="questions" className="scroll-mt-20 border-t border-line bg-surface">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_1.6fr] lg:py-24">
            <div>
              <Eyebrow>Vos questions</Eyebrow>
              <Title before="Questions" highlight="fréquentes" />
            </div>
            <div className="divide-y divide-line rounded-2xl border border-line bg-paper">
              {FAQ.map((f) => (
                <details key={f.q} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display font-semibold text-ink">
                    {f.q}
                    <span aria-hidden className="text-brand transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-2 leading-relaxed text-ink-soft">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Appel final */}
        <section className="px-5 pb-16 sm:px-8">
          <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl bg-linear-to-br from-brand to-flame px-6 py-14 text-white sm:px-12">
            <Arcs className="pointer-events-none absolute -right-24 -top-24 w-[420px] opacity-25 mix-blend-screen" />
            <div className="relative max-w-xl">
              <h2 className="font-display text-3xl font-medium leading-tight sm:text-4xl">Votre plan commence par une phrase.</h2>
              <p className="mt-3 text-white/90">Décrivez votre idée : l&apos;aperçu est gratuit, sans carte ni engagement.</p>
              <Link
                href={start.href}
                className="mt-7 inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-base font-bold text-brand shadow-[0_12px_28px_-14px_rgba(0,0,0,0.45)] transition-colors hover:text-brand-700"
              >
                {user ? "Aller à mes projets" : "Décrire mon idée"}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:pb-24">
          <BrandLink />
          <span>
            {brand.tagline} · Pilote : {brand.pilot.cities.join(", ")} ({brand.pilot.country})
          </span>
        </div>
      </footer>

      <SectionNav items={NAV} cta={start} />
    </>
  );
}

function PriceCard({
  name,
  audience,
  price,
  rows,
  cta,
  highlight = false,
  badge,
}: {
  name: string;
  audience: string;
  price: string;
  rows: string[];
  cta: { href: string; label: string };
  highlight?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-surface p-5 text-center shadow-[0_14px_34px_-26px_rgba(35,36,42,0.45)] ${
        highlight ? "border-brand ring-4 ring-brand/10" : "border-line"
      }`}
    >
      {highlight ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-0.5 text-[11px] font-bold text-white">
          Recommandé
        </span>
      ) : null}
      <p className="mx-auto rounded-lg border border-line px-4 py-1.5 font-display text-sm font-semibold text-ink">{name}</p>
      <p className="mt-2 text-xs text-muted">{audience}</p>
      <ul className="mt-4 divide-y divide-line border-y border-line text-sm text-ink-soft">
        {rows.map((r) => (
          <li key={r} className="py-2.5">
            {r}
          </li>
        ))}
      </ul>
      <Link href={cta.href} className={buttonClass(highlight ? "primary" : "secondary", "mt-5 w-full py-2.5 text-sm")}>
        {cta.label}
      </Link>
      <p className="mt-5 font-display text-3xl font-semibold tabular-nums text-ink">{price}</p>
      <p className="mt-1 h-4 text-xs font-semibold text-ok">{badge ?? ""}</p>
    </div>
  );
}
