import type { Metadata } from "next";
import Link from "next/link";
import { ConfigNotice } from "@/components/config-notice";
import { FormMessage } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { SignInForm } from "../forms";

export const metadata: Metadata = { title: "Connexion" };

export default async function SignInPage({ searchParams }: PageProps<"/connexion">) {
  const params = await searchParams;
  const next = typeof params.suite === "string" ? params.suite : undefined;
  const linkError = params.erreur === "lien";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">Connexion</h1>
        <p className="mt-3 text-ink-soft">Retrouvez vos projets.</p>
      </div>
      {isSupabaseConfigured ? null : <ConfigNotice />}
      {linkError ? (
        <FormMessage ok={false}>Ce lien a expiré ou a déjà servi. Connectez-vous ou recommencez l&apos;inscription.</FormMessage>
      ) : null}
      <SignInForm disabled={!isSupabaseConfigured} next={next} />
      <p className="text-sm text-ink-soft">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-brand underline-offset-4 hover:underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
