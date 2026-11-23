import type { CSSProperties, ReactNode } from "react";
import type { PlanPhoto } from "@/lib/business-plan";
import { SECTIONS, photoSourceName, photoSourceUrl } from "@/lib/business-plan-view";
import { adireTileCss, patternCss, zigzagCss, type PlanDesign } from "@/lib/plan-designs";

/**
 * Éléments visuels propres à chaque design : couverture, titres de partie et chiffres clés.
 * Chaque design a les siens, pour que les 10 documents se distinguent au premier regard.
 */

type Kpi = { emoji: string; label: string; value: string };
export type CoverView = { title: string; subtitle: string; dateLine: string; kpis: Kpi[]; photo?: PlanPhoto };

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const pad = (n: number) => String(n).padStart(2, "0");
const gradient = (d: PlanDesign, angle = 120): CSSProperties => ({
  backgroundImage: `linear-gradient(${angle}deg, ${d.highlight}, ${d.primary})`,
});
const KENTE_BLACK = "#15120c";

/** Traitement des photos : noir et blanc pour Ébène, ton chaud pour Terre cuite. */
export function photoTone(d: PlanDesign): string {
  if (d.id === "ebene") return "grayscale contrast-[1.15]";
  if (d.id === "terre") return "sepia-[0.25] saturate-[1.1]";
  return "";
}

export function PatternBand({ design, className = "" }: { design: PlanDesign; className?: string }) {
  const image = patternCss(design.pattern);
  if (!image) return null;
  return <div aria-hidden className={`h-3.5 rounded-full ${className}`} style={{ backgroundImage: image, backgroundRepeat: "repeat-x" }} />;
}

export function PhotoCredit({ photo, light = false }: { photo: PlanPhoto; light?: boolean }) {
  return (
    <span className={light ? "text-white/85" : "text-muted"}>
      📷 Photo de{" "}
      <a href={photo.photographerUrl} className="underline underline-offset-2">
        {photo.photographer}
      </a>{" "}
      sur{" "}
      <a href={photoSourceUrl(photo)} className="underline underline-offset-2">
        {photoSourceName(photo)}
      </a>
    </span>
  );
}

function Img({ photo, className, style }: { photo: PlanPhoto; className: string; style?: CSSProperties }) {
  /* Photo servie par la banque d'images (lien direct exigé) ; chargée tout de suite pour l'impression en PDF. */
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={photo.src} alt={photo.alt || ""} loading="eager" className={className} style={style} />;
}

function Credit({ photo, light = false, boxed = false }: { photo?: PlanPhoto; light?: boolean; boxed?: boolean }) {
  if (!photo) return null;
  return (
    <p className="mt-2 text-[11px]">
      <span className={boxed ? "rounded bg-black/45 px-2 py-0.5" : ""}>
        <PhotoCredit photo={photo} light={light} />
      </span>
    </p>
  );
}

/* ------------------------------------------------------------------ Titres de partie */

