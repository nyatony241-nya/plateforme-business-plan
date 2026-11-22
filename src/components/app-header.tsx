import Link from "next/link";
import { BrandLink } from "@/components/brand";

/** En-tête de l'espace connecté. Sans nom (base non raccordée), pas de déconnexion. */
export function AppHeader({ name, admin = false }: { name?: string | null; admin?: boolean }) {
  return (
    <header className="border-b border-line bg-surface print:hidden">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <BrandLink href={name ? "/tableau-de-bord" : "/"} />
        {name ? (
          <div className="flex items-center gap-3">
            {admin ? (
              <Link href="/admin" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft hover:text-forest">
                🛠️ Admin
              </Link>
            ) : null}
            <Link href="/credits" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft hover:text-forest">
              🪙 Crédits
            </Link>
            <span className="hidden text-sm text-ink-soft sm:inline">{name}</span>
            <form action="/deconnexion" method="post">
              <button type="submit" className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft hover:text-forest">
                Déconnexion
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </header>
  );
}
