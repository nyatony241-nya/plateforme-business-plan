"use client";

import { useActionState } from "react";
import { Field, FormMessage, buttonClass } from "@/components/ui";
import { formatXaf } from "@/lib/format";
import { PAWAPAY_COUNTRIES, isPawapayCountry } from "@/lib/payments/pawapay-utils";
import { initialFormState } from "@/lib/validation";
import { buyCredits } from "./actions";

type Pack = { code: string; name: string; credits: number; price_xaf: number };

const COUNTRIES = Object.entries(PAWAPAY_COUNTRIES);

export function BuyForm({
  packs,
  open,
  projectId,
  country,
}: {
  packs: Pack[];
  /** Paiement en ligne ouvert (jeton pawaPay configuré). */
  open: boolean;
  projectId?: string;
  /** Pays proposé par défaut (celui du projet). */
  country?: string;
}) {
  const [state, action, pending] = useActionState(buyCredits, initialFormState);
  const v = state.values ?? {};
  const chosen = v.pays ?? (isPawapayCountry(country) ? country : "GA");

  return (
    <form action={action} className="flex flex-col gap-6">
      {projectId ? <input type="hidden" name="projet" value={projectId} /> : null}
      {state.message ? <FormMessage ok={false}>{state.message}</FormMessage> : null}

      {open ? (
        <div className="max-w-sm">
          <Field
            as="select"
            label="Pays de votre compte mobile money"
            name="pays"
            defaultValue={chosen}
            error={state.fieldErrors?.pays}
            hint="Vous choisirez l'opérateur et validerez sur votre téléphone à l'étape suivante."
          >
            {COUNTRIES.map(([code, c]) => (
              <option key={code} value={code}>
                {c.name} · {c.operators}
              </option>
            ))}
          </Field>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-line-strong bg-paper px-5 py-4 text-sm text-ink-soft">
          Le paiement par mobile money ouvre très bientôt.
        </p>
      )}
      <div className={`grid gap-4 ${packs.length > 1 ? "sm:grid-cols-3" : "max-w-sm"}`}>
        {packs.map((p) => (
          <div key={p.code} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-accent">{p.name}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-ink">{formatXaf(p.price_xaf)}</p>
            <p className="mt-1 text-sm text-ink-soft">
              {p.credits} business plan{p.credits > 1 ? "s" : ""} complet{p.credits > 1 ? "s" : ""}
            </p>
            <button
              type="submit"
              name="pack"
              value={p.code}
              disabled={!open || pending}
              className={buttonClass("primary", "mt-4 w-full")}
            >
              {pending ? "Ouverture du paiement…" : "Payer par mobile money"}
            </button>
          </div>
        ))}
      </div>
      {open ? (
        <p className="text-xs text-muted">
          Paiement sécurisé par pawaPay. Togo, Mali et Niger : paiement en ligne bientôt disponible.
        </p>
      ) : null}
    </form>
  );
}
