"use client";

import { useActionState } from "react";
import { Button, Field, FormMessage } from "@/components/ui";
import { BUDGET_OPTIONS, MODE_OPTIONS, STAFFING_OPTIONS } from "@/lib/project-options";
import { initialFormState } from "@/lib/validation";
import { generatePlan } from "./actions";

export function GenerateForm({
  projectId,
  defaults,
  submitLabel = "Générer mon plan financier",
}: {
  projectId: string;
  defaults: { budget: number | null; mode: string | null; staffing: string | null };
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState(generatePlan.bind(null, projectId), initialFormState);
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.message ? <FormMessage ok={false}>{state.message}</FormMessage> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field as="select" label="Budget de départ" name="budget" defaultValue={v.budget ?? (defaults.budget ? String(defaults.budget) : "")} error={e.budget} required>
          <option value="" disabled>
            Choisir
          </option>
          {BUDGET_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Field>
        <Field as="select" label="Où vendrez-vous ?" name="mode" defaultValue={v.mode ?? defaults.mode ?? ""} error={e.mode} required>
          <option value="" disabled>
            Choisir
          </option>
          {MODE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Field>
        <Field as="select" label="Personnel" name="staffing" defaultValue={v.staffing ?? defaults.staffing ?? ""} error={e.staffing} required>
          <option value="" disabled>
            Choisir
          </option>
          {STAFFING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Field>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Button type="submit" disabled={pending} className="sm:self-start">
          {pending ? "Préparation de votre plan…" : submitLabel}
        </Button>
        <p aria-live="polite" className="text-sm text-muted">
          {pending
            ? "L'IA prépare les hypothèses, puis le moteur calcule. Comptez 30 à 60 secondes."
            : "Vous n'avez aucun chiffre à saisir : tout est proposé automatiquement."}
        </p>
      </div>
    </form>
  );
}
