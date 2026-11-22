"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatCompactXaf, formatMonth, formatXaf } from "@/lib/format";

export type ChartSeries = { id: string; label: string; color: string; values: number[] };

const W = 640;
const H = 280;
const M = { top: 16, right: 92, bottom: 34, left: 60 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

/** Pas « rond » pour les graduations : 1, 2, 2,5 ou 5 × 10^n. */
function niceStep(raw: number) {
  if (raw <= 0) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const unit = raw / power;
  const nice = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10;
  return nice * power;
}

/**
 * Trésorerie mois par mois pour plusieurs scénarios.
 * Survol ou flèches du clavier : une ligne verticale suit le mois, l'infobulle donne
 * la valeur de chaque scénario. Les étiquettes en bout de courbe nomment les séries.
 */
export function CashChart({ months, series, title }: { months: string[]; series: ChartSeries[]; title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const n = months.length;

  const { y, ticks } = useMemo(() => {
    const all = series.flatMap((s) => s.values);
    let lo = Math.min(0, ...all);
    let hi = Math.max(0, ...all);
    if (lo === hi) hi = lo + 1;
    const step = niceStep((hi - lo) / 4);
    lo = Math.floor(lo / step) * step;
    hi = Math.ceil(hi / step) * step;
    const tickValues: number[] = [];
    for (let v = lo; v <= hi + step / 2; v += step) tickValues.push(Math.round(v));
    const scale = (v: number) => M.top + PLOT_H - ((v - lo) / (hi - lo)) * PLOT_H;
    return { y: scale, ticks: tickValues };
  }, [series]);

  const x = (i: number) => M.left + (n <= 1 ? 0 : (i / (n - 1)) * PLOT_W);

  // Étiquettes de fin de courbe, écartées d'au moins 14 px pour ne pas se chevaucher.
  const endLabels = useMemo(() => {
    const placed = series
      .map((s) => ({ id: s.id, label: s.label, color: s.color, y: y(s.values[n - 1] ?? 0) }))
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < placed.length; i++) {
      if (placed[i].y - placed[i - 1].y < 14) placed[i].y = placed[i - 1].y + 14;
    }
    return placed;
  }, [series, y, n]);

  function indexFromPointer(event: PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || n === 0) return null;
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - M.left) / PLOT_W) * (n - 1));
    return Math.min(n - 1, Math.max(0, i));
  }

  function onKey(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key === "ArrowRight") setActive((i) => Math.min(n - 1, (i ?? -1) + 1));
    else if (event.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? n) - 1));
    else if (event.key === "Escape") setActive(null);
    else return;
    event.preventDefault();
  }

  const yearStarts = months.map((_, i) => i).filter((i) => i % 12 === 0);

  return (
    <figure className="relative">
      <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="text-sm font-bold text-ink">{title}</span>
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          {series.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5 text-xs text-ink-soft">
              <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </span>
      </figcaption>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-accent"
        role="img"
        aria-label={`${title}. Utilisez les flèches gauche et droite pour lire chaque mois.`}
        tabIndex={0}
        onPointerMove={(e) => setActive(indexFromPointer(e))}
        onPointerDown={(e) => setActive(indexFromPointer(e))}
        onPointerLeave={() => setActive(null)}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        {ticks.map((t, i) => (
          <g key={`${t}-${i}`}>
            <line
              x1={M.left}
              x2={M.left + PLOT_W}
              y1={y(t)}
              y2={y(t)}
              stroke={t === 0 ? "var(--color-ink-soft)" : "var(--color-line)"}
              strokeWidth={t === 0 ? 1 : 1}
            />
            <text x={M.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">
              {formatCompactXaf(t)}
            </text>
          </g>
        ))}

        {yearStarts.map((i) => (
          <text key={i} x={x(i)} y={H - 10} textAnchor={i === 0 ? "start" : "middle"} fontSize="11" fill="var(--color-muted)">
            {`An ${i / 12 + 1}`}
          </text>
        ))}

        {series.map((s) => (
          <path
            key={s.id}
            d={s.values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ")}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {endLabels.map((l) => (
          <g key={l.id}>
            <circle cx={M.left + PLOT_W + 8} cy={l.y} r={3} fill={l.color} />
            <text x={M.left + PLOT_W + 15} y={l.y + 4} fontSize="11" fill="var(--color-ink-soft)">
              {l.label}
            </text>
          </g>
        ))}

        {active !== null ? (
          <g pointerEvents="none">
            <line x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + PLOT_H} stroke="var(--color-ink-soft)" strokeWidth={1} />
            {series.map((s) => (
              <circle key={s.id} cx={x(active)} cy={y(s.values[active])} r={4.5} fill={s.color} stroke="#fff" strokeWidth={2} />
            ))}
          </g>
        ) : null}
      </svg>

      {active !== null ? (
        <div
          role="status"
          className="pointer-events-none absolute top-10 z-10 w-56 rounded-xl border border-line bg-surface p-3 text-xs shadow-lg"
          style={{
            left: `${(x(active) / W) * 100}%`,
            transform: x(active) > W / 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
          }}
        >
          <p className="font-bold text-ink">
            {formatMonth(months[active])} · mois {active + 1}
          </p>
          <ul className="mt-2 space-y-1">
            {series.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-ink-soft">
                  <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="font-semibold tabular-nums text-ink">{formatXaf(s.values[active])}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </figure>
  );
}
