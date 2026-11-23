"use client";

import { useFormStatus } from "react-dom";
import { FONT_STACK, PLAN_DESIGNS } from "@/lib/plan-designs";
import { setPlanDesign } from "./actions";
import { DesignThumb } from "./design-thumb";

function Swatch({ id, current }: { id: string; current: string }) {
  const { pending, data } = useFormStatus();
  const d = PLAN_DESIGNS.find((x) => x.id === id)!;
  const chosen = pending ? data?.get("design") === id : current === id;
  return (
    <button
      type="submit"
      name="design"
      value={d.id}
      aria-pressed={chosen}
      disabled={pending}
      title={`${d.description} · ${d.signature}`}
      className={`group flex w-full flex-col overflow-hidden rounded-xl border bg-surface text-left transition-shadow disabled:cursor-wait ${
        chosen ? "border-brand ring-4 ring-brand/15" : "border-line hover:shadow-[0_10px_24px_-18px_rgba(35,36,42,0.6)]"
      }`}
    >
      <span aria-hidden className="block border-b border-line">
        <DesignThumb d={d} />
      </span>
      <span className="px-3 py-2">
        <span className="block text-sm font-semibold text-ink" style={{ fontFamily: FONT_STACK[d.display] }}>
          {d.name}
        </span>
        <span className="block text-[11px] leading-snug text-muted">{d.signature}</span>
      </span>
    </button>
  );
}

/** Choix du design du business plan : 10 designs, appliqués à l'écran, au PDF et au Word. */
export function DesignPicker({ projectId, current }: { projectId: string; current: string }) {
  return (
    <details className="mt-4 rounded-2xl border border-line bg-surface px-5 py-4 print:hidden" open>
      <summary className="cursor-pointer text-sm font-semibold text-ink">
        🎨 Design du document{" "}
        <span className="font-normal text-muted">· {PLAN_DESIGNS.find((d) => d.id === current)?.name ?? "Flamme"}</span>
      </summary>
      <form action={setPlanDesign.bind(null, projectId)} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PLAN_DESIGNS.map((d) => (
          <Swatch key={d.id} id={d.id} current={current} />
        ))}
      </form>
    </details>
  );
}
