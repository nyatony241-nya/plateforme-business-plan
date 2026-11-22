import type { CSSProperties, ReactNode } from "react";
import { CashChart } from "@/components/cash-chart";
import { SCENARIO_LABEL } from "@/engine";
import type { PlanPhoto } from "@/lib/business-plan";
import { SECTIONS, buildPlanView, paragraphs, photoSourceName, photoSourceUrl, stars, type PlanViewInput } from "@/lib/business-plan-view";
import { FONT_STACK, getPlanDesign, patternCss, type PlanDesign, type PlanHeading } from "@/lib/plan-designs";
import { LOCKED_CONTENTS, PREVIEW_SECTIONS } from "@/lib/plan-preview";
import { watermarkCss } from "@/lib/watermark";
import { SCENARIO_COLOR, SCENARIO_ORDER } from "@/lib/scenario-colors";

/** Titre de partie, selon le style du design : numéro, pastille ou bande. */
function SectionHeading({ n, heading }: { n: number; heading: PlanHeading }) {
  const { emoji, title } = SECTIONS[n - 1];
  const display = "font-(family-name:--plan-display) text-2xl font-semibold text-(--plan-ink)";
  if (heading === "pastille") {
    return (
      <h2 className={`flex items-center gap-3 break-after-avoid border-b-2 border-(--plan-primary)/25 pb-2.5 ${display}`}>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-(--plan-primary) text-lg font-bold text-white">
          {n}
        </span>
        <span>
          <span aria-hidden className="mr-2">
            {emoji}
          </span>
          {title}
        </span>
      </h2>
    );
  }
  if (heading === "bande") {
    return (
      <h2 className={`flex items-center gap-3 break-after-avoid rounded-lg border-l-4 border-(--plan-primary) bg-(--plan-soft) px-4 py-2.5 ${display}`}>
        <span aria-hidden>{emoji}</span>
        <span>
          <span className="mr-2 text-(--plan-primary)">{n}.</span>
          {title}
        </span>
      </h2>
    );
  }
  return (
    <h2 className={`flex items-center gap-3 break-after-avoid border-b border-line pb-2 ${display}`}>
      <span aria-hidden className="text-2xl">
        {emoji}
      </span>
      <span>
        <span className="mr-2 text-(--plan-accent)">{n}.</span>
        {title}
      </span>
    </h2>
  );
}

function Section({ n, heading, children }: { n: number; heading: PlanHeading; children: ReactNode }) {
  return (
    <section className="mt-12 print:mt-8">
      <SectionHeading n={n} heading={heading} />
      <div className="mt-4 flex flex-col gap-4 leading-relaxed text-ink">{children}</div>
    </section>
  );
}

/** Bande de motif africain (kente, bogolan, adire, wax), si le design en a un. */
function PatternBand({ design, className = "" }: { design: PlanDesign; className?: string }) {
  const image = patternCss(design.pattern);
  if (!image) return null;
  return <div aria-hidden className={`h-3.5 rounded-full ${className}`} style={{ backgroundImage: image, backgroundRepeat: "repeat-x" }} />;
}

function PhotoCredit({ photo, light = false }: { photo: PlanPhoto; light?: boolean }) {
  return (
    <span className={light ? "text-white/80" : "text-muted"}>
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

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {paragraphs(text).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </>
  );
}

function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="break-inside-avoid">
      <h3 className="font-semibold text-ink">{title}</h3>
      <div className="mt-1 text-ink-soft">{children}</div>
    </div>
  );
}

const th = "px-3 py-2 text-left text-xs font-semibold text-muted";
const td = "px-3 py-2 align-top";
const num = "whitespace-nowrap px-3 py-2 text-right tabular-nums";

function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line break-inside-avoid">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

