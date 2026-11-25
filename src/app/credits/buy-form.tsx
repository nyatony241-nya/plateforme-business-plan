"use client";

import { useActionState } from "react";
import { Field, FormMessage, buttonClass } from "@/components/ui";
import { formatXaf } from "@/lib/format";
import { bestPerPlan, perPlan, saving } from "@/lib/packs";
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
      <div className={`grid gap-4 ${packs.length > 1 ? "sm:grid-cols-2 lg:grid-cols-4" : "max-w-sm"}`}>
        {packs.map((p) => {
          const off = saving(p, packs);
          const best = packs.length > 1 && perPlan(p) === bestPerPlan(packs);
          return (
            <div
              key={p.code}
              className={`relative flex flex-col rounded-2xl border bg-surface p-5 ${best ? "border-brand ring-4 ring-brand/10" : "border-line"}`}
            >
              {best ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-0.5 text-[11px] font-bold whitespace-nowrap text-white">
                  Meilleur prix
                </span>
              ) : null}
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-accent">{p.name}</p>
              <p className="mt-2 font-display text-2xl font-bold whitespace-nowrap text-ink">{formatXaf(p.price_xaf)}</p>
              <p className="mt-1 text-sm text-ink-soft">
                {p.credits > 1 ? `${formatXaf(perPlan(p))} le plan` : "Un projet, débloqué pour toujours"}
              </p>
              {off > 0 ? (
                <p className="mt-2 self-start rounded-full bg-ok/10 px-2.5 py-0.5 text-xs font-bold text-ok">
                  Économisez {off} %
                </p>
              ) : null}
              <div className="mt-auto pt-4">
                <button
                  type="submit"
                  name="pack"
                  value={p.code}
                  disabled={!open || pending}
                  className={buttonClass(best ? "primary" : "secondary", "w-full")}
                >
                  {pending ? "Ouverture…" : "Payer"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {open ? (
        <p className="text-xs text-muted">
          Paiement sécurisé par pawaPay. Togo, Mali et Niger : paiement en ligne bientôt disponible.
        </p>
      ) : null}
    </form>
  );
}
