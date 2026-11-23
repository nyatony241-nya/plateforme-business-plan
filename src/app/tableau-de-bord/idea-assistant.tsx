"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Button, Field, FormMessage } from "@/components/ui";
import { BUDGET_OPTIONS, MODE_OPTIONS, STAFFING_OPTIONS } from "@/lib/project-options";
import { initialFormState } from "@/lib/validation";
import { analyzeIdeaAction, createFromAssistant, type AnalysisState } from "./actions";

type City = { id: string; name: string; countryName: string };

const EXAMPLE =
  "Ex. : Je veux ouvrir une petite boutique de chaussettes à Akanda. Je serai seul au début, j'ai environ 2 millions.";

export function IdeaAssistant({
  cities,
  initial = { ok: false, idea: "" },
}: {
  cities: City[];
  /** État de départ (aperçu ou reprise). */
  initial?: AnalysisState;
}) {
  const [analysis, analyze, analyzing] = useActionState<AnalysisState, FormData>(analyzeIdeaAction, initial);
  const [created, create, creating] = useActionState(createFromAssistant, initialFormState);
  const [editing, setEditing] = useState(false);
  const [forced, setForced] = useState(false);

  const a = analysis.analysis;
  // Une idée trop vague : on propose d'abord de la préciser, sans l'imposer.
  const needsDetail = Boolean(a?.clarification) && !forced;
  const showConfirm = Boolean(a) && !editing && !needsDetail;
  const v = created.values ?? {};
  const e = created.fieldErrors ?? {};

  if (!showConfirm) {
    return (
      <form
        action={(fd) => {
          setEditing(false);
          setForced(false);
          analyze(fd);
        }}
        className="flex flex-col gap-4"
      >
        {analysis.message ? <FormMessage ok={false}>{analysis.message}</FormMessage> : null}
        {a?.clarification && !editing ? (
          <div className="rounded-xl border border-accent/40 bg-accent-50 p-4">
            <p className="font-semibold text-ink">❓ {a.clarification}</p>
            <p className="mt-1 text-sm text-ink-soft">Ajoutez cette précision à votre texte, puis continuez.</p>
          </div>
        ) : null}
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Button type="submit" disabled={analyzing} className="sm:self-start">
            {analyzing ? "Lecture de votre idée…" : "Continuer"}
          </Button>
          {a?.clarification && !editing ? (
            <button
              type="button"
              onClick={() => setForced(true)}
              className="text-sm font-semibold text-brand underline-offset-2 hover:underline sm:self-center"
            >
              Continuer sans préciser
            </button>
          ) : null}
        </div>
      </form>
    );
  }

  const fields: { key: string; found: boolean; field: ReactNode }[] = [
    { key: "name", found: true, field: <Field key="name" label="Nom du projet" name="name" defaultValue={v.name ?? a!.name} error={e.name} required /> },
    { key: "sector", found: true, field: <Field key="sector" label="Secteur" name="sector" defaultValue={v.sector ?? a!.sector} error={e.sector} /> },
    {
      key: "cityId",
      found: Boolean(a!.cityId),
      field: (
        <Field key="cityId" as="select" label="Ville et pays" name="cityId" defaultValue={v.cityId ?? a!.cityId ?? ""} error={e.cityId} required>
          <option value="" disabled>
            Choisir
          </option>
          {[...new Set(cities.map((c) => c.countryName))].map((country) => (
            <optgroup key={country} label={country}>
              {cities
                .filter((c) => c.countryName === country)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </Field>
      ),
    },
    {
      key: "district",
      found: true,
      field: <Field key="district" label="Quartier (facultatif)" name="district" defaultValue={v.district ?? a!.district} error={e.district} />,
    },
    {
      key: "budget",
      found: Boolean(a!.budget),
      field: (
        <Field
          key="budget"
          as="select"
          label="Budget de départ"
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
      ),
    },
    {
      key: "mode",
      found: Boolean(a!.mode),
      field: (
        <Field key="mode" as="select" label="Où vendrez-vous ?" name="mode" defaultValue={v.mode ?? a!.mode ?? ""} error={e.mode} required>
          <option value="" disabled>
            Choisir
          </option>
          {MODE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Field>
      ),
    },
    {
      key: "staffing",
      found: Boolean(a!.staffing),
      field: (
        <Field key="staffing" as="select" label="Personnel" name="staffing" defaultValue={v.staffing ?? a!.staffing ?? ""} error={e.staffing} required>
          <option value="" disabled>
            Choisir
          </option>
          {STAFFING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Field>
      ),
    },
  ];
  // Seules les réponses manquantes sont demandées ; le reste est replié, modifiable.
  const missing = fields.filter((f) => !f.found);
  const known = fields.filter((f) => f.found);

  return (
    <form action={create} className="flex flex-col gap-4" noValidate>
      {created.message ? <FormMessage ok={false}>{created.message}</FormMessage> : null}
      <input type="hidden" name="idea" value={analysis.idea} />

      <div className="rounded-xl border border-brand/20 bg-brand-50 p-4">
        <p className="text-sm font-semibold text-brand">Voici ce que j&apos;ai compris</p>
        <p className="mt-1 text-ink">{a!.summary}</p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-2 text-sm font-semibold text-brand underline-offset-2 hover:underline"
        >
          Modifier mon idée
        </button>
      </div>

      {missing.length > 0 ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-ink">Il me manque {missing.length === 1 ? "une réponse" : `${missing.length} réponses`} :</p>
          {missing.map((f) => f.field)}
        </div>
      ) : null}

      <details className="rounded-xl border border-line bg-surface px-4 py-3" open={Object.keys(e).length > 0}>
        <summary className="cursor-pointer text-sm font-semibold text-brand">Vérifier ou modifier les autres informations</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">{known.map((f) => f.field)}</div>
      </details>

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