function Photo({ photo, tall = false }: { photo?: PlanPhoto; tall?: boolean }) {
  if (!photo) return null;
  return (
    <figure className="break-inside-avoid">
      {/* Photo servie par la banque d'images (lien direct exigé) ; chargée tout de suite pour l'impression en PDF. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        alt={photo.alt || ""}
        loading="eager"
        className={`w-full rounded-xl object-cover ${tall ? "aspect-[16/8] print:aspect-[16/7]" : "aspect-[16/6] print:aspect-[3/1]"}`}
      />
      <figcaption className="mt-1.5 text-xs">
        <PhotoCredit photo={photo} />
      </figcaption>
    </figure>
  );
}

/** Filigrane de l'aperçu, à l'écran comme à l'impression : « AfriBiz » répété, la copie n'est pas utilisable. */
function Watermark() {
  return (
    <div
      aria-hidden
      data-filigrane="afribiz"
      className="pointer-events-none absolute inset-0 z-10 select-none [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
      style={{ backgroundImage: watermarkCss(), backgroundRepeat: "repeat" }}
    />
  );
}

function Padlock() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="15.3" r="1.6" fill="#cc330a" />
    </svg>
  );
}

/** Partie verrouillée : son titre et ce qu'elle contient, sous un cadenas ; le texte n'existe pas encore. */
function LockedSection({ n, pending = false }: { n: number; pending?: boolean }) {
  const { emoji, title } = SECTIONS[n - 1];
  return (
    <section className="relative mt-6 overflow-hidden rounded-2xl border border-line bg-surface break-inside-avoid">
      <div aria-hidden className="flex select-none flex-col gap-2.5 px-6 py-7 blur-[5px]">
        <div className="h-5 w-2/5 rounded bg-(--plan-primary)/35" />
        <div className="h-2.5 w-full rounded bg-line-strong" />
        <div className="h-2.5 w-11/12 rounded bg-line-strong" />
        <div className="h-2.5 w-4/5 rounded bg-line-strong" />
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="h-10 rounded bg-(--plan-soft)" />
          <div className="h-10 rounded bg-(--plan-soft)" />
          <div className="h-10 rounded bg-(--plan-soft)" />
        </div>
      </div>
      <div className="absolute inset-0 flex items-center gap-4 bg-white/60 px-6">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-linear-to-br from-[#ff8a24] to-[#cc330a] text-white shadow-[0_10px_22px_-10px_rgba(204,51,10,0.8)] [print-color-adjust:exact]">
          {pending ? <span aria-hidden>⏳</span> : <Padlock />}
        </span>
        <div className="min-w-0">
          <h2 className="font-(family-name:--plan-display) text-lg font-semibold text-(--plan-ink)">
            <span aria-hidden className="mr-1.5">
              {emoji}
            </span>
            <span className="mr-1.5 text-(--plan-accent)">{n}.</span>
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-ink-soft">
            {pending ? "Rédaction en cours…" : (LOCKED_CONTENTS[n] ?? []).join(" · ")}
          </p>
        </div>
      </div>
    </section>
  );
}

export function PlanDocumentView(input: PlanViewInput & { preview?: boolean; pending?: boolean; design?: PlanDesign }) {
  const { doc, preview = false, pending = false } = input;
  const v = buildPlanView(input);
  const d = input.design ?? getPlanDesign(null);
  const vars = {
    "--plan-primary": d.primary,
    "--plan-accent": d.accent,
    "--plan-soft": d.soft,
    "--plan-ink": d.ink,
    "--plan-display": FONT_STACK[d.display],
    "--plan-body": FONT_STACK[d.body],
  } as CSSProperties;
  const cover = d.cover === "pleine" && !v.photos.couverture ? "bandeau" : d.cover;
  const kpis = (
    <div className="mt-8 grid grid-cols-2 gap-3 break-inside-avoid sm:grid-cols-4">
      {v.kpis.map((k) => (
        <div key={k.label} className="rounded-xl border border-(--plan-primary)/20 bg-(--plan-soft) p-4 print:p-3">
          <p className="text-2xl" aria-hidden>
            {k.emoji}
          </p>
          <p className="mt-2 text-xs font-semibold text-ink-soft">{k.label}</p>
          <p className="mt-1 font-(family-name:--plan-display) text-lg font-semibold tabular-nums text-(--plan-ink) print:text-sm">{k.value}</p>
        </div>
      ))}
    </div>
  );

  return (
    <article
      style={vars}
      data-design={d.id}
      className="relative rounded-2xl border border-line bg-surface p-6 font-(family-name:--plan-body) [print-color-adjust:exact] [-webkit-print-color-adjust:exact] sm:p-10 print:rounded-none print:border-0 print:p-0"
    >
      {preview && !pending ? <Watermark /> : null}
      {cover === "classique" ? (
        <header className="print:break-after-page">
          <PatternBand design={d} className="mb-6" />
          <Photo photo={v.photos.couverture} tall />
          <p className={`text-xs font-semibold uppercase tracking-[0.14em] text-(--plan-accent) ${v.photos.couverture ? "mt-6" : ""}`}>
            🚀 Business plan
          </p>
          <h1 className="mt-3 font-(family-name:--plan-display) text-4xl font-semibold tracking-tight text-(--plan-ink) sm:text-5xl">{v.title}</h1>
          <p className="mt-3 text-lg text-ink-soft">{v.subtitle}</p>
          <p className="mt-2 text-sm text-muted">{v.dateLine}</p>
          {kpis}
        </header>
      ) : cover === "bandeau" ? (
        <header className="print:break-after-page">
          <div className="overflow-hidden rounded-2xl bg-(--plan-primary) text-white break-inside-avoid">
            <PatternBand design={d} className="rounded-none" />
            <div className="px-6 py-8 sm:px-8 sm:py-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">🚀 Business plan</p>
              <h1 className="mt-3 font-(family-name:--plan-display) text-4xl font-semibold tracking-tight sm:text-5xl">{v.title}</h1>
              <p className="mt-3 text-lg text-white/90">{v.subtitle}</p>
              <p className="mt-2 text-sm text-white/75">{v.dateLine}</p>
            </div>
          </div>
          {v.photos.couverture ? (
            <div className="mt-6">
              <Photo photo={v.photos.couverture} tall />
            </div>
          ) : null}
          {kpis}
        </header>
      ) : (
        <header className="print:break-after-page">
          <PatternBand design={d} className="mb-4" />
          {v.photos.couverture ? (
            <figure className="relative overflow-hidden rounded-2xl break-inside-avoid">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={v.photos.couverture.src}
                alt={v.photos.couverture.alt || ""}
                loading="eager"
                className="aspect-[16/10] w-full object-cover print:aspect-[16/9]"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/35 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/85">🚀 Business plan</p>
                <h1 className="mt-2 font-(family-name:--plan-display) text-4xl font-semibold tracking-tight sm:text-5xl">{v.title}</h1>
                <p className="mt-2 text-lg text-white/90">{v.subtitle}</p>
                <p className="mt-1 text-sm text-white/75">{v.dateLine}</p>
                <figcaption className="mt-3 text-[11px]">
                  <PhotoCredit photo={v.photos.couverture} light />
                </figcaption>
              </div>
            </figure>
          ) : null}
          {kpis}
        </header>
      )}

      <Section n={1} heading={d.heading}>
        <Paragraphs text={doc.resume} />
      </Section>

      <Section n={2} heading={d.heading}>
        <Paragraphs text={doc.projet} />
        <Photo photo={v.photos.projet} />
        <Sub title="🛍️ Ce que nous vendons">
          <ul className="list-disc pl-5">
            {v.offers.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </Sub>
      </Section>

      {preview ? (
        <div className="print:break-before-page">
          {SECTIONS.slice(PREVIEW_SECTIONS).map((_, i) => (
            <LockedSection key={i} n={PREVIEW_SECTIONS + i + 1} pending={pending} />
          ))}
        </div>
      ) : (
        <>
      <Section n={3} heading={d.heading}>
        <Photo photo={v.photos.marche} />
        <Sub title="🧑‍🤝‍🧑 Clientèle">
          <Paragraphs text={doc.marche.clientele} />
        </Sub>
        <Sub title="🏪 Concurrence">
          <Paragraphs text={doc.marche.concurrence} />
        </Sub>
        <Sub title="🛒 Habitudes d'achat">
          <Paragraphs text={doc.marche.tendances} />
        </Sub>
      </Section>

      <Section n={4} heading={d.heading}>
        <Paragraphs text={doc.emplacement.analyse} />
        {doc.emplacement.criteres.length > 0 ? (
          <Table>
            <thead>
              <tr className="border-b border-line">
                <th className={th}>Critère</th>
                <th className={th}>Note</th>
                <th className={th}>Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {doc.emplacement.criteres.map((c) => (
                <tr key={c.critere} className="border-b border-line/70 last:border-0">
                  <td className={`${td} font-semibold`}>{c.critere}</td>
                  <td className={`${td} whitespace-nowrap text-(--plan-accent)`} aria-label={`${c.note} sur 5`}>
                    {stars(c.note)}
                  </td>
                  <td className={`${td} text-ink-soft`}>{c.commentaire}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
        <p className="text-xs text-muted">ℹ️ Notes indicatives, à confirmer par une visite sur place.</p>
      </Section>

      <Section n={5} heading={d.heading}>
        <Sub title="🧱 Investissements de départ">
          <Table>
            <tbody>
              {v.investments.map((inv) => (
                <tr key={inv.label} className="border-b border-line/70">
                  <td className={td}>
                    {inv.label} <span className="text-muted">· {inv.kind}</span>
                  </td>
                  <td className={num}>{inv.amount}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className={td}>Total</td>
                <td className={num}>{v.investmentsTotal}</td>
              </tr>
            </tbody>
          </Table>
        </Sub>
        <Sub title="🏦 Financement">
          <p>{v.financing}</p>
          {v.shortfall ? <p className="mt-1 font-semibold text-danger">{v.shortfall}</p> : null}
        </Sub>
        <Sub title={v.forecastTitle}>
          <Table>
            <thead>
              <tr className="border-b border-line">
                <th className={th}>En FCFA</th>
                {v.forecastYears.map((y) => (
                  <th key={y} className={`${th} text-right`}>
                    {y}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {v.forecastRows.map((row) => (
                <tr key={row.label} className="border-b border-line/70 last:border-0">
                  <td className={td}>{row.label}</td>
                  {row.values.map((value, i) => (
                    <td key={i} className={num}>
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </Sub>
        <Sub title="🔀 Trois scénarios pour la première année">
          <Table>
            <thead>
              <tr className="border-b border-line">
                <th className={th}>Scénario</th>
                <th className={`${th} text-right`}>Ventes</th>
                <th className={`${th} text-right`}>Bénéfice</th>
              </tr>
            </thead>
            <tbody>
              {v.scenarios.map((s) => (
                <tr key={s.label} className="border-b border-line/70 last:border-0">
                  <td className={td}>{s.label}</td>
                  <td className={num}>{s.revenue}</td>
                  <td className={num}>{s.net}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Sub>
        <Sub title="📊 Argent en caisse, mois par mois">
          <div className="rounded-xl border border-line p-3">
            <CashChart
              title="Argent en caisse, mois par mois, selon les trois scénarios"
              months={input.results.realiste.months.map((m) => m.month)}
              series={SCENARIO_ORDER.map((id) => ({
                id,
                label: SCENARIO_LABEL[id],
                color: SCENARIO_COLOR[id],
                values: input.results[id].months.map((m) => m.cash.end),
              }))}
            />
          </div>
        </Sub>
        {v.breakdownLine ? <p>🧮 {v.breakdownLine}</p> : null}
        {v.references.length > 0 ? (
          <Sub title="📍 Repères locaux utilisés">
            <ul className="flex flex-col gap-1.5 text-sm">
              {v.references.map((r) => (
                <li key={r.text}>
                  {r.text}. <span className="text-muted">Source : {r.source}.</span>
                </li>
              ))}
            </ul>
          </Sub>
        ) : null}
        <p className="rounded-xl bg-(--plan-soft) px-4 py-3">👉 {v.outlook}</p>
      </Section>

      <Section n={6} heading={d.heading}>
        <p>
          <strong>🎯 Message :</strong> {doc.marketing.message}
        </p>
        <Photo photo={v.photos.marketing} />
        <Table>
          <thead>
            <tr className="border-b border-line">
              <th className={th}>Canal</th>
              <th className={th}>Action</th>
              <th className={`${th} text-right`}>Budget par mois</th>
            </tr>
          </thead>
          <tbody>
            {v.marketing.map((c, i) => (
              <tr key={`${c.canal}-${i}`} className="border-b border-line/70 last:border-0">
                <td className={`${td} whitespace-nowrap font-semibold`}>
                  <span aria-hidden>{c.emoji}</span> {c.canal}
                </td>
                <td className={`${td} text-ink-soft`}>{c.action}</td>
                <td className={num}>{c.budget}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        {v.marketingWithoutBudget ? (
          <p className="text-sm text-muted">Aucun budget marketing n&apos;est prévu dans le plan financier.</p>
        ) : null}
        <Sub title="🗓️ Les 90 premiers jours">
          <ol className="flex flex-col gap-3">
            {doc.marketing.calendrier.map((p) => (
              <li key={p.periode} className="break-inside-avoid">
                <p className="font-semibold text-ink">📅 {p.periode}</p>
                <ul className="list-disc pl-5">
                  {p.actions.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </Sub>
      </Section>

      <Section n={7} heading={d.heading}>
        <ul className="flex flex-col gap-3">
          {doc.risques.map((x) => (
            <li key={x.risque} className="break-inside-avoid">
              <p className="font-semibold">🔸 {x.risque}</p>
              <p className="text-ink-soft">✅ {x.parade}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section n={8} heading={d.heading}>
        {v.creationLines.length > 0 ? (
          <div className="rounded-xl border border-(--plan-primary)/20 bg-(--plan-soft) px-4 py-3 break-inside-avoid">
            {v.creationLines.map((line) => (
              <p key={line}>🏛️ {line}</p>
            ))}
          </div>
        ) : null}
        <ol className="list-decimal pl-5">
          {doc.demarches.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ol>
        <p className="text-sm text-muted">ℹ️ Frais, délais et pièces à confirmer auprès de l&apos;ANPI-Gabon.</p>
      </Section>

      <Section n={9} heading={d.heading}>
        <Paragraphs text={doc.conclusion} />
      </Section>

        </>
      )}

      <footer className="mt-12 border-t border-line pt-4 text-xs leading-relaxed text-muted">
        <PatternBand design={d} className="mb-4" />
        {v.footer}
      </footer>
    </article>
  );
}
