"use client";

import { useActionState } from "react";
import { Button, Field, FormMessage } from "@/components/ui";
import type { City } from "@/lib/data/projects";
import { initialFormState } from "@/lib/validation";
import { createProject } from "./actions";

export function NewProjectForm({ cities }: { cities: City[] }) {
  const [state, action, pending] = useActionState(createProject, initialFormState);
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.message ? <FormMessage ok={false}>{state.message}</FormMessage> : null}
      <Field
        label="Nom du projet"
        name="name"
        placeholder="Ex. Salon de coiffure à Akanda"
        defaultValue={v.name}
        error={e.name}
        required
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field as="select" label="Ville" name="cityId" defaultValue={v.cityId ?? ""} error={e.cityId} required>
          <option value="" disabled>
            Choisir une ville
          </option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </Field>
        <Field
          label="Quartier envisagé"
          name="district"
          placeholder="Facultatif"
          defaultValue={v.district}
          error={e.district}
        />
      </div>
      <Field
        label="Secteur d'activité"
        name="sector"
        placeholder="Ex. coiffure, restauration, lavage auto"
        defaultValue={v.sector}
        error={e.sector}
      />
      <Field
        as="textarea"
        label="Votre idée, avec vos mots"
        name="idea"
        placeholder="Facultatif. L'assistant vous posera les questions manquantes."
        defaultValue={v.idea}
        error={e.idea}
      />
      <Button type="submit" disabled={pending} className="sm:self-start">
        {pending ? "Création…" : "Créer le projet"}
      </Button>
    </form>
  );
}