export function SectionHeading({ n, d }: { n: number; d: PlanDesign }) {
  const { emoji, title } = SECTIONS[n - 1];
  const font = "font-(family-name:--plan-display)";
  const e = (
    <span aria-hidden className="font-(family-name:--plan-body) text-[0.8em]">
      {emoji}
    </span>
  );
  const h2 = "break-after-avoid";
  switch (d.heading) {
    case "pastille":
      return (
        <h2 className={`${h2} flex items-center gap-3 border-b border-line pb-3`}>
          <span className="grid size-11 shrink-0 place-items-center rounded-full text-lg font-bold text-white shadow-[0_8px_18px_-8px_rgba(210,57,12,0.8)]" style={gradient(d, 135)}>
            {n}
          </span>
          <span className={`${font} text-2xl font-bold text-(--plan-ink)`}>
            {title} {e}
          </span>
        </h2>
      );
    case "romain":
      return (
        <h2 className={`${h2} text-center`}>
          <span className="block text-xs font-semibold uppercase tracking-[0.32em] text-(--plan-accent)">Chapitre {ROMAN[n - 1]}</span>
          <span className={`${font} mt-1.5 block text-3xl font-semibold text-(--plan-primary)`}>
            {e} {title}
          </span>
          <span aria-hidden className="mt-2 flex items-center justify-center gap-3 text-(--plan-accent)">
            <span className="h-px w-16 bg-current" />❦<span className="h-px w-16 bg-current" />
          </span>
        </h2>
      );
    case "detoure":
      return (
        <h2 className={`${h2} flex items-end gap-4 border-b-2 border-(--plan-primary)/15 pb-2`}>
          <span aria-hidden className={`${font} text-6xl font-black leading-none text-transparent [-webkit-text-stroke:1.6px_var(--plan-primary)]`}>
            {pad(n)}
          </span>
          <span className={`${font} pb-1 text-2xl font-bold text-(--plan-ink)`}>
            {title} {e}
          </span>
        </h2>
      );
    case "etiquette":
      return (
        <h2 className={h2}>
          <span className="flex items-stretch">
            <span className={`${font} flex items-center px-3 text-3xl`} style={{ background: KENTE_BLACK, color: d.highlight }}>
              {pad(n)}
            </span>
            <span className={`${font} flex flex-1 items-center gap-2 bg-(--plan-soft) px-4 py-1.5 text-3xl uppercase tracking-wide text-(--plan-ink)`}>
              {title} {e}
            </span>
          </span>
          <PatternBand design={d} className="h-2 rounded-none" />
        </h2>
      );
    case "zigzag":
      return (
        <h2 className={h2}>
          <span className={`${font} flex items-center gap-3 text-3xl text-(--plan-primary)`}>
            {e}
            <span>
              <span className="text-(--plan-accent)">{n}.</span> {title}
            </span>
          </span>
          <span aria-hidden className="mt-2 block h-2 w-full" style={{ backgroundImage: zigzagCss(d.highlight), backgroundRepeat: "repeat-x" }} />
        </h2>
      );
    case "ornement":
      return (
        <h2 className={`${h2} text-center`}>
          <span className="flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-(--plan-accent)">
            <span aria-hidden className="h-px max-w-24 flex-1" style={{ background: d.highlight }} />
            <span aria-hidden style={{ color: d.highlight }}>◆</span> Partie {n} <span aria-hidden style={{ color: d.highlight }}>◆</span>
            <span aria-hidden className="h-px max-w-24 flex-1" style={{ background: d.highlight }} />
          </span>
          <span className={`${font} mt-2 block text-3xl font-semibold text-(--plan-primary)`}>
            {title} {e}
          </span>
        </h2>
      );
    case "feuille":
      return (
        <h2 className={`${h2} flex items-center gap-3`}>
          <span className="grid size-11 shrink-0 place-items-center rounded-tl-[22px] rounded-tr-md rounded-br-[22px] rounded-bl-md bg-(--plan-primary) text-lg font-bold text-white">
            {n}
          </span>
          <span className={`${font} text-2xl font-semibold text-(--plan-ink)`}>
            {title} {e}
          </span>
          <span aria-hidden className="h-px flex-1 bg-(--plan-primary)/25" />
        </h2>
      );
    case "surligne":
      return (
        <h2 className={`${h2} flex items-center gap-3`}>
          <span className={`${font} grid size-10 shrink-0 place-items-center rounded-full border-2 border-(--plan-primary) text-xl text-(--plan-primary)`}>{n}</span>
          <span
            className={`${font} text-3xl uppercase tracking-wide text-(--plan-ink) [box-decoration-break:clone]`}
            style={{ backgroundImage: `linear-gradient(transparent 56%, ${d.highlight}b3 56%)` }}
          >
            {title}
          </span>
          {e}
        </h2>
      );
    case "magazine":
      return (
        <h2 className={`${h2} border-t-[3px] border-(--plan-ink) pt-3`}>
          <span className="flex items-baseline gap-4">
            <span aria-hidden className={`${font} text-5xl leading-none text-(--plan-ink)`}>
              {pad(n)}
            </span>
            <span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.25em] text-muted">Partie {n}</span>
              <span className={`${font} block text-3xl text-(--plan-ink)`}>
                {title} {e}
              </span>
            </span>
          </span>
        </h2>
      );
    case "bandeau":
      return (
        <h2 className={`${h2} flex items-center gap-3 overflow-hidden rounded-lg bg-(--plan-primary) py-2.5 pr-3 pl-2.5 text-white`}>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white font-bold text-(--plan-primary)">{n}</span>
          <span className={`${font} text-xl font-bold`}>
            {title} {e}
          </span>
          <span aria-hidden className="ml-auto h-7 w-24 shrink-0 rounded opacity-70" style={{ backgroundImage: adireTileCss(d.primary, "#ffffff"), backgroundSize: "28px 28px" }} />
        </h2>
      );
  }
}

