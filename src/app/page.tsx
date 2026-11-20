import { BrandLink } from "@/components/brand";
import { ButtonLink, StatusBadge } from "@/components/ui";
import { brand } from "@/config/brand";

const engagements = [
  {
    title: "Chaque chiffre a un statut",
    text: "Vérifié, estimation ou hypothèse : vous savez toujours d'où vient un montant, avec sa source et sa date.",
  },
  {
    title: "Des calculs qui ne doivent rien au hasard",
    text: "Un moteur financier fait tous les calculs, en trois scénarios. L'intelligence artificielle rédige, elle ne calcule pas.",
  },
  {
    title: "Les démarches officielles, datées",
    text: "Création, impôts, sécurité sociale : les informations viennent des administrations, avec leur date de vérification.",
  },
];

const etapes = [
  { title: "Décrivez votre idée", text: "Avec vos mots, en quelques phrases." },
  { title: "Complétez l'essentiel", text: "Ville, quartier, budget : l'assistant pose seulement les questions utiles." },
  { title: "Recevez votre plan", text: "Marché, emplacement, finances sur 3 ou 5 ans, marketing des 90 premiers jours." },
  { title: "Ajustez et exportez", text: "Modifiez un chiffre, tout se recalcule. Export PDF et Word pour la banque." },
];

export default function HomePage() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <BrandLink />
        <nav className="flex items-center gap-1 sm:gap-3">
          <a href="#fonctionnement" className="hidden px-3 py-2 text-sm font-semibold text-ink-soft hover:text-forest sm:inline">
            Comment ça marche
          </a>
          <span className="hidden sm:block">
            <ButtonLink href="/connexion" variant="ghost" className="px-3">
              Connexion
            </ButtonLink>
          </span>
          <ButtonLink href="/inscription" className="px-4 py-2.5 text-sm sm:text-[0.95rem]">
            Commencer
          </ButtonLink>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl gap-12 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:pb-24 lg:pt-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold">
              Pilote au {brand.pilot.country} · {brand.pilot.cities.join(", ")}
            </p>
            <h1 className="mt-4 font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
              Votre idée, chiffrée et prête pour la banque.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              Décrivez votre projet avec vos mots. Vous obtenez un business plan fondé sur les
              réalités de votre ville : loyers, prix, démarches, avec la source de chaque chiffre.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/inscription">Créer mon projet</ButtonLink>
              <ButtonLink href="/connexion" variant="secondary">
                J&apos;ai déjà un compte
              </ButtonLink>
            </div>
          </div>

          <figure
            aria-label="Aperçu d'un plan : chaque ligne affiche son statut"
            className="rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_0_var(--color-line),0_24px_48px_-32px_rgba(20,32,27,0.35)] sm:p-8"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Extrait de plan</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">Salon de coiffure · Akanda</p>
            <ul className="mt-6 divide-y divide-line">
              {[
                { label: "Taux de TVA applicable", status: "verifie" as const },
                { label: "Loyer d'un local de 30 m²", status: "estimation" as const },
                { label: "Clientes par jour la première année", status: "hypothese" as const },
                { label: "Frais de création d'entreprise", status: "verifie" as const },
              ].map((row) => (
                <li key={row.label} className="flex items-center justify-between gap-4 py-3.5">
                  <span className="text-[0.95rem] text-ink-soft">{row.label}</span>
                  <StatusBadge status={row.status} />
                </li>
              ))}
            </ul>
            <figcaption className="mt-5 text-sm text-muted">
              Source et date de relevé affichées pour chaque ligne.
            </figcaption>
          </figure>
        </section>

        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-3">
            {engagements.map((item) => (
              <div key={item.title}>
                <div className="h-1 w-10 rounded-full bg-gold" />
                <h2 className="mt-5 font-display text-2xl font-semibold leading-snug text-ink">{item.title}</h2>
                <p className="mt-3 leading-relaxed text-ink-soft">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="fonctionnement" className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
          <h2 className="font-display text-4xl font-semibold tracking-tight text-ink">Comment ça marche</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {etapes.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-line bg-surface p-6">
                <span className="font-display text-3xl font-semibold text-gold">{index + 1}</span>
                <h3 className="mt-3 text-lg font-bold text-ink">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{step.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12">
            <ButtonLink href="/inscription">Commencer gratuitement</ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>
            {brand.name} · {brand.tagline}
          </span>
          <span>Pilote : {brand.pilot.cities.join(", ")} ({brand.pilot.country})</span>
        </div>
      </footer>
    </>
  );
}
