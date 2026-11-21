import Link from "next/link";
import type { ReactNode } from "react";
import { StatusBadge, buttonClass } from "@/components/ui";
import { LEGAL_FORM_LABEL, recommendLegalForm } from "@/lib/creation-guide";
import type { ParamProvenance } from "@/lib/data/country-params";
import type { Institution, Procedure, SourceRef } from "@/lib/data/creation";
import { formatDateFr } from "@/lib/data-status";
import { formatXaf } from "@/lib/format";

function Block({ emoji, title, children }: { emoji: string; title: string; children: ReactNode }) {
  return (
    <section className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
        <span aria-hidden>{emoji}</span>
        {title}
      </h2>
      <div className="mt-4 flex flex-col gap-3 leading-relaxed text-ink">{children}</div>
    </section>
  );
}

function SourceLine({ source, date }: { source: SourceRef; date?: string }) {
  return (
    <p className="text-xs text-muted">
      Source :{" "}
      {source.url ? (
        <a href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-forest">
          {source.publisher ?? source.title}
        </a>
      ) : (
        (source.publisher ?? source.title)
      )}
      {date || source.accessedAt ? `, vérifié le ${formatDateFr(date ?? source.accessedAt)}` : ""}
    </p>
  );
}

const PHONE = /\+241[\d\s]{8,14}\d/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/;

export type CreationGuideViewProps = {
  project: { id: string; name: string; staffing: "seul" | "recruter" | null; budget: number | null };
  guide: { procedures: Procedure[]; institution: Institution | null; sources: Map<string, SourceRef> };
  provenance: ParamProvenance[];
  /** Ventes prévues la 1re année (scénario réaliste), si le plan financier existe. */
  revenue1: number | null;
};

