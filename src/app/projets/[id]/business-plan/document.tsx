import type { ReactNode } from "react";
import { CashChart } from "@/components/cash-chart";
import { SCENARIO_LABEL } from "@/engine";
import type { PlanPhoto } from "@/lib/business-plan";
import { SECTIONS, buildPlanView, paragraphs, photoSourceName, stars, type PlanViewInput } from "@/lib/business-plan-view";
import { SCENARIO_COLOR, SCENARIO_ORDER } from "@/lib/scenario-colors";

function Section({ n, children }: { n: number; children: ReactNode }) {
  const { emoji, title } = SECTIONS[n - 1];
  return (
    <section className="mt-12 print:mt-8">
      <h2 className="flex items-center gap-3 break-after-avoid border-b border-line pb-2 font-display text-2xl font-semibold text-ink">
        <span aria-hidden className="text-2xl">
          {emoji}
        </span>
        <span>
          <span className="mr-2 text-gold">{n}.</span>
          {title}
        </span>
      </h2>
      <div className="mt-4 flex flex-col gap-4 leading-relaxed text-ink">{children}</div>
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
      <figcaption className="mt-1.5 text-xs text-muted">
        📷 Photo :{" "}
        <a href={photo.photographerUrl} className="underline-offset-2 hover:underline">
          {photo.photographer}
        </a>{" "}
        sur{" "}
        <a href={photo.pageUrl} className="underline-offset-2 hover:underline">
          {photoSourceName(photo)}
        </a>
      </figcaption>
    </figure>
  );
}

export function PlanDocumentView(input: PlanViewInput) {
  const { doc } = input;
  const v = buildPlanView(input);

  return (
    <article className="rounded-2xl border border-line bg-surface p-6 sm:p-10 print:rounded-none print:border-0 print:p-0">
      <header>
        <Photo photo={v.photos.couverture} tall />
        <p className={`text-xs font-semibold uppercase tracking-[0.14em] text-gold ${v.photos.couverture ? "mt-6" : ""}`}>
          🚀 Business plan
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{v.title}</h1>
        <p className="mt-3 text-lg text-ink-soft">{v.subtitle}</p>
        <p className="mt-2 text-sm text-muted">{v.dateLine}</p>
        <div className="mt-8 grid grid-cols-2 gap-3 break-inside-avoid sm:grid-cols-4">
          {v.kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-forest/20 bg-forest-50 p-4 print:p-3">
              <p className="text-2xl" aria-hidden>
                {k.emoji}
              </p>
              <p className="mt-2 text-xs font-semibold text-ink-soft">{k.label}</p>
              <p className="mt-1 font-display text-lg font-semibold tabular-nums text-ink print:text-sm">{k.value}</p>
            </div>
          ))}
        </div>
      </header>

      <Section n={1}>
        <Paragraphs text={doc.resume} />
      </Section>

      <Section n={2}>
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

      <Section n={3}>
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

      <Section n={4}>
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
                  <td className={`${td} whitespace-nowrap text-gold`} aria-label={`${c.note} sur 5`}>
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

      <Section n={5}>
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
        <p className="rounded-xl bg-gold-50 px-4 py-3">👉 {v.outlook}</p>
      </Section>

      <Section n={6}>
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

      <Section n={7}>
        <ul className="flex flex-col gap-3">
          {doc.risques.map((x) => (
            <li key={x.risque} className="break-inside-avoid">
              <p className="font-semibold">🔸 {x.risque}</p>
              <p className="text-ink-soft">✅ {x.parade}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section n={8}>
        {v.creationLines.length > 0 ? (
          <div className="rounded-xl border border-forest/20 bg-forest-50 px-4 py-3 break-inside-avoid">
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

      <Section n={9}>
        <Paragraphs text={doc.conclusion} />
      </Section>

      <footer className="mt-12 border-t border-line pt-4 text-xs leading-relaxed text-muted">{v.footer}</footer>
    </article>
  );
}
