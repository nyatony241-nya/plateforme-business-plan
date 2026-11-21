"use client";

import { useActionState } from "react";
import { Button, FormMessage } from "@/components/ui";
import { initialFormState } from "@/lib/validation";
import { writeBusinessPlan } from "./actions";

export function WriteButton({ projectId, label }: { projectId: string; label: string }) {
  const [state, action, pending] = useActionState(writeBusinessPlan.bind(null, projectId), initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.message ? <FormMessage ok={false}>{state.message}</FormMessage> : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Button type="submit" disabled={pending} className="sm:self-start">
          {pending ? "Rédaction en cours…" : label}
        </Button>
        {pending ? (
          <p aria-live="polite" className="text-sm text-muted">
            Comptez 30 à 60 secondes.
          </p>
        ) : null}
      </div>
    </form>
  );
}