/* ------------------------------------------------------------------ Chiffres clés */

const PASTEL = (d: PlanDesign) => [d.primary, d.highlight, d.accent, d.primary];

export function Kpis({ d, kpis }: { d: PlanDesign; kpis: Kpi[] }) {
  const font = "font-(family-name:--plan-display)";
  const grid = "grid grid-cols-2 gap-3 break-inside-avoid sm:grid-cols-4 print:grid-cols-4";
  const value = `${font} mt-1 text-lg font-semibold tabular-nums print:text-base`;
  const label = "mt-2 text-xs font-semibold";
  switch (d.kpi) {
    case "carte":
      return (
        <div className={grid}>
          {kpis.map((k) => (
            <div key={k.label} className="rounded-2xl border border-line bg-white p-4 shadow-[0_14px_30px_-20px_rgba(35,36,42,0.55)] print:p-3">
              <span aria-hidden className="block h-1 w-10 rounded-full" style={gradient(d, 90)} />
              <p aria-hidden className="mt-3 text-2xl">{k.emoji}</p>
              <p className={`${label} text-ink-soft`}>{k.label}</p>
              <p className={`${value} text-(--plan-ink)`}>{k.value}</p>
            </div>
          ))}
        </div>
      );
    case "contour":
      return (
        <div className={grid}>
          {kpis.map((k) => (
            <div key={k.label} className="border border-(--plan-accent)/60 bg-white/60 p-4 text-center print:p-3">
              <p aria-hidden className="text-2xl">{k.emoji}</p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-(--plan-accent)">{k.label}</p>
              <p className={`${value} text-(--plan-primary)`}>{k.value}</p>
            </div>
          ))}
        </div>
      );
    case "barre":
      return (
        <div className={grid}>
          {kpis.map((k) => (
            <div key={k.label} className="border-l-4 border-(--plan-primary) bg-(--plan-soft) p-4 print:p-3">
              <p className="text-xs font-semibold text-ink-soft">
                <span aria-hidden>{k.emoji}</span> {k.label}
              </p>
              <p className={`${font} mt-2 text-xl font-extrabold tabular-nums text-(--plan-primary) print:text-base`}>{k.value}</p>
            </div>
          ))}
        </div>
      );
    case "sombre":
      return (
        <div className={grid}>
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl bg-white/[0.06] p-4 ring-1 ring-white/15 print:p-3">
              <p aria-hidden className="text-2xl">{k.emoji}</p>
              <p className={`${label} text-white/75`}>{k.label}</p>
              <p className={`${font} mt-1 text-2xl tabular-nums tracking-wide print:text-xl`} style={{ color: d.highlight }}>
                {k.value}
              </p>
            </div>
          ))}
        </div>
      );
    case "tampon":
      return (
        <div className={grid}>
          {kpis.map((k, i) => (
            <div key={k.label} className={`rounded-md border-2 border-dashed border-(--plan-accent)/70 bg-white/70 p-4 print:p-3 ${i % 2 ? "rotate-1" : "-rotate-1"}`}>
              <p aria-hidden className="text-2xl">{k.emoji}</p>
              <p className={`${label} uppercase tracking-wide text-(--plan-accent)`}>{k.label}</p>
              <p className={`${value} text-(--plan-primary)`}>{k.value}</p>
            </div>
          ))}
        </div>
      );
    case "dore":
      return (
        <div className={grid}>
          {kpis.map((k) => (
            <div key={k.label} className="border-t pt-3 text-center" style={{ borderColor: d.highlight }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: d.highlight }}>
                <span aria-hidden>{k.emoji}</span> {k.label}
              </p>
              <p className={`${value} text-white`}>{k.value}</p>
            </div>
          ))}
        </div>
      );
    case "pastel":
      return (
        <div className={grid}>
          {kpis.map((k, i) => (
            <div key={k.label} className="rounded-3xl p-4 print:p-3" style={{ background: `color-mix(in srgb, ${PASTEL(d)[i % 4]} 13%, white)` }}>
              <span aria-hidden className="grid size-10 place-items-center rounded-full bg-white text-xl shadow-sm">
                {k.emoji}
              </span>
              <p className={`${label} text-ink-soft`}>{k.label}</p>
              <p className={`${value} text-(--plan-ink)`}>{k.value}</p>
            </div>
          ))}
        </div>
      );
    case "sommet":
      return (
        <div className={grid}>
          {kpis.map((k, i) => (
            <div key={k.label} className="overflow-hidden border border-line bg-white">
              <span aria-hidden className="block h-2" style={{ background: [d.primary, d.accent, d.highlight, d.primary][i % 4] }} />
              <div className="p-4 print:p-3">
                <p aria-hidden className="text-2xl">{k.emoji}</p>
                <p className={`${label} uppercase tracking-wide text-ink-soft`}>{k.label}</p>
                <p className={`${font} mt-1 text-2xl tabular-nums text-(--plan-ink) print:text-xl`}>{k.value}</p>
              </div>
            </div>
          ))}
        </div>
      );
    case "filet":
      return (
        <div className="grid grid-cols-2 gap-y-5 border-y border-(--plan-ink) py-4 break-inside-avoid sm:grid-cols-4 print:grid-cols-4">
          {kpis.map((k, i) => (
            <div key={k.label} className={`px-4 ${i % 2 ? "border-l" : ""} sm:border-l sm:first:border-l-0 print:border-l print:first:border-l-0 border-(--plan-ink)/25`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                <span aria-hidden>{k.emoji}</span> {k.label}
              </p>
              <p className={`${font} mt-1 text-2xl tabular-nums text-(--plan-ink) print:text-xl`}>{k.value}</p>
            </div>
          ))}
        </div>
      );
    case "plein":
      return (
        <div className={grid}>
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl bg-(--plan-primary) p-4 text-white ring-2 ring-white/80 print:p-3">
              <p aria-hidden className="text-2xl">{k.emoji}</p>
              <p className={`${label} text-white/80`}>{k.label}</p>
              <p className={`${value} text-white`}>{k.value}</p>
            </div>
          ))}
        </div>
      );
  }
}

