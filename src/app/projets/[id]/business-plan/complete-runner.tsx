"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui";
import { completeBusinessPlan } from "./actions";

/** Après paiement : lance la rédaction de la suite du business plan, puis affiche le document complet. */
export function CompleteRunner({ projectId }: { projectId: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setError(null);
    const result = await completeBusinessPlan(projectId).catch(() => ({
      ok: false,
      message: "La rédaction de la suite n'a pas abouti. Réessayez dans un instant.",
    }));
    setRunning(false);
    if (result.ok) router.refresh();
    else setError(result.message ?? "La rédaction de la suite n'a pas abouti.");
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
    // Une seule fois à l'ouverture de la page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="mt-4 rounded-2xl border border-forest/30 bg-forest-50 p-5 print:hidden" aria-live="polite">
      {error ? (
        <>
          <p className="font-semibold text-ink">⚠️ {error}</p>
          <button type="button" onClick={run} disabled={running} className={buttonClass("primary", "mt-4")}>
            Réessayer
          </button>
        </>
      ) : (
        <>
          <p className="font-semibold text-ink">✍️ Rédaction de la suite de votre business plan…</p>
          <p className="mt-1 text-sm text-ink-soft">
            Marché, emplacement, marketing, risques et démarches : environ une minute. Restez sur cette page.
          </p>
        </>
      )}
    </section>
  );
}