/** Page « Créer mon entreprise » : démarches officielles adaptées au projet. */
export function CreationGuideView({ project, guide, provenance, revenue1 }: CreationGuideViewProps) {
  const id = project.id;
  const { form, reason } = recommendLegalForm({ staffing: project.staffing, budget: project.budget });
  const main = guide.procedures.find((p) => p.legalForm === form) ?? guide.procedures[0];
  const other = guide.procedures.find((p) => p !== main);
  const param = (code: string): ParamProvenance | undefined => provenance.find((p) => p.code === code);

  const isl = param("isl_seuil_ca");
  const reel = param("regime_reel_seuil_ca");
  const tva = param("tva_taux");
  const tvaSeuil = param("tva_seuil_ca");
  const patente = param("patente_taux");
  const patenteMin = param("patente_minimum");
  const underIsl = Boolean(isl && revenue1 !== null && revenue1 < isl.value);

  const inst = guide.institution;
  const phones = inst?.phone?.match(PHONE)?.map((p) => p.replace(/\s+/g, " ").trim()) ?? [];
  const email = inst?.phone?.match(EMAIL)?.[0] ?? null;
  const creationFee = main?.details.frais.find((f) => f.libelle === "Création");

  return (
    <>
        <Link href={`/projets/${id}`} className="text-sm font-semibold text-forest hover:underline">
          ← {project.name}
        </Link>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">🏛️ Créer mon entreprise</h1>
        <p className="mt-2 text-ink-soft">
          Au Gabon, tout se fait au guichet unique de l&apos;ANPI, en ligne sur le GNI. Voici ce qu&apos;il vous faut.
        </p>

        {!main ? (
          <p className="mt-8 rounded-2xl border border-line bg-surface p-6 text-ink-soft">
            Les démarches de ce pays ne sont pas encore disponibles.
          </p>
        ) : (
          <>
            <section className="mt-6 rounded-2xl border border-forest/30 bg-forest-50 p-5 sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-forest">Forme conseillée</p>
              <p className="mt-2 font-display text-2xl font-semibold text-ink">{LEGAL_FORM_LABEL[main.legalForm]}</p>
              <p className="mt-2 text-ink-soft">{reason}</p>
              {creationFee ? (
                <p className="mt-3 text-ink">
                  💰 Frais de création : <strong>{formatXaf(creationFee.gabonais)}</strong> pour un Gabonais (
                  {formatXaf(creationFee.non_gabonais)} pour un non-Gabonais).
                </p>
              ) : null}
              {main.details.delai ? <p className="mt-1 text-ink">⏱️ Délai : {main.details.delai.texte}.</p> : null}
              {inst?.website ? (
                <a href={inst.website} target="_blank" rel="noreferrer" className={buttonClass("primary", "mt-5")}>
                  Créer mon entreprise sur le GNI
                </a>
              ) : null}
            </section>

            <Block emoji="🪜" title="Les étapes">
              <ol className="flex flex-col gap-3">
                {main.steps.map((s, i) => (
                  <li key={s.titre} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    <span>
                      <span className="font-semibold">{s.titre}</span>
                      <span className="block text-ink-soft">{s.detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <SourceLine source={main.source} date={main.verifiedAt} />
            </Block>

            <Block emoji="📎" title="Les pièces à fournir">
              <ul className="flex flex-col gap-2">
                {main.details.pieces.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span aria-hidden>☑️</span>
                    {p}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2">
                <StatusBadge status="verifie" />
                <SourceLine source={main.source} date={main.verifiedAt} />
              </div>
            </Block>

            <Block emoji="💰" title="Les frais et le délai">
              {main.details.frais.map((f) => (
                <div key={f.libelle} className="rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{f.libelle}</p>
                    <StatusBadge status={f.statut} />
                  </div>
                  <p className="mt-1 tabular-nums">
                    Gabonais : <strong>{formatXaf(f.gabonais)}</strong> · Non-Gabonais :{" "}
                    <strong>{formatXaf(f.non_gabonais)}</strong>
                  </p>
                  {f.note ? <p className="mt-1 text-sm text-ink-soft">ℹ️ {f.note}</p> : null}
                  {f.source_id && guide.sources.get(f.source_id) ? (
                    <SourceLine source={guide.sources.get(f.source_id)!} />
                  ) : null}
                </div>
              ))}
              {main.details.delai ? (
                <div className="rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">Délai</p>
                    <StatusBadge status={main.details.delai.statut} />
                  </div>
                  <p className="mt-1">{main.details.delai.texte}</p>
                  {main.details.delai.source_id && guide.sources.get(main.details.delai.source_id) ? (
                    <SourceLine source={guide.sources.get(main.details.delai.source_id)!} />
                  ) : null}
                </div>
              ) : null}
            </Block>

            <Block emoji="🧾" title="Après la création : impôts">
              {isl && reel ? (
                <p>
                  {revenue1 !== null ? (
                    <>
                      Avec des ventes prévues d&apos;environ <strong>{formatXaf(revenue1)}</strong> la première année,{" "}
                      {revenue1 < isl.value
                        ? "vous relevez a priori de l'impôt synthétique libératoire, réservé aux petites activités."
                        : revenue1 <= reel.value
                          ? "vous relevez a priori du régime simplifié."
                          : "vous relevez a priori du régime réel."}
                    </>
                  ) : (
                    "Le régime fiscal dépend de votre chiffre d'affaires annuel."
                  )}
                </p>
              ) : null}
              {underIsl ? (
                <p className="text-ink-soft">
                  ℹ️ Son montant suit un barème : demandez-le à votre centre des impôts, muni des documents reçus à la création.
                </p>
              ) : (
              <ul className="flex flex-col gap-1.5 text-ink-soft">
                {isl ? <li>• Impôt synthétique libératoire : chiffre d&apos;affaires de moins de {formatXaf(isl.value)} par an.</li> : null}
                {reel ? <li>• Régime simplifié jusqu&apos;à {formatXaf(reel.value)}, régime réel au-delà.</li> : null}
                {tva && tvaSeuil ? (
                  <li>
                    • TVA à {Math.round(tva.value * 100)} % au-delà de {formatXaf(tvaSeuil.value)} de chiffre d&apos;affaires.
                  </li>
                ) : null}
                {patente && patenteMin ? (
                  <li>
                    • Patente : {(patente.value * 100).toLocaleString("fr-FR")} % du chiffre d&apos;affaires, au moins{" "}
                    {formatXaf(patenteMin.value)} par an.
                  </li>
                ) : null}
              </ul>
              )}
              {project.staffing === "recruter" ? (
                <p className="text-ink-soft">
                  👥 Salariés : déclaration à la CNSS ; les cotisations sont déjà comptées dans votre plan financier.
                </p>
              ) : null}
              {isl ? (
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={isl.status} />
                  <p className="text-xs text-muted">
                    Source :{" "}
                    {isl.source.url ? (
                      <a href={isl.source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                        {isl.source.publisher ?? isl.source.title}
                      </a>
                    ) : (
                      isl.source.title
                    )}
                    , vérifié le {formatDateFr(isl.verifiedAt)}.
                    {isl.status === "verifie" ? "" : " À confirmer auprès de votre centre des impôts."}
                  </p>
                </div>
              ) : null}
            </Block>

            {inst ? (
              <Block emoji="📍" title="Le guichet unique">
                <p className="font-semibold">
                  {inst.acronym} — {inst.name}
                </p>
                {inst.address ? <p>🏢 {inst.address}</p> : null}
                {phones.map((p) => (
                  <p key={p}>
                    📞{" "}
                    <a href={`tel:${p.replace(/\s/g, "")}`} className="font-semibold text-forest underline-offset-2 hover:underline">
                      {p}
                    </a>{" "}
                    ·{" "}
                    <a
                      href={`https://wa.me/${p.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-forest underline-offset-2 hover:underline"
                    >
                      WhatsApp
                    </a>
                  </p>
                ))}
                {email ? (
                  <p>
                    ✉️{" "}
                    <a href={`mailto:${email}`} className="text-forest underline-offset-2 hover:underline">
                      {email}
                    </a>
                  </p>
                ) : null}
                {inst.website ? (
                  <p>
                    🌐{" "}
                    <a href={inst.website} target="_blank" rel="noreferrer" className="text-forest underline-offset-2 hover:underline">
                      {inst.website.replace(/^https?:\/\//, "")}
                    </a>
                  </p>
                ) : null}
                <p>🕘 Horaires : {inst.openingHours ?? "non publiés sur le site officiel ; appelez avant de vous déplacer."}</p>
                <div className="flex items-center gap-2">
                  <StatusBadge status="verifie" />
                  <SourceLine source={inst.source} date={inst.verifiedAt} />
                </div>
              </Block>
            ) : null}

            {other ? (
              <details className="mt-8 rounded-2xl border border-line bg-surface px-5 py-4">
                <summary className="cursor-pointer font-semibold text-forest">
                  Comparer avec : {LEGAL_FORM_LABEL[other.legalForm]}
                </summary>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {[main, other].map((p) => (
                    <div key={p.legalForm} className="rounded-xl border border-line p-4">
                      <p className="font-semibold">{LEGAL_FORM_LABEL[p.legalForm]}</p>
                      {p.summary ? <p className="mt-1 text-sm text-ink-soft">{p.summary}</p> : null}
                      <p className="mt-3 text-sm font-semibold">👍 Avantages</p>
                      <ul className="text-sm text-ink-soft">
                        {p.details.avantages.map((x) => (
                          <li key={x}>• {x}</li>
                        ))}
                      </ul>
                      <p className="mt-3 text-sm font-semibold">👎 Inconvénients</p>
                      <ul className="text-sm text-ink-soft">
                        {p.details.inconvenients.map((x) => (
                          <li key={x}>• {x}</li>
                        ))}
                      </ul>
                      {p.details.frais[0] ? (
                        <p className="mt-3 text-sm">
                          💰 Création : {formatXaf(p.details.frais[0].gabonais)} (Gabonais)
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
                <SourceLine source={other.source} date={other.verifiedAt} />
              </details>
            ) : null}

            <p className="mt-8 text-xs leading-relaxed text-muted">
              Informations relevées sur des sources publiques ; les montants marqués « Estimation » sont à confirmer au
              moment du paiement ou auprès de l&apos;administration. Aucun numéro ni tarif n&apos;est inventé : une
              information absente est signalée comme telle.
            </p>
          </>
        )}
    </>
  );
}
