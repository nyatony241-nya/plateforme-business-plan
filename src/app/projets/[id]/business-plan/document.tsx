import type { ReactNode } from "react";
import { SCENARIO_LABEL, type PlanResult, type ScenarioId } from "@/engine";
import { INVESTMENT_KINDS, type Assumptions } from "@/lib/assumptions";
import { monthlyMarketingBudget, splitBudget, type PlanDocument } from "@/lib/business-plan";
import { formatDateFr } from "@/lib/data-status";
import { formatMonth, formatXaf } from "@/lib/format";
import { ownerIncome } from "@/lib/owner-income";

type Props = {
  doc: PlanDocument;
  a: Assumptions;
  results: Record<ScenarioId, PlanResult>;
  project: { name: string; sector: string | null; district: string | null; city: string | null; country: string };
  minimumWage: number;
};

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="mt-10 break-inside-avoid-page print:mt-8">
      <h2 className="font-display text-2xl font-semibold text-ink">
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
      {text
        .split(/\n+/)
        .filter((p) => p.trim())
        .map((p, i) => (
          <p key={i}>{p}</p>
        ))}
    </>
  );
}

function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
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

export function PlanDocumentView({ doc, a, results, project, minimumWage }: Props) {
  const r = results.realiste;
  const kind = (k: string) => INVESTMENT_KINDS.find((x) => x.value === k)?.label ?? k;
  const budget = monthlyMarketingBudget(a);
  const amounts = splitBudget(budget, doc.marketing.canaux);
  const be = r.indicators.breakEvenMonth;
  const pay = a.staff.length === 0 ? ownerIncome(r.years, minimumWage)[0] : null;
  const place = [project.district, project.city, project.country].filter(Boolean).join(", ");

  return (
    <article className="rounded-2xl border border-line bg-surface p-6 sm:p-10 print:rounded-none print:border-0 print:p-0">
      <header className="border-b border-line pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Business plan</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{project.name}</h1>
        <p className="mt-3 text-lg text-ink-soft">{[project.sector, place].filter(Boolean).join(" · ")}</p>
        <p className="mt-2 text-sm text-muted">Document établi le {formatDateFr(doc.generation.generatedAt)}</p>
      </header>

      <Section n={1} title="Résumé">
        <Paragraphs text={doc.resume} />
      </Section>

      <Section n={2} title="Le projet">
        <Paragraphs text={doc.projet} />
        <Sub title="Ce que nous vendons">
          <ul className="list-disc pl-5">
            {a.offers.map((o) => (
              <li key={o.id}>
                {o.label} — {formatXaf(o.unitPrice)}
              </li>
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
              {a.investments.map((inv) => (
                <tr key={inv.id} className="border-b border-line/70">
                  <td className={td}>
                    {inv.label} <span className="text-muted">· {kind(inv.kind)}</span>
                  </td>
                  <td className={num}>{formatXaf(inv.amount)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className={td}>Total</td>
                <td className={num}>{formatXaf(r.financing.investmentsTotal)}</td>
              </tr>
            </tbody>
          </Table>
        </Sub>
        <Sub title="Financement">
          <p>
            Argent nécessaire au départ, y compris les premiers mois d&apos;activité :{" "}
            <strong className="text-ink">{formatXaf(r.financing.totalNeed)}</strong>. Financement prévu :{" "}
            <strong className="text-ink">{formatXaf(r.financing.resources.total)}</strong> (apport{" "}
            {formatXaf(r.financing.resources.equity)}
            {r.financing.resources.loans > 0 ? `, prêts ${formatXaf(r.financing.resources.loans)}` : ""}
            {r.financing.resources.grants > 0 ? `, aides ${formatXaf(r.financing.resources.grants)}` : ""}).
          </p>
          {r.financing.shortfall > 0 ? (
            <p className="mt-1 font-semibold text-danger">
              Il manque {formatXaf(r.financing.shortfall)} pour passer le mois le plus difficile.
            </p>
          ) : null}
        </Sub>
        <Sub title={`Prévisions sur ${r.years.length} ans (scénario réaliste)`}>
          <Table>
            <thead>
              <tr className="border-b border-line">
                <th className={th}>En FCFA</th>
                {r.years.map((y) => (
                  <th key={y.year} className={`${th} text-right`}>
                    An {y.year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["Ventes", "revenue"],
                  ["Bénéfice", "netResult"],
                  ["Argent en caisse en fin d'année", "cashEnd"],
                ] as const
              ).map(([label, key]) => (
                <tr key={key} className="border-b border-line/70 last:border-0">
                  <td className={td}>{label}</td>
                  {r.years.map((y) => (
                    <td key={y.year} className={num}>
                      {formatXaf(y[key])}
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
              {(["prudent", "realiste", "optimiste"] as const).map((id) => (
                <tr key={id} className="border-b border-line/70 last:border-0">
                  <td className={td}>{SCENARIO_LABEL[id]}</td>
                  <td className={num}>{formatXaf(results[id].years[0].revenue)}</td>
                  <td className={num}>{formatXaf(results[id].years[0].netResult)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Sub>
        <p>
          {be
            ? `Dans le scénario réaliste, l'activité devient rentable en ${formatMonth(r.months[be - 1].month)}.`
            : "Dans le scénario réaliste, l'activité n'atteint pas la rentabilité sur la période étudiée."}
          {pay
            ? pay.loss
              ? " La première année est en perte : l'entrepreneur ne pourra pas se verser de salaire."
              : ` Travaillant seul, l'entrepreneur pourra se verser environ ${formatXaf(
                  Math.round(pay.monthly / 1000) * 1000,
                )} par mois la première année.`
            : ""}
        </p>
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
            {doc.marketing.canaux.map((c, i) => (
              <tr key={`${c.canal}-${i}`} className="border-b border-line/70 last:border-0">
                <td className={`${td} font-semibold`}>{c.canal}</td>
                <td className={`${td} text-ink-soft`}>{c.action}</td>
                <td className={num}>{budget > 0 ? formatXaf(amounts[i]) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        {budget === 0 ? (
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

      <footer className="mt-12 border-t border-line pt-4 text-xs leading-relaxed text-muted">
        Les chiffres de ce document sont des hypothèses proposées automatiquement puis calculées par un moteur
        financier ; ils ne proviennent pas d&apos;une étude de terrain et doivent être vérifiés. Montants en francs CFA,
        hors taxes.
      </footer>
    </article>
  );
}
