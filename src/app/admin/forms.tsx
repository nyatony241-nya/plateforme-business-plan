"use client";

import { useActionState } from "react";
import { Field, FormMessage, buttonClass } from "@/components/ui";
import type { AdminPack } from "@/lib/data/admin";
import { initialFormState } from "@/lib/validation";
import { grantCredits, updatePack } from "./actions";

export function PackForm({ pack }: { pack: AdminPack }) {
  const [state, action, pending] = useActionState(updatePack, initialFormState);
  const v = state.values ?? {};
  return (
    <form action={action} className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
      <input type="hidden" name="code" value={pack.code} />
      <p className="font-semibold text-ink sm:col-span-4">{pack.name}</p>
      <Field label="Prix (FCFA)" name="price_xaf" inputMode="numeric" defaultValue={v.price_xaf ?? String(pack.price_xaf)} error={state.fieldErrors?.price_xaf} />
      <Field label="Crédits" name="credits" inputMode="numeric" defaultValue={v.credits ?? String(pack.credits)} error={state.fieldErrors?.credits} />
      <Field
        label="Produit Chariow"
        name="chariow_product_id"
        placeholder="prd_…"
        defaultValue={v.chariow_product_id ?? pack.chariow_product_id ?? ""}
        error={state.fieldErrors?.chariow_product_id}
      />
      <div className="flex items-center gap-3 pb-1">
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" name="active" defaultChecked={pack.active} className="size-4 accent-brand" /> En vente
        </label>
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "…" : "Enregistrer"}
        </button>
      </div>
      {state.message ? (
        <div className="sm:col-span-4">
          <FormMessage ok={state.ok}>{state.message}</FormMessage>
        </div>
      ) : null}
    </form>
  );
}

export function GrantForm() {
  const [state, action, pending] = useActionState(grantCredits, initialFormState);
  const v = state.ok ? {} : (state.values ?? {});
  return (
    <form action={action} className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-[2fr_1fr_2fr_auto] sm:items-end">
      <Field label="E-mail du compte" name="email" type="email" defaultValue={v.email} error={state.fieldErrors?.email} />
      <Field label="Crédits" name="amount" inputMode="numeric" defaultValue={v.amount ?? "1"} error={state.fieldErrors?.amount} />
      <Field label="Motif" name="note" placeholder="Testeur de la bêta" defaultValue={v.note} />
      <button type="submit" disabled={pending} className={buttonClass("primary")}>
        {pending ? "…" : "Offrir"}
      </button>
      {state.message ? (
        <div className="sm:col-span-4">
          <FormMessage ok={state.ok}>{state.message}</FormMessage>
        </div>
      ) : null}
    </form>
  );
}
