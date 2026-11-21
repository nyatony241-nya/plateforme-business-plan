import type { ReactNode } from "react";
import { buildPlanView, paragraphs, type PlanViewInput } from "@/lib/business-plan-view";

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="mt-10 print:mt-8">
      <h2 className="break-after-avoid font-display text-2xl font-semibold text-ink">
        <span className="mr-2 text-gold">{n}.</span>
        {title}
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

export function PlanDocumentView(input: PlanViewInput) {
  const { doc } = input;
  const v = buildPlanView(input);

  return (
    <article className="rounded-2xl border border-line bg-surface p-6 sm:p-10 print:rounded-none print:border-0 print:p-0">
      <header className="border-b border-line pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Business plan</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{v.title}</h1>
        <p className="mt-3 text-lg text-ink-soft">{v.subtitle}</p>
        <p className="mt-2 text-sm text-muted">{v.dateLine}</p>
      </header>

      <Section n={1} title="Résumé">
        <Paragraphs text={doc.resume} />
      </Section>

      <Section n={2} title="Le projet">
        <Paragraphs text={doc.projet} />
        <Sub title="Ce que nous vendons">
          <ul className="list-disc pl-5">
            {v.offers.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </Sub>
      </Section>

      <Section n={3} title="Le marché">
        <Sub title="Clientèle">
          <Paragraphs text={doc.marche.clientele} />
        </Sub>
        <Sub title="Concurrence">
          <Paragraphs text={doc.marche.concurrence} />
        </Sub>
        <Sub title="Habitudes d'achat">
          <Paragraphs text={doc.marche.tendances} />
        </Sub>
      </Section>

      <Section n={4} title="L'emplacement">
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
                  <td className={`${td} whitespace-nowrap tabular-nums`}>{c.note} / 5</td>
                  <td className={`${td} text-ink-soft`}>{c.commentaire}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
        <p className="text-xs text-muted">Notes indicatives, à confirmer par une visite sur place.</p>
      </Section>

      <Section n={5} title="Le plan financier">
        <Sub title="Investissements de départ">
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
        <Sub title="Financement">
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
        <Sub title="Trois scénarios pour la première année">
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
        <p>{v.outlook}</p>
      </Section>

      <Section n={6} title="Le marketing">
        <p>
          <strong>Message :</strong> {doc.marketing.message}
        </p>
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
                <td className={`${td} font-semibold`}>{c.canal}</td>
                <td className={`${td} text-ink-soft`}>{c.action}</td>
                <td className={num}>{c.budget}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        {v.marketingWithoutBudget ? (
          <p className="text-sm text-muted">Aucun budget marketing n&apos;est prévu dans le plan financier.</p>
        ) : null}
        <Sub title="Les 90 premiers jours">
          <ol className="flex flex-col gap-3">
            {doc.marketing.calendrier.map((p) => (
              <li key={p.periode} className="break-inside-avoid">
                <p className="font-semibold text-ink">{p.periode}</p>
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

      <Section n={7} title="Les risques">
        <ul className="flex flex-col gap-3">
          {doc.risques.map((x) => (
            <li key={x.risque} className="break-inside-avoid">
              <p className="font-semibold">{x.risque}</p>
              <p className="text-ink-soft">{x.parade}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section n={8} title="Les démarches">
        <ol className="list-decimal pl-5">
          {doc.demarches.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ol>
        <p className="text-sm text-muted">Frais, délais et pièces à confirmer auprès de l&apos;ANPI-Gabon.</p>
      </Section>

      <Section n={9} title="Conclusion">
        <Paragraphs text={doc.conclusion} />
      </Section>

      <footer className="mt-12 border-t border-line pt-4 text-xs leading-relaxed text-muted">{v.footer}</footer>
    </article>
  );
}
