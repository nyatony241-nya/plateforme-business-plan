"use client";

import { useActionState } from "react";
import { Field, FormMessage, buttonClass } from "@/components/ui";
import { formatXaf } from "@/lib/format";
import { initialFormState } from "@/lib/validation";
import { buyCredits } from "./actions";

type Pack = { code: string; name: string; credits: number; price_xaf: number };

export function BuyForm({
  packs,
  open,
  projectId,
  defaults,
}: {
  packs: Pack[];
  /** Paiement en ligne ouvert (clés configurées). */
  open: boolean;
  projectId?: string;
  defaults: { prenom: string; nom: string };
}) {
  const [state, action, pending] = useActionState(buyCredits, initialFormState);
  const v = state.values ?? {};
  const best = Math.min(...packs.map((p) => p.price_xaf / p.credits));

  return (
    <form action={action} className="flex flex-col gap-6">
      {projectId ? <input type="hidden" name="projet" value={projectId} /> : null}
      {state.message ? <FormMessage ok={false}>{state.message}</FormMessage> : null}
      {state.fieldErrors?.pack ? <FormMessage ok={false}>{state.fieldErrors.pack}</FormMessage> : null}

      {open ? (
        <fieldset className="grid gap-4 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-3">
          <legend className="px-1 text-sm font-semibold text-ink-soft">Vos coordonnées pour le paiement</legend>
          <Field label="Prénom" name="prenom" defaultValue={v.prenom ?? defaults.prenom} error={state.fieldErrors?.prenom} autoComplete="given-name" />
          <Field label="Nom" name="nom" defaultValue={v.nom ?? defaults.nom} error={state.fieldErrors?.nom} autoComplete="family-name" />
          <Field
            label="Numéro Mobile Money"
            name="telephone"
            defaultValue={v.telephone}
            error={state.fieldErrors?.telephone}
            hint="Airtel Money ou Moov Money"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="077 12 34 56"
          />
        </fieldset>
      ) : (
        <p className="rounded-2xl border border-dashed border-line-strong bg-paper px-5 py-4 text-sm text-ink-soft">
          Le paiement par Mobile Money ouvre très bientôt.
        </p>
      )}
      <div className={`grid gap-4 ${packs.length > 1 ? "sm:grid-cols-3" : "max-w-sm"}`}>
        {packs.map((p) => {
          const perPlan = Math.round(p.price_xaf / p.credits);
          return (
            <div key={p.code} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-accent">{p.name}</p>
              <p className="mt-2 font-display text-3xl font-semibold text-ink">{formatXaf(p.price_xaf)}</p>
              <p className="mt-1 text-sm text-ink-soft">
                {p.credits} business plan{p.credits > 1 ? "s" : ""} complet{p.credits > 1 ? "s" : ""}
              </p>
              <p className="mt-1 text-xs text-muted">
                {p.credits > 1 ? `soit ${formatXaf(perPlan)} le plan` : " "}
                {p.price_xaf / p.credits === best && p.credits > 1 ? " · le meilleur prix" : ""}
              </p>
              <button
                type="submit"
                name="pack"
                value={p.code}
                disabled={!open || pending}
                className={buttonClass(packs.length === 1 || p.code === "pro" ? "primary" : "secondary", "mt-4 w-full")}
              >
                {pending ? "Ouverture du paiement…" : "Payer par Mobile Money"}
              </button>
            </div>
          );
        })}
      </div>

    </form>
  );
}
