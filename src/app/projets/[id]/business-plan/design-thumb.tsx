import type { CSSProperties } from "react";
import { adireTileCss, patternCss, zigzagCss, type PlanDesign } from "@/lib/plan-designs";

/** Miniature de la couverture d'un design, pour le choisir d'un coup d'œil. */
export function DesignThumb({ d }: { d: PlanDesign }) {
  const bar = (width: string, background: string, height = 6, extra: CSSProperties = {}) => (
    <span className="block rounded-[2px]" style={{ width, height, background, ...extra }} />
  );
  const base = "relative block h-24 overflow-hidden";
  switch (d.cover) {
    case "arcs":
      return (
        <span className={`${base} bg-white p-2.5`}>
          <svg viewBox="0 0 100 100" className="absolute -top-8 -right-8 size-24">
            {[46, 34, 22].map((r, i) => (
              <circle key={r} cx="50" cy="50" r={r} fill="none" stroke={i ? d.highlight : d.primary} strokeWidth={i ? 5 : 9} strokeOpacity={1 - i * 0.25} />
            ))}
          </svg>
          {bar("34%", `linear-gradient(90deg, ${d.highlight}, ${d.primary})`, 6, { borderRadius: 9 })}
          <span className="mt-2 block">{bar("58%", d.ink, 8)}</span>
          <span className="mt-1.5 block">{bar("40%", "#c9cbd1", 4)}</span>
          <span className="absolute inset-x-2.5 bottom-2.5 grid grid-cols-4 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-3.5 rounded-sm border border-black/10 bg-white shadow-sm" />
            ))}
          </span>
        </span>
      );
    case "cadre":
      return (
        <span className={base} style={{ background: d.paper }}>
          <span className="absolute inset-1.5 border-2" style={{ borderColor: d.primary }} />
          <span className="absolute inset-[9px] border" style={{ borderColor: d.accent }} />
          <span className="absolute inset-x-0 top-3.5 flex flex-col items-center gap-1.5">
            <span className="text-[9px] leading-none" style={{ color: d.accent }}>
              ❦
            </span>
            {bar("52%", d.primary, 7)}
            <span className="mt-0.5 block h-7 w-10 rounded-t-full" style={{ background: d.soft, outline: `1px solid ${d.accent}` }} />
          </span>
        </span>
      );
    case "partage":
      return (
        <span className={`${base} grid grid-cols-2`}>
          <span className="flex flex-col gap-1.5 p-2.5" style={{ background: d.primary }}>
            {bar("80%", "#ffffff", 7)}
            {bar("55%", "#ffffff99", 4)}
            {bar("30%", d.highlight, 3)}
          </span>
          <span className="relative" style={{ background: d.soft }}>
            <span className="absolute inset-3 rounded-full opacity-60" style={{ background: d.highlight }} />
          </span>
        </span>
      );
    case "kente":
      return (
        <span className={`${base} flex flex-col justify-between`} style={{ background: "#15120c" }}>
          <span className="block h-2.5" style={{ backgroundImage: patternCss(d.pattern), backgroundSize: "auto 10px" }} />
          <span className="flex flex-col gap-1.5 px-2.5">
            {bar("70%", d.highlight, 10)}
            {bar("45%", "#ffffff88", 4)}
          </span>
          <span className="block h-2.5" style={{ backgroundImage: patternCss(d.pattern), backgroundSize: "auto 10px" }} />
        </span>
      );
    case "bogolan":
      return (
        <span className={`${base} p-1.5`} style={{ backgroundImage: patternCss(d.pattern), backgroundSize: "16px 8px" }}>
          <span className="flex h-full flex-col gap-1.5 p-2" style={{ background: d.paper }}>
            <span className="block h-6 w-full" style={{ background: d.soft }} />
            {bar("60%", d.primary, 7)}
            <span className="block h-1.5 w-1/2" style={{ backgroundImage: zigzagCss(d.highlight), backgroundSize: "8px 6px" }} />
          </span>
        </span>
      );
    case "etoile":
      return (
        <span className={`${base} p-1.5`} style={{ background: d.primary }}>
          <span className="flex h-full flex-col items-center gap-1.5 rounded border pt-2" style={{ borderColor: `${d.highlight}aa` }}>
            <span className="text-[8px] leading-none" style={{ color: d.highlight }}>
              ✦
            </span>
            {bar("55%", "#ffffff", 7)}
            <span className="mt-0.5 block size-7 rounded-full" style={{ background: "#ffffff22", boxShadow: `0 0 0 1.5px ${d.highlight}` }} />
          </span>
        </span>
      );
    case "organique":
      return (
        <span className={`${base} p-2.5`} style={{ background: d.paper }}>
          <span className="absolute -top-4 -right-4 size-16 rounded-[58%_42%_55%_45%/48%_58%_42%_52%] opacity-40" style={{ background: d.highlight }} />
          <span className="absolute right-3 bottom-3 size-12 rounded-[58%_42%_55%_45%/48%_58%_42%_52%]" style={{ background: d.primary, opacity: 0.75 }} />
          <span className="relative flex flex-col gap-1.5 pt-3">
            {bar("45%", d.primary, 8)}
            {bar("32%", "#c9cbd1", 4)}
          </span>
        </span>
      );
    case "geometrique":
      return (
        <span className={`${base} grid grid-cols-[2.6rem_1fr] gap-2 bg-white p-2`}>
          <span className="grid grid-cols-2 grid-rows-2">
            {[d.primary, d.highlight, d.accent, d.primary].map((c, i) => (
              <span key={i} className={i % 3 ? "" : "rounded-full"} style={{ background: c }} />
            ))}
          </span>
          <span className="flex flex-col justify-center gap-1.5">
            {bar("95%", d.primary, 12)}
            {bar("60%", d.accent, 4)}
          </span>
        </span>
      );
    case "magazine":
      return (
        <span className={`${base} bg-white px-2.5 py-2`}>
          <span className="block border-y-2 py-0.5" style={{ borderColor: d.ink }}>
            {bar("60%", d.ink, 4)}
          </span>
          <span className="mt-2 block">{bar("85%", d.ink, 10)}</span>
          <span className="mt-2 block h-6 w-full bg-[#9a9aa2]" />
        </span>
      );
    case "adire":
      return (
        <span className={`${base} grid place-items-center`} style={{ backgroundImage: adireTileCss(d.primary, "#ffffff"), backgroundSize: "26px 26px" }}>
          <span className="flex w-3/5 flex-col items-center gap-1 rounded bg-white p-2 shadow">
            {bar("80%", d.primary, 7)}
            {bar("50%", "#c9cbd1", 3)}
          </span>
        </span>
      );
  }
}
