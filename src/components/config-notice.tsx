/** Affiché tant que la base Supabase n'est pas reliée au déploiement. */
export function ConfigNotice() {
  return (
    <div role="status" className="rounded-2xl border border-accent/40 bg-accent-50/70 p-6 sm:p-8">
      <p className="font-display text-xl font-semibold text-ink">Base de données en cours de raccordement</p>
      <p className="mt-2 text-ink-soft">
        Les comptes et les projets seront disponibles dès que la base sera connectée. Le reste du
        site fonctionne normalement.
      </p>
    </div>
  );
}
