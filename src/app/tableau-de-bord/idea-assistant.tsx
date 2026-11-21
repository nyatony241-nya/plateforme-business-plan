"use client";

import { useActionState, useState } from "react";
import { Button, Field, FormMessage } from "@/components/ui";
import { BUDGET_OPTIONS, MODE_OPTIONS, STAFFING_OPTIONS } from "@/lib/project-options";
import { initialFormState } from "@/lib/validation";
import { analyzeIdeaAction, createFromAssistant, type AnalysisState } from "./actions";

type City = { id: string; name: string };

const EXAMPLE =
  "Ex. : Je veux ouvrir une petite boutique de chaussettes à Akanda. Je serai seul au début, j'ai environ 2 millions.";

/** Libellé marqué « à choisir » quand l'assistant n'a pas trouvé l'information dans l'idée. */
const label = (text: string, found: unknown) => (found ? text : `${text} — à choisir`);

export function IdeaAssistant({ cities }: { cities: City[] }) {
  const [analysis, analyze, analyzing] = useActionState<AnalysisState, FormData>(analyzeIdeaAction, {
    ok: false,
    idea: "",
  });
  const [created, create, creating] = useActionState(createFromAssistant, initialFormState);
  const [editing, setEditing] = useState(false);

  const a = analysis.analysis;
  const showConfirm = Boolean(a) && !editing;
  const v = created.values ?? {};
  const e = created.fieldErrors ?? {};

  if (!showConfirm) {
    return (
      <form action={(fd) => { setEditing(false); analyze(fd); }} className="flex flex-col gap-4">
        {analysis.message ? <FormMessage ok={false}>{analysis.message}</FormMessage> : null}
        <Field
          as="textarea"
          label="💡 Décrivez votre idée, avec vos mots"
          name="idea"
          rows={5}
          defaultValue={analysis.idea}
          placeholder={EXAMPLE}
          hint="Ce que vous voulez vendre, où, seul ou avec du personnel, votre budget si vous le connaissez."
          required
        />
        <Button type="submit" disabled={analyzing} className="sm:self-start">
          {analyzing ? "Lecture de votre idée…" : "Continuer"}
        </Button>
      </form>
    );
  }

  return (
    <form action={create} className="flex flex-col gap-4" noValidate>
      {created.message ? <FormMessage ok={false}>{created.message}</FormMessage> : null}
      <input type="hidden" name="idea" value={analysis.idea} />

      <div className="rounded-xl border border-forest/20 bg-forest-50 p-4">
        <p className="text-sm font-semibold text-forest">Voici ce que j&apos;ai compris</p>
        <p className="mt-1 text-ink">{a!.summary}</p>
        {a!.clarification ? <p className="mt-2 text-sm font-semibold text-gold">❓ {a!.clarification}</p> : null}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-2 text-sm font-semibold text-forest underline-offset-2 hover:underline"
        >
          Modifier mon idée
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom du projet" name="name" defaultValue={v.name ?? a!.name} error={e.name} required />
        <Field label="Secteur" name="sector" defaultValue={v.sector ?? a!.sector} error={e.sector} />
        <Field
          as="select"
          label={label("Ville", a!.cityId)}
          name="cityId"
          defaultValue={v.cityId ?? a!.cityId ?? ""}
          error={e.cityId}
          required
        >
          <option value="" disabled>
            Choisir
          </option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Field>
        <Field label="Quartier (facultatif)" name="district" defaultValue={v.district ?? a!.district} error={e.district} />
        <Field
          as="select"
          label={label("Budget de départ", a!.budget)}
          name="budget"
          defaultValue={v.budget ?? (a!.budget ? String(a!.budget) : "")}
          error={e.budget}
          required
        >
          <option value="" disabled>
            Choisir
          </option>
          {BUDGET_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Field>
        <Field
          as="select"
          label={label("Où vendrez-vous ?", a!.mode)}
          name="mode"
          defaultValue={v.mode ?? a!.mode ?? ""}
          error={e.mode}
          required
        >
          <option value="" disabled>
            Choisir
          </option>
          {MODE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Field>
        <div className="sm:col-span-2">
          <Field
            as="select"
            label={label("Personnel", a!.staffing)}
            name="staffing"
            defaultValue={v.staffing ?? a!.staffing ?? ""}
            error={e.staffing}
            required
          >
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
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Button type="submit" disabled={creating} className="sm:self-start">
          {creating ? "Création de votre plan…" : "Créer mon projet et mon plan"}
        </Button>
        <p aria-live="polite" className="text-sm text-muted">
          {creating
            ? "Le projet est créé, puis l'IA prépare le plan financier. Comptez 30 à 60 secondes."
            : "Aucun chiffre à saisir : le plan financier est préparé automatiquement."}
        </p>
      </div>
    </form>
  );
}
