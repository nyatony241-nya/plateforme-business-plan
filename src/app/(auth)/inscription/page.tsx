import type { Metadata } from "next";
import Link from "next/link";
import { ConfigNotice } from "@/components/config-notice";
import { isSupabaseConfigured } from "@/lib/env";
import { SignUpForm } from "../forms";

export const metadata: Metadata = { title: "Créer un compte" };

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">Créer un compte</h1>
        <p className="mt-3 text-ink-soft">Votre premier projet en quelques minutes.</p>
      </div>
      {isSupabaseConfigured ? null : <ConfigNotice />}
      <SignUpForm disabled={!isSupabaseConfigured} />
      <p className="text-sm text-ink-soft">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-semibold text-brand underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
