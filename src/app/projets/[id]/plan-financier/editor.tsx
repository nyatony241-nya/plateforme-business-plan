"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AmountInput, MonthInput, PercentInput, SelectInput, TextInput } from "@/components/inputs";
import { StatusBadge } from "@/components/ui";
import { computeScenarios, EngineInputError, type CountryParams, type ScenarioId } from "@/engine";
import { INVESTMENT_KINDS, newRowId, toPlanInput, type Assumptions } from "@/lib/assumptions";
import type { ParamProvenance } from "@/lib/data/country-params";
import { formatDateFr } from "@/lib/data-status";
import { formatPercent, formatXaf } from "@/lib/format";
import { saveAssumptions } from "./actions";
import { Results } from "./results";

type SaveState =
  | { state: "idle"; at: string | null }
  | { state: "pending" }
  | { state: "saving" }
  | { state: "saved"; at: string }
  | { state: "error"; message: string };

type Lists = "investments" | "offers" | "staff" | "fixedCosts";

function Section({
  title,
  description,
  children,
  onAdd,
  addLabel,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      {description ? <p className="mt-1 text-sm text-ink-soft">{description}</p> : null}
      <div className="mt-5 flex flex-col gap-4">{children}</div>
      {onAdd ? (
        <button
          type="button"
          onClick={onAdd}
          className="mt-4 rounded-lg border border-dashed border-line-strong px-4 py-2.5 text-sm font-semibold text-brand hover:border-brand"
        >
          + {addLabel}
        </button>
      ) : null}
    </section>
  );
}

function Note({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
      <StatusBadge status="hypothese" />
      <span>{text}</span>
    </p>
  );
}

