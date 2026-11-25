import type { CSSProperties, ReactNode } from "react";
import { CashChart } from "@/components/cash-chart";
import { SCENARIO_LABEL } from "@/engine";
import type { PlanDocument, PlanPhoto } from "@/lib/business-plan";
import { SECTIONS, buildPlanView, paragraphs, stars, type PlanViewInput } from "@/lib/business-plan-view";
import { FONT_STACK, getPlanDesign, type PlanDesign } from "@/lib/plan-designs";
import { Cover, PatternBand, PhotoCredit, SectionHeading, photoTone } from "./design-parts";
import { LOCKED_CONTENTS, PREVIEW_SECTIONS } from "@/lib/plan-preview";
import { watermarkCss } from "@/lib/watermark";
import { SCENARIO_COLOR, SCENARIO_ORDER } from "@/lib/scenario-colors";

const SWOT_BOXES = [
  { key: "forces", emoji: "💪", title: "Forces", color: "#1f7a4d" },
  { key: "faiblesses", emoji: "🔧", title: "Faiblesses", color: "#8f5c0e" },
  { key: "opportunites", emoji: "🚀", title: "Opportunités", color: "var(--plan-primary)" },
  { key: "menaces", emoji: "⚡", title: "Menaces", color: "#b42318" },
] as const;

/** Analyse SWOT en quatre cases : interne (forces, faiblesses) puis externe (opportunités, menaces). */
function Swot({ swot }: { swot: NonNullable<PlanDocument["swot"]> }) {
  return (
    <div className="grid gap-3 break-inside-avoid sm:grid-cols-2 print:grid-cols-2">
      {SWOT_BOXES.map((b) => (
        <div
          key={b.key}
          className="rounded-xl border border-line bg-white/70 p-4 print:p-3"
          style={{ borderTopWidth: 4, borderTopColor: b.color }}
        >
          <p className="font-semibold" style={{ color: b.color }}>
            <span aria-hidden>{b.emoji}</span> {b.title}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {swot[b.key].map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Section({ n, d, children }: { n: number; d: PlanDesign; children: ReactNode }) {
  return (
    <section className="mt-12 print:mt-8">
      <SectionHeading n={n} d={d} />
      <div className="mt-5 flex flex-col gap-4 leading-relaxed text-ink">{children}</div>
    </section>
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
      <h3 className="font-semibold text-(--plan-primary)">{title}</h3>
      <div className="mt-1 text-ink-soft">{children}</div>
    </div>
  );
}

const th = "px-3 py-2 text-left text-xs font-semibold text-muted";
const td = "px-3 py-2 align-top";
const num = "whitespace-nowrap px-3 py-2 text-right tabular-nums";

function Table({ children }: { children: ReactNode }) {
  return (
    <div className="plan-table overflow-x-auto rounded-xl border border-line break-inside-avoid">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

function Photo({ photo, tall = false, tone = "" }: { photo?: PlanPhoto; tall?: boolean; tone?: string }) {
  if (!photo) return null;
  return (
    <figure className="break-inside-avoid">
      {/* Photo servie par la banque d'images (lien direct exigé) ; chargée tout de suite pour l'impression en PDF. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        alt={photo.alt || ""}
        loading="eager"
        className={`w-full rounded-xl object-cover ${tone} ${tall ? "aspect-[16/8] print:aspect-[16/7]" : "aspect-[16/6] print:aspect-[3/1]"}`}
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
    "--plan-paper": d.paper,
    "--plan-display": FONT_STACK[d.display],
    "--plan-body": FONT_STACK[d.body],
    background: d.paper,
  } as CSSProperties;
  const tone = photoTone(d);

  return (
    <article
      style={vars}
      data-design={d.id}
      data-plan-table={d.table}
      className="relative rounded-2xl border border-line p-6 font-(family-name:--plan-body) [font-synthesis:none] [print-color-adjust:exact] [-webkit-print-color-adjust:exact] sm:p-10 print:rounded-none print:border-0 print:p-0"
    >
      {/* Fond des pages du PDF, marges comprises. */}
      {d.paper !== "#ffffff" ? <style>{`@media print{html,body{background:${d.paper}!important}}`}</style> : null}
      {preview && !pending ? <Watermark /> : null}
      <Cover d={d} v={{ title: v.title, subtitle: v.subtitle, dateLine: v.dateLine, kpis: v.kpis, photo: v.photos.couverture }} />

      <Section n={1} d={d}>
        <Paragraphs text={doc.resume} />
      </Section>

      <Section n={2} d={d}>
        <Paragraphs text={doc.projet} />
        <Photo photo={v.photos.projet} tone={tone} />
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
      <Section n={3} d={d}>
        <Photo photo={v.photos.marche} tone={tone} />
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

      <Section n={4} d={d}>
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

      <Section n={5} d={d}>
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
        <p className="rounded-xl border-l-4 border-(--plan-primary) bg-(--plan-soft) px-4 py-3">👉 {v.outlook}</p>
      </Section>

      <Section n={6} d={d}>
        <p>
          <strong>🎯 Message :</strong> {doc.marketing.message}
        </p>
        <Photo photo={v.photos.marketing} tone={tone} />
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

      <Section n={7} d={d}>
        {doc.swot ? <Swot swot={doc.swot} /> : null}
        {doc.swot ? <h3 className="font-semibold text-(--plan-primary)">⚠️ Principaux risques et parades</h3> : null}
        <ul className="flex flex-col gap-3">
          {doc.risques.map((x) => (
            <li key={x.risque} className="break-inside-avoid">
              <p className="font-semibold">🔸 {x.risque}</p>
              <p className="text-ink-soft">✅ {x.parade}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section n={8} d={d}>
        {v.creationLines.length > 0 ? (
          <div className="rounded-xl border border-(--plan-primary)/20 bg-(--plan-soft) px-4 py-3 break-inside-avoid">
            {v.creationLines.map((line) => (
              <p key={line}>🏛️ {line}</p>
            ))}
          </div>
        ) : null}
        <ol className="list-decimal pl-5">
          {doc.demarches.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="text-sm text-muted">ℹ️ Frais, délais et pièces à confirmer auprès de {v.agency}.</p>
      </Section>

      <Section n={9} d={d}>
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
