import Link from "next/link";
import { Card, StatusBadge } from "@/components/ui";
import { LEGAL_FORM_LABEL, recommendLegalForm } from "@/lib/creation-guide";
import type { ParamProvenance } from "@/lib/data/country-params";
import { formatXaf } from "@/lib/format";

const KEY_PARAMS = ["is_taux", "imf_taux", "tva_taux", "revenu_minimum_mensuel", "isl_seuil_ca"];

function value(p: ParamProvenance) {
  if (p.unit === "pourcentage") return `${(p.value * 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
  if (p.unit === "xaf") return formatXaf(p.value);
  return `${p.value} an${p.value > 1 ? "s" : ""}`;
}

/**
 * Démarches pour un pays sans fiche officielle détaillée : les étapes communes aux pays de l'OHADA,
 * l'organisme compétent et les règles fiscales du référentiel, avec leur source.
 */
export function GenericCreationGuide({
  project,
  country,
  agency,
  agencyUrl,
  provenance,
}: {
  project: { id: string; name: string; staffing: "seul" | "recruter" | null; budget: number | null };
  country: string;
  agency: string;
  agencyUrl: string | null;
  provenance: ParamProvenance[];
}) {
  const { form, reason } = recommendLegalForm(project);
  const steps = [
    "Choisissez la forme juridique et le nom de votre entreprise.",
    "Rassemblez les pièces : pièce d'identité, justificatif de domicile, déclaration sur l'honneur de non-condamnation (le casier judiciaire suit), bail ou titre du local.",
    ...(form === "SOCIETE"
      ? ["Faites rédiger les statuts et déposez le capital (SARL ou SARLU : le montant est libre au-dessus du minimum fixé par l'État)."]
      : []),
    `Déposez le dossier auprès de ${agency} pour l'immatriculation au registre du commerce (RCCM).`,
    "Obtenez votre numéro fiscal, puis affiliez-vous à la caisse de sécurité sociale avant la première embauche.",
  ];
  const keys = provenance.filter((p) => KEY_PARAMS.includes(p.code));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/projets/${project.id}`} className="text-sm font-semibold text-brand hover:underline">
          ← {project.name}
        </Link>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-ink">
          Créer mon entreprise <span className="text-brand">· {country}</span>
        </h1>
        <p className="mt-2 text-ink-soft">
          Les étapes communes aux pays de l&apos;OHADA, l&apos;organisme à contacter et les règles fiscales retenues dans votre plan.
        </p>
      </div>

      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">⚖️ Forme conseillée</p>
        <p className="mt-2 font-display text-xl font-semibold text-ink">{LEGAL_FORM_LABEL[form]}</p>
        <p className="mt-1 text-sm text-ink-soft">{reason}</p>
      </Card>

      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">🏛️ Où s&apos;adresser</p>
        <p className="mt-2 text-ink">
          {agency.charAt(0).toUpperCase() + agency.slice(1)}
          {agencyUrl ? (
            <>
              {" "}
              ·{" "}
              <a href={agencyUrl} className="font-semibold text-brand underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
                site officiel
              </a>
            </>
          ) : null}
        </p>
        <ol className="mt-5 flex flex-col gap-3">
          {steps.map((s, i) => (
            <li key={s} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>
              <span className="text-ink-soft">{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-xl bg-est-50 px-4 py-3 text-sm text-est">
          ℹ️ Frais, délais et liste exacte des pièces : à confirmer auprès de {agency}. La fiche officielle détaillée de ce pays arrive.
        </p>
      </Card>

      {keys.length ? (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">🧾 Règles fiscales retenues dans votre plan</p>
          <ul className="mt-4 divide-y divide-line">
            {keys.map((p) => (
              <li key={p.code} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">{p.label}</p>
                  <p className="text-xs text-muted">
                    {p.source.url ? (
                      <a href={p.source.url} className="underline underline-offset-2" target="_blank" rel="noreferrer">
                        {p.source.title}
                      </a>
                    ) : (
                      p.source.title
                    )}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-display font-semibold tabular-nums text-ink">{value(p)}</span>
                  <StatusBadge status={p.status} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