function Row({ children, onRemove, note }: { children: ReactNode; onRemove: () => void; note?: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper/60 p-4">
      {note ? (
        <div className="mb-3">
          <Note text={note} />
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3">{children}</div>
      <button type="button" onClick={onRemove} className="mt-3 text-xs font-semibold text-ink-soft hover:text-danger">
        Retirer cette ligne
      </button>
    </div>
  );
}

const wide = "col-span-2";

function paramValue(p: ParamProvenance) {
  if (p.unit === "pourcentage") return formatPercent(p.value, 2);
  if (p.unit === "xaf") return formatXaf(p.value);
  if (p.unit === "annees") return p.value === 0 ? "Aucun" : `${p.value} ans`;
  return String(p.value);
}

export function PlanEditor({
  projectId,
  initial,
  initialSavedAt,
  params,
  provenance,
  unlockHref,
}: {
  projectId: string;
  initial: Assumptions;
  initialSavedAt: string | null;
  params: CountryParams;
  provenance: ParamProvenance[];
  unlockHref?: string;
}) {
  const [a, setA] = useState<Assumptions>(initial);
  const [scenario, setScenario] = useState<ScenarioId>("realiste");
  const [save, setSave] = useState<SaveState>({ state: "idle", at: initialSavedAt });
  const [editing, setEditing] = useState(!initial.generation);
  const firstRender = useRef(true);
  const requestId = useRef(0);

  // Enregistrement automatique, une seconde après la dernière modification.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSave({ state: "pending" });
    const timer = setTimeout(async () => {
      const id = ++requestId.current;
      setSave({ state: "saving" });
      const result = await saveAssumptions(projectId, a);
      if (id !== requestId.current) return; // une saisie plus récente est en cours
      setSave(result.ok ? { state: "saved", at: result.savedAt } : { state: "error", message: result.message });
    }, 1000);
    return () => clearTimeout(timer);
  }, [a, projectId]);

  const computed = useMemo(() => {
    try {
      return { ok: true as const, results: computeScenarios(toPlanInput(a, params)) };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof EngineInputError ? error.message : "Le calcul n'a pas pu aboutir avec ces valeurs.",
      };
    }
  }, [a, params]);

  const minimumWage = provenance.find((p) => p.code === "revenu_minimum_mensuel")?.value ?? 150_000;

  const set = (changes: Partial<Assumptions>) => setA((prev) => ({ ...prev, ...changes }));

  function updateRow<K extends Lists>(key: K, id: string, changes: Partial<Assumptions[K][number]>) {
    setA((prev) => ({
      ...prev,
      [key]: (prev[key] as Assumptions[K][number][]).map((row) => (row.id === id ? { ...row, ...changes } : row)),
    }));
  }
  function removeRow(key: Lists, id: string) {
    setA((prev) => ({ ...prev, [key]: (prev[key] as { id: string }[]).filter((row) => row.id !== id) }));
  }
  function addRow<K extends Lists>(key: K, row: Assumptions[K][number]) {
    setA((prev) => ({ ...prev, [key]: [...(prev[key] as Assumptions[K][number][]), row] }));
  }
  function updateLoan(id: string, changes: Partial<Assumptions["financing"]["loans"][number]>) {
    setA((prev) => ({
      ...prev,
      financing: {
        ...prev.financing,
        loans: prev.financing.loans.map((loan) => (loan.id === id ? { ...loan, ...changes } : loan)),
      },
    }));
  }

  const saveText =
    save.state === "pending" || save.state === "saving"
      ? "Enregistrement…"
      : save.state === "saved"
        ? "Enregistré"
        : save.state === "error"
          ? save.message
          : save.at
            ? `Enregistré le ${formatDateFr(save.at)}`
            : "Rien d'enregistré pour l'instant";

  return (
    <div className="flex flex-col gap-8">
      <div id="resultats" className="min-w-0 scroll-mt-6">
        {computed.ok ? (
          <Results
            results={computed.results}
            scenario={scenario}
            onScenario={setScenario}
            owner={a.staff.length === 0 ? { minimumWage } : undefined}
            unlockHref={unlockHref}
          />
        ) : (
          <div role="alert" className="rounded-2xl border border-danger/40 bg-danger-50 p-5 text-sm text-danger">
            {computed.message}
          </div>
        )}
      </div>

      <details
        className="group rounded-2xl border border-line bg-surface"
        open={editing}
        onToggle={(event) => setEditing(event.currentTarget.open)}
      >
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block font-display text-2xl font-semibold text-ink">Hypothèses du plan</span>
            <span className="mt-1 block max-w-2xl text-sm text-ink-soft">
              Chaque chiffre est expliqué. Vous pouvez en corriger un, facultativement : les résultats se recalculent
              aussitôt.
            </span>
          </span>
          <span className="shrink-0 rounded-xl border border-line-strong px-4 py-2 text-sm font-semibold text-brand">
            {editing ? "Masquer" : "Voir et corriger"}
          </span>
        </summary>
      <div className="grid min-w-0 grid-cols-1 gap-5 border-t border-line p-5 sm:p-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-hyp-50 px-4 py-3 lg:col-span-2">
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <StatusBadge status="hypothese" /> Proposés automatiquement, à vérifier. Corrigez un chiffre si vous connaissez
            le vrai.
          </p>
          <p aria-live="polite" className={`text-xs font-semibold ${save.state === "error" ? "text-danger" : "text-muted"}`}>
            {saveText}
          </p>
        </div>

        <Section title="Démarrage" description="Premier mois d'activité et durée des prévisions.">
          <div className="grid grid-cols-2 gap-3">
            <MonthInput label="Premier mois d'activité" value={a.startMonth} onChange={(startMonth) => set({ startMonth })} />
            <SelectInput
              label="Durée des prévisions"
              value={a.years}
              options={[
                { value: 3, label: "3 ans" },
                { value: 5, label: "5 ans" },
              ]}
              onChange={(years) => set({ years })}
            />
          </div>
        </Section>

        <Section
          title="Ventes"
          description="Prix et coûts hors taxes. Le coût unitaire est ce que vous payez pour chaque vente (achat, matière, commission)."
          onAdd={() =>
            addRow("offers", {
              id: newRowId(),
              label: "",
              unitPrice: 0,
              unitCost: 0,
              monthlyVolume: 0,
              rampUpMonths: 0,
              annualVolumeGrowth: 0,
            })
          }
          addLabel="Ajouter un produit ou un service"
        >
          {a.offers.map((o) => (
            <Row key={o.id} note={o.note} onRemove={() => removeRow("offers", o.id)}>
              <div className={wide}>
                <TextInput label="Produit ou service" value={o.label} placeholder="Ex. coupe homme" onChange={(label) => updateRow("offers", o.id, { label })} />
              </div>
              <AmountInput label="Prix de vente" value={o.unitPrice} onChange={(unitPrice) => updateRow("offers", o.id, { unitPrice })} />
              <AmountInput label="Coût unitaire" value={o.unitCost} onChange={(unitCost) => updateRow("offers", o.id, { unitCost })} />
              <AmountInput label="Ventes par mois" suffix="" value={o.monthlyVolume} onChange={(monthlyVolume) => updateRow("offers", o.id, { monthlyVolume })} hint="Une fois l'activité lancée" />
              <AmountInput label="Montée en charge" suffix="mois" value={o.rampUpMonths} onChange={(rampUpMonths) => updateRow("offers", o.id, { rampUpMonths: Math.min(rampUpMonths, 60) })} hint="Temps pour atteindre ce rythme" />
              <PercentInput label="Croissance annuelle" value={o.annualVolumeGrowth} onChange={(annualVolumeGrowth) => updateRow("offers", o.id, { annualVolumeGrowth: Math.min(annualVolumeGrowth, 10) })} hint="Des ventes, à partir de l'an 2" />
            </Row>
          ))}
        </Section>

        <Section
          title="Investissements de départ"
          description="Achats faits au lancement. Le matériel et les travaux sont amortis sur leur durée d'utilisation."
          onAdd={() => addRow("investments", { id: newRowId(), label: "", kind: "materiel", amount: 0, lifeYears: 5 })}
          addLabel="Ajouter un investissement"
        >
          {a.investments.length === 0 ? <p className="text-sm text-muted">Aucun investissement saisi.</p> : null}
          {a.investments.map((inv) => {
            const kind = INVESTMENT_KINDS.find((k) => k.value === inv.kind);
            return (
              <Row key={inv.id} note={inv.note} onRemove={() => removeRow("investments", inv.id)}>
                <div className={wide}>
                  <TextInput label="Description" value={inv.label} placeholder="Ex. fauteuils, miroirs" onChange={(label) => updateRow("investments", inv.id, { label })} />
                </div>
                <SelectInput
                  label="Type"
                  value={inv.kind}
                  options={INVESTMENT_KINDS.map((k) => ({ value: k.value, label: k.label }))}
                  onChange={(value) => updateRow("investments", inv.id, { kind: value })}
                />
                <AmountInput label="Montant" value={inv.amount} onChange={(amount) => updateRow("investments", inv.id, { amount })} />
                {kind?.depreciable ? (
                  <AmountInput label="Durée d'utilisation" suffix="ans" value={inv.lifeYears} onChange={(lifeYears) => updateRow("investments", inv.id, { lifeYears: Math.min(lifeYears, 50) })} />
                ) : null}
              </Row>
            );
          })}
        </Section>

        <Section
          title="Personnel"
          description="Salaire brut mensuel. Les cotisations patronales sont ajoutées automatiquement."
          onAdd={() => addRow("staff", { id: newRowId(), label: "", monthlyGross: 0, headcount: 1, startMonth: 1 })}
          addLabel="Ajouter un poste"
        >
          {a.staff.length === 0 ? <p className="text-sm text-muted">Aucun salarié pour l&apos;instant.</p> : null}
          {a.staff.map((s) => (
            <Row key={s.id} note={s.note} onRemove={() => removeRow("staff", s.id)}>
              <div className={wide}>
                <TextInput label="Poste" value={s.label} placeholder="Ex. coiffeuse" onChange={(label) => updateRow("staff", s.id, { label })} />
              </div>
              <AmountInput label="Salaire brut mensuel" value={s.monthlyGross} onChange={(monthlyGross) => updateRow("staff", s.id, { monthlyGross })} />
              <AmountInput label="Nombre de personnes" suffix="" value={s.headcount} onChange={(headcount) => updateRow("staff", s.id, { headcount: Math.min(headcount, 10_000) })} />
              <AmountInput label="Embauche au mois" suffix="" value={s.startMonth} onChange={(startMonth) => updateRow("staff", s.id, { startMonth: Math.min(Math.max(startMonth, 1), 60) })} hint="1 = dès l'ouverture" />
            </Row>
          ))}
        </Section>

        <Section
          title="Charges fixes mensuelles"
          description="Ce que vous payez chaque mois, que vous vendiez ou non."
          onAdd={() => addRow("fixedCosts", { id: newRowId(), label: "", monthly: 0 })}
          addLabel="Ajouter une charge"
        >
          {a.fixedCosts.map((c) => (
            <Row key={c.id} note={c.note} onRemove={() => removeRow("fixedCosts", c.id)}>
              <div className={wide}>
                <TextInput label="Charge" value={c.label} placeholder="Ex. électricité, internet, marketing" onChange={(label) => updateRow("fixedCosts", c.id, { label })} />
              </div>
              <div className={wide}>
                <AmountInput label="Montant par mois" value={c.monthly} onChange={(monthly) => updateRow("fixedCosts", c.id, { monthly })} />
              </div>
            </Row>
          ))}
        </Section>

        <Section
          title="Financement"
          description="Ce que vous apportez, les aides reçues et les prêts demandés."
          onAdd={() =>
            set({
              financing: {
                ...a.financing,
                loans: [
                  ...a.financing.loans,
                  { id: newRowId(), label: "Prêt bancaire", principal: 0, annualRate: 0, months: 36, deferralMonths: 0 },
                ],
              },
            })
          }
          addLabel="Ajouter un prêt"
        >
          <Note text={a.financing.note} />
          <div className="grid grid-cols-2 gap-3">
            <AmountInput label="Apport personnel" value={a.financing.equity} onChange={(equity) => set({ financing: { ...a.financing, equity } })} />
            <AmountInput label="Subventions et dons" value={a.financing.grants} onChange={(grants) => set({ financing: { ...a.financing, grants } })} />
          </div>
          {a.financing.loans.map((loan) => (
            <Row
              key={loan.id}
              note={loan.note}
              onRemove={() => set({ financing: { ...a.financing, loans: a.financing.loans.filter((l) => l.id !== loan.id) } })}
            >
              <div className={wide}>
                <TextInput label="Prêteur" value={loan.label} onChange={(label) => updateLoan(loan.id, { label })} />
              </div>
              <div className={wide}>
                <AmountInput label="Montant emprunté" value={loan.principal} onChange={(principal) => updateLoan(loan.id, { principal })} />
              </div>
              <PercentInput label="Taux annuel" value={loan.annualRate} onChange={(annualRate) => updateLoan(loan.id, { annualRate: Math.min(annualRate, 0.99) })} />
              <AmountInput label="Durée" suffix="mois" value={loan.months} onChange={(months) => updateLoan(loan.id, { months: Math.min(Math.max(months, 1), 360) })} />
              <AmountInput label="Différé" suffix="mois" value={loan.deferralMonths} onChange={(deferralMonths) => updateLoan(loan.id, { deferralMonths: Math.min(deferralMonths, 120) })} hint="Intérêts seuls au début" />
            </Row>
          ))}
        </Section>

        <Section title="Délais de paiement" description="0 si vos clients paient comptant, ce qui est le cas le plus fréquent en boutique.">
          <div className="grid grid-cols-2 gap-3">
            <AmountInput
              label="Vos clients paient à"
              suffix="jours"
              value={a.workingCapital.customerDays}
              onChange={(customerDays) => set({ workingCapital: { ...a.workingCapital, customerDays: Math.min(customerDays, 365) } })}
            />
            <AmountInput
              label="Vous payez vos fournisseurs à"
              suffix="jours"
              value={a.workingCapital.supplierDays}
              onChange={(supplierDays) => set({ workingCapital: { ...a.workingCapital, supplierDays: Math.min(supplierDays, 365) } })}
            />
          </div>
        </Section>

        </div>
      </details>

        <details className="rounded-2xl border border-line bg-surface px-5 py-4">
          <summary className="cursor-pointer text-sm font-semibold text-brand">
            Impôts et cotisations appliqués (Gabon)
          </summary>
          <p className="mt-2 text-sm text-ink-soft">
            Valeurs du référentiel, avec leur source. Une estimation reste à confirmer auprès de l&apos;administration.
          </p>
          <ul className="mt-4 divide-y divide-line">
            {provenance.map((p) => (
              <li key={p.code} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">{p.label}</span>
                  <span className="flex items-center gap-2 text-sm tabular-nums text-ink">
                    {paramValue(p)}
                    <StatusBadge status={p.status} />
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {p.monthlyCeiling ? `Plafond : ${formatXaf(p.monthlyCeiling)} par mois · ` : ""}
                  Source :{" "}
                  {p.source.url ? (
                    <a href={p.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand">
                      {p.source.publisher ?? p.source.title}
                    </a>
                  ) : (
                    p.source.publisher ?? p.source.title
                  )}{" "}
                  · vérifié le {formatDateFr(p.verifiedAt)}
                </p>
                {p.note ? <p className="mt-1 text-xs text-ink-soft">{p.note}</p> : null}
              </li>
            ))}
          </ul>
        </details>

      {computed.ok && editing ? (
        <a
          href="#resultats"
          className="fixed inset-x-3 bottom-3 z-20 mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl bg-brand px-4 py-3 text-white shadow-lg"
        >
          <span className="text-sm">
            Bénéfice la 1re année
            <span className="block text-base font-bold tabular-nums">
              {formatXaf(computed.results[scenario].years[0].netResult)}
            </span>
          </span>
          <span className="text-sm font-semibold">Voir les résultats ↓</span>
        </a>
      ) : null}
    </div>
  );
}
