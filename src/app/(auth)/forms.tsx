"use client";

import { useActionState } from "react";
import { Button, Field, FormMessage } from "@/components/ui";
import { initialFormState } from "@/lib/validation";
import { signIn, signUp } from "./actions";

export function SignUpForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(signUp, initialFormState);

  if (state.ok && state.message) {
    return <FormMessage ok>{state.message}</FormMessage>;
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.message ? <FormMessage ok={false}>{state.message}</FormMessage> : null}
      <Field
        label="Nom complet"
        name="fullName"
        autoComplete="name"
        defaultValue={state.values?.fullName}
        error={state.fieldErrors?.fullName}
        required
      />
      <Field
        label="Adresse e-mail"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
        required
      />
      <Field
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="8 caractères au minimum."
        error={state.fieldErrors?.password}
        required
      />
      <Button type="submit" disabled={pending || disabled}>
        {pending ? "Création du compte…" : "Créer mon compte"}
      </Button>
    </form>
  );
}

export function SignInForm({ disabled, next }: { disabled: boolean; next?: string }) {
  const [state, action, pending] = useActionState(signIn, initialFormState);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.message ? <FormMessage ok={false}>{state.message}</FormMessage> : null}
      {next ? <input type="hidden" name="suite" value={next} /> : null}
      <Field
        label="Adresse e-mail"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
        required
      />
      <Field
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="current-password"
        error={state.fieldErrors?.password}
        required
      />
      <Button type="submit" disabled={pending || disabled}>
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