/* ------------------------------------------------------------------ Couvertures */

/** Une couverture remplit la première page du PDF. */
const COVER = "relative flex flex-col overflow-hidden print:min-h-[262mm] print:break-after-page";

function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${className}`}>{children}</p>;
}

function Title({ children, className = "", size = "text-4xl sm:text-5xl" }: { children: ReactNode; className?: string; size?: string }) {
  return <h1 className={`font-(family-name:--plan-display) tracking-tight break-words ${size} ${className}`}>{children}</h1>;
}

function Mosaic({ d }: { d: PlanDesign }) {
  const [p, a, h, w] = [d.primary, d.accent, d.highlight, "#ffffff"];
  const tiles: [string, ReactNode][] = [
    [p, <circle key="c" cx="15" cy="15" r="10" fill={h} />],
    [h, <path key="t" d="M15 4 27 26H3Z" fill={a} />],
    [a, <path key="h" d="M3 15a12 12 0 0 1 24 0Z" fill={w} />],
    [d.soft, <path key="q" d="M0 30A30 30 0 0 1 30 0V30Z" fill={p} />],
    [p, <path key="s" d="M0 6h30M0 13h30M0 20h30M0 27h30" stroke={w} strokeWidth="3" />],
    [h, <circle key="r" cx="15" cy="15" r="9" fill="none" stroke={p} strokeWidth="4" />],
    [a, <path key="v" d="M3 4h24L15 26Z" fill={h} />],
    [d.soft, <path key="l" d="M15 3a12 12 0 0 0 0 24Z" fill={a} />],
    [p, <path key="q2" d="M30 30A30 30 0 0 0 0 0V30Z" fill={h} />],
  ];
  return (
    <div aria-hidden className="grid aspect-square w-3/5 grid-cols-3 sm:w-full print:w-full">
      {tiles.map(([bg, shape], i) => (
        <svg key={i} viewBox="0 0 30 30" className="block size-full" style={{ background: bg }}>
          {shape}
        </svg>
      ))}
    </div>
  );
}

export function Cover({ d, v }: { d: PlanDesign; v: CoverView }) {
  const { photo } = v;
  const kpis = <Kpis d={d} kpis={v.kpis} />;
  switch (d.cover) {
    case "arcs":
      return (
        <header className={`${COVER} rounded-3xl border border-line bg-white p-7 sm:p-10`}>
          <svg aria-hidden viewBox="0 0 400 400" className="pointer-events-none absolute -top-24 -right-24 size-72 sm:-top-28 sm:-right-28 sm:size-[26rem]">
            <defs>
              <linearGradient id={`arcs-${d.id}`} x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor={d.highlight} />
                <stop offset="1" stopColor={d.primary} />
              </linearGradient>
            </defs>
            {[188, 148, 108, 70].map((r, i) => (
              <circle key={r} cx="200" cy="200" r={r} fill="none" stroke={`url(#arcs-${d.id})`} strokeWidth={i === 0 ? 26 : 12} strokeOpacity={0.95 - i * 0.2} />
            ))}
          </svg>
          <div className="relative max-w-[70%] sm:max-w-xl">
            <span className="inline-flex rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white" style={gradient(d, 90)}>
              🚀 Business plan
            </span>
            <Title className="mt-5 font-bold text-(--plan-ink)">{v.title}</Title>
            <span aria-hidden className="mt-4 block h-1.5 w-24 rounded-full" style={gradient(d, 90)} />
            <p className="mt-4 text-lg text-ink-soft">{v.subtitle}</p>
            <p className="mt-1 text-sm text-muted">{v.dateLine}</p>
          </div>
          {photo ? (
            <figure className="relative mt-8 mr-3">
              <span aria-hidden className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl" style={gradient(d)} />
              <Img photo={photo} className="relative aspect-[16/8] w-full rounded-2xl object-cover" />
            </figure>
          ) : null}
          <Credit photo={photo} />
          <div className="mt-auto pt-8">{kpis}</div>
        </header>
      );

    case "cadre":
      return (
        <header className={`${COVER} p-2`}>
          <div className="flex flex-1 flex-col border-2 border-(--plan-primary) p-1.5">
            <div className="flex flex-1 flex-col items-center border border-(--plan-accent) px-5 py-10 text-center sm:px-12">
              <p aria-hidden className="text-3xl leading-none text-(--plan-accent)">
                ❦
              </p>
              <Eyebrow className="mt-4 tracking-[0.34em] text-(--plan-accent)">Business plan</Eyebrow>
              <Title className="mt-4 font-semibold text-(--plan-primary)">{v.title}</Title>
              <span aria-hidden className="mt-4 flex items-center gap-3 text-sm text-(--plan-accent)">
                <span className="h-px w-16 bg-current" />◆<span className="h-px w-16 bg-current" />
              </span>
              <p className="mt-4 text-lg italic text-ink-soft">{v.subtitle}</p>
              {photo ? (
                <figure className="mt-8 w-full max-w-md">
                  <Img photo={photo} className="aspect-[4/3] w-full rounded-t-full border-4 border-white object-cover outline outline-1 outline-(--plan-accent)" />
                  <Credit photo={photo} />
                </figure>
              ) : null}
              <p className="mt-6 text-sm text-muted">{v.dateLine}</p>
              <div className="mt-auto w-full pt-8">{kpis}</div>
            </div>
          </div>
        </header>
      );

    case "partage":
      return (
        <header className={`${COVER} gap-4`}>
          <div className="grid flex-1 overflow-hidden rounded-3xl sm:grid-cols-2 print:grid-cols-2">
            <div className="relative flex flex-col justify-between overflow-hidden bg-(--plan-primary) p-7 pb-20 text-white sm:p-9 sm:pb-24">
              <div className="relative">
                <Eyebrow className="text-white/80">Business plan</Eyebrow>
                <Title className="mt-4 leading-tight font-extrabold">{v.title}</Title>
                <span aria-hidden className="mt-5 block h-1 w-16" style={{ background: d.highlight }} />
                <p className="mt-5 text-lg text-white/90">{v.subtitle}</p>
              </div>
              <p className="relative mt-10 text-sm text-white/75">{v.dateLine}</p>
              <svg aria-hidden viewBox="0 0 400 80" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-16 w-full">
                <path d="M0 40C60 10 120 70 200 40S340 10 400 40V80H0Z" fill={d.highlight} fillOpacity="0.45" />
                <path d="M0 55C70 30 130 80 210 55S340 30 400 55V80H0Z" fill="#ffffff" fillOpacity="0.25" />
              </svg>
            </div>
            <div className="relative min-h-64 bg-(--plan-soft)">
              {photo ? (
                <Img photo={photo} className="absolute inset-0 size-full object-cover" />
              ) : (
                <svg aria-hidden viewBox="0 0 200 200" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <path key={i} d={`M0 ${60 + i * 28}C50 ${40 + i * 28} 100 ${80 + i * 28} 200 ${55 + i * 28}`} fill="none" stroke={d.primary} strokeOpacity={0.15 + i * 0.1} strokeWidth="6" />
                  ))}
                </svg>
              )}
            </div>
          </div>
          <Credit photo={photo} />
          {kpis}
        </header>
      );

    case "kente":
      return (
        <header className={`${COVER} rounded-3xl text-white`} style={{ background: KENTE_BLACK }}>
          <PatternBand design={d} className="h-7 rounded-none" />
          <div className="flex flex-1 flex-col px-7 py-9 sm:px-10">
            <p className="font-(family-name:--plan-display) text-xl tracking-[0.3em]" style={{ color: d.highlight }}>
              Business plan
            </p>
            <Title size="text-6xl sm:text-7xl" className="mt-2 leading-[0.95] uppercase">
              <span style={{ color: d.highlight }}>{v.title}</span>
            </Title>
            <p className="mt-4 text-lg text-white/85">{v.subtitle}</p>
            <p className="mt-1 text-sm text-white/60">{v.dateLine}</p>
            {photo ? (
              <figure className="mt-7">
                <Img photo={photo} className="aspect-[16/8] w-full rounded-xl object-cover" style={{ boxShadow: `0 0 0 3px ${d.highlight}` }} />
                <Credit photo={photo} light />
              </figure>
            ) : null}
            <div className="mt-auto pt-8">{kpis}</div>
          </div>
          <PatternBand design={d} className="h-7 rounded-none" />
        </header>
      );

    case "bogolan":
      return (
        <header className={`${COVER} p-3.5`} style={{ backgroundImage: patternCss(d.pattern), backgroundSize: "28px 14px" }}>
          <div className="flex flex-1 flex-col bg-(--plan-paper) p-6 sm:p-9">
            {photo ? <Img photo={photo} className={`aspect-[16/9] w-full object-cover ${photoTone(d)}`} /> : null}
            <Credit photo={photo} />
            <Eyebrow className={`tracking-[0.26em] text-(--plan-accent) ${photo ? "mt-6" : ""}`}>Business plan</Eyebrow>
            <Title className="mt-2 text-(--plan-primary)">{v.title}</Title>
            <span aria-hidden className="mt-4 block h-2 w-44" style={{ backgroundImage: zigzagCss(d.highlight), backgroundRepeat: "repeat-x" }} />
            <p className="mt-4 text-lg text-ink-soft">{v.subtitle}</p>
            <p className="mt-1 text-sm text-muted">{v.dateLine}</p>
            <div className="mt-auto pt-8">{kpis}</div>
          </div>
        </header>
      );

    case "etoile":
      return (
        <header className={`${COVER} rounded-3xl p-3 text-center text-white`} style={{ background: d.primary }}>
          <div className="relative flex flex-1 flex-col items-center rounded-2xl border px-6 py-10 sm:px-12" style={{ borderColor: `${d.highlight}99` }}>
            {["top-2 left-3", "top-2 right-3", "bottom-2 left-3", "bottom-2 right-3"].map((pos) => (
              <span key={pos} aria-hidden className={`absolute ${pos} text-sm`} style={{ color: d.highlight }}>
                ✦
              </span>
            ))}
            <Eyebrow className="tracking-[0.4em]">
              <span style={{ color: d.highlight }}>✦ Business plan ✦</span>
            </Eyebrow>
            <Title className="mt-5 font-semibold">{v.title}</Title>
            <span aria-hidden className="mt-4 flex items-center gap-3 text-xs" style={{ color: d.highlight }}>
              <span className="h-px w-20 bg-current" />◆<span className="h-px w-20 bg-current" />
            </span>
            <p className="mt-4 text-lg italic text-white/85">{v.subtitle}</p>
            {photo ? (
              <figure className="mt-8">
                <Img photo={photo} className="mx-auto size-44 rounded-full object-cover print:size-40" style={{ boxShadow: `0 0 0 4px ${d.primary}, 0 0 0 6px ${d.highlight}` }} />
                <Credit photo={photo} light />
              </figure>
            ) : null}
            <p className="mt-6 text-sm text-white/65">{v.dateLine}</p>
            <div className="mt-auto w-full pt-8">{kpis}</div>
          </div>
        </header>
      );

    case "organique":
      return (
        <header className={`${COVER} rounded-3xl p-7 sm:p-10`}>
          <svg aria-hidden viewBox="0 0 200 200" className="pointer-events-none absolute -top-16 -right-14 size-72">
            <path d="M44 -6C80 -20 132 4 160 34S206 116 176 152 82 196 46 166 -6 92 6 52 10 8 44 -6Z" fill={d.highlight} fillOpacity="0.22" />
          </svg>
          <svg aria-hidden viewBox="0 0 200 200" className="pointer-events-none absolute top-1/4 -left-28 size-64">
            <path d="M52 10C96 -4 150 22 172 62S188 150 144 178 52 196 24 152 8 24 52 10Z" fill={d.primary} fillOpacity="0.08" />
          </svg>
          <div className="relative grid gap-8 sm:grid-cols-[1.1fr_1fr] sm:items-center print:grid-cols-[1.1fr_1fr] print:items-center">
            <div>
              <p className="text-sm font-semibold text-(--plan-accent)">🌿 Business plan</p>
              <Title className="mt-3 font-semibold text-(--plan-primary)">{v.title}</Title>
              <p className="mt-4 text-lg text-ink-soft">{v.subtitle}</p>
              <p className="mt-2 text-sm text-muted">{v.dateLine}</p>
            </div>
            {photo ? (
              <figure>
                <Img photo={photo} className="aspect-square w-full object-cover" style={{ borderRadius: "58% 42% 55% 45% / 48% 58% 42% 52%" }} />
                <Credit photo={photo} />
              </figure>
            ) : null}
          </div>
          <div className="relative mt-auto pt-10">{kpis}</div>
        </header>
      );

    case "geometrique":
      return (
        <header className={COVER}>
          <div className="grid gap-6 sm:grid-cols-[1fr_1.2fr] print:grid-cols-[1fr_1.2fr]">
            <Mosaic d={d} />
            <div className="flex flex-col justify-center">
              <p className="font-(family-name:--plan-display) text-2xl tracking-[0.22em] text-(--plan-accent)">Business plan</p>
              <Title size="text-6xl sm:text-7xl" className="leading-[0.92] uppercase text-(--plan-primary)">{v.title}</Title>
              <p className="mt-4 text-lg text-ink-soft">{v.subtitle}</p>
              <p className="mt-1 text-sm text-muted">{v.dateLine}</p>
            </div>
          </div>
          {photo ? (
            <figure className="relative mt-9 ml-3">
              <span aria-hidden className="absolute -bottom-3 -left-3 h-2/3 w-1/2" style={{ background: d.highlight }} />
              <Img photo={photo} className="relative aspect-[16/7] w-full object-cover" />
            </figure>
          ) : null}
          <Credit photo={photo} />
          <div className="mt-auto pt-9">{kpis}</div>
        </header>
      );

    case "magazine":
      return (
        <header className={COVER}>
          <div className="flex items-end justify-between border-y-[3px] border-(--plan-ink) py-2">
            <p className="font-(family-name:--plan-display) text-3xl tracking-[0.12em] text-(--plan-ink) sm:text-4xl">BUSINESS PLAN</p>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">N° 01</p>
          </div>
          <p className="mt-1.5 border-b border-(--plan-ink)/30 pb-1.5 text-xs uppercase tracking-[0.18em] text-muted">{v.dateLine}</p>
          <Title size="text-5xl sm:text-7xl" className="mt-8 leading-[1.02] text-(--plan-ink)">{v.title}</Title>
          <p className="mt-5 max-w-2xl border-l-4 border-(--plan-ink) pl-4 text-xl italic text-ink-soft">{v.subtitle}</p>
          {photo ? (
            <figure className="mt-8">
              <Img photo={photo} className={`aspect-[16/8] w-full object-cover ${photoTone(d)}`} />
              <Credit photo={photo} />
            </figure>
          ) : null}
          <div className="mt-auto pt-10">{kpis}</div>
        </header>
      );

    case "adire":
      return (
        <header className={`${COVER} rounded-3xl p-6 sm:p-10`} style={{ backgroundImage: adireTileCss(d.primary, "#ffffff") }}>
          <div className="mx-auto w-full max-w-xl rounded-2xl bg-white p-7 text-center shadow-[0_24px_50px_-24px_rgba(0,0,0,0.6)] sm:p-9">
            <Eyebrow className="tracking-[0.26em] text-(--plan-accent)">Business plan</Eyebrow>
            <Title className="mt-3 font-extrabold text-(--plan-primary)">{v.title}</Title>
            <p className="mt-3 text-lg text-ink-soft">{v.subtitle}</p>
            <p className="mt-1 text-sm text-muted">{v.dateLine}</p>
          </div>
          {photo ? (
            <figure className="mx-auto mt-7 w-full max-w-2xl">
              <Img photo={photo} className="aspect-[16/8] w-full rounded-xl border-[6px] border-white object-cover" />
              <Credit photo={photo} light boxed />
            </figure>
          ) : null}
          <div className="mt-auto pt-8">{kpis}</div>
        </header>
      );
  }
}
