import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { USD_TO_XAF } from "@/lib/ai/pricing";
import {
  adminDates,
  getAdminOverview,
  getAllPacks,
  getDataToCheck,
  getPlanCosts,
  getRecentPayments,
  isAdmin,
} from "@/lib/data/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { formatXaf } from "@/lib/format";
import { getCurrentUser } from "@/lib/supabase/server";
import { GrantForm, PackForm } from "./forms";

export const metadata: Metadata = { title: "Admin" };

const PERIODS = { "7": 7, "30": 30, tout: null } as const;
type Period = keyof typeof PERIODS;

const xaf = (usd: number) => `${Math.round(usd * USD_TO_XAF).toLocaleString("fr-FR")} FCFA`;
const usd = (v: number) => `${v.toLocaleString("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} $`;
const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

const STATUS: Record<string, string> = {
  paye: "✅ Payé",
  en_attente: "⏳ En attente",
  echoue: "❌ Échoué",
  annule: "Annulé",
  verifie: "Vérifié",
  estimation: "Estimation",
  hypothese: "Hypothèse",
};

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-ink tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  if (!isSupabaseConfigured) notFound();
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?suite=/admin");
  if (!(await isAdmin())) notFound();

  const query = await searchParams;
  const period: Period = typeof query.periode === "string" && query.periode in PERIODS ? (query.periode as Period) : "30";
  const days = PERIODS[period];
  const { since, today, soon } = adminDates(days);

  const [o, costs, packs, payments, data] = await Promise.all([
    getAdminOverview(since),
    getPlanCosts(since),
    getAllPacks(),
    getRecentPayments(),
    getDataToCheck(),
  ]);

  const unpaid = costs.filter((c) => !c.debloque);
  const paid = costs.filter((c) => c.debloque);
  const avg = (list: number[]) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);
  const lostPerPreview = avg(unpaid.map((c) => c.avant_paiement_usd));
  const perPaidPlan = avg(paid.map((c) => c.avant_paiement_usd + c.apres_paiement_usd));
  const conversion = o.apercus > 0 ? Math.round((o.debloques / o.apercus) * 100) : 0;

  return (
    <>
      <AppHeader name={(user.user_metadata?.full_name as string | undefined) ?? user.email} admin />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-5 py-10 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">🛠️ Espace admin</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">Pilotage</h1>
          </div>
          <nav className="flex gap-2 text-sm">
            {(Object.keys(PERIODS) as Period[]).map((p) => (
              <Link
                key={p}
                href={`/admin?periode=${p}`}
                className={`rounded-lg px-3 py-2 font-semibold ${p === period ? "bg-brand text-white" : "text-ink-soft hover:text-brand"}`}
              >
                {p === "tout" ? "Depuis le début" : `${p} jours`}
              </Link>
            ))}
          </nav>
        </div>

        <Section title="Vue d'ensemble">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Comptes" value={String(o.comptes_total)} hint={`${o.comptes} nouveaux sur la période`} />
            <Kpi label="Aperçus rédigés" value={String(o.apercus)} hint={`${o.projets} projets créés`} />
            <Kpi label="Plans débloqués" value={String(o.debloques)} hint={`${conversion} % des aperçus`} />
            <Kpi label="Ventes" value={formatXaf(o.ventes_xaf)} hint={`${o.paiements} paiement(s), ${o.credits_vendus} crédit(s)`} />
            <Kpi label="Coût de l'IA" value={xaf(o.cout_ia_usd)} hint={`${usd(o.cout_ia_usd)} · ${o.appels_ia} appels, ${o.echecs_ia} échec(s)`} />
            <Kpi label="Aperçu non payé" value={xaf(lostPerPreview)} hint="coût moyen perdu" />
            <Kpi label="Plan payé" value={xaf(perPaidPlan)} hint="coût moyen de l'IA, aperçu + suite" />
            <Kpi label="Crédits offerts" value={String(o.credits_offerts)} />
          </div>
          <p className="text-xs text-muted">Coûts au tarif Google du jour de chaque appel ; 1 $ ≈ {USD_TO_XAF} FCFA.</p>
        </Section>

        <Section title="Coût de l'IA par plan">
          {costs.length === 0 ? (
            <p className="text-sm text-muted">Aucun plan sur la période.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs uppercase tracking-[0.1em] text-muted">
                  <tr>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Secteur</th>
                    <th className="px-4 py-3">Créé le</th>
                    <th className="px-4 py-3">Débloqué</th>
                    <th className="px-4 py-3 text-right">Avant paiement</th>
                    <th className="px-4 py-3 text-right">Après paiement</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {costs.map((c) => (
                    <tr key={c.plan}>
                      <td className="px-4 py-2.5 font-mono text-xs">{c.plan}</td>
                      <td className="px-4 py-2.5">{c.secteur ?? "—"}</td>
                      <td className="px-4 py-2.5">{day(c.cree_le)}</td>
                      <td className="px-4 py-2.5">{c.debloque ? "✅" : "—"}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{xaf(c.avant_paiement_usd)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{xaf(c.apres_paiement_usd)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                        {xaf(c.avant_paiement_usd + c.apres_paiement_usd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted">Le contenu des projets reste privé : seuls leur secteur et leur coût sont visibles ici.</p>
        </Section>

        <Section title="Formules et prix">
          {packs.map((p) => (
            <PackForm key={p.code} pack={p} />
          ))}
          <p className="text-xs text-muted">Le paiement s&apos;ouvre pour une formule dès qu&apos;elle a un identifiant de produit Chariow.</p>
        </Section>

        <Section title="Offrir des crédits">
          <GrantForm />
        </Section>

        <Section title="Derniers paiements">
          {payments.length === 0 ? (
            <p className="text-sm text-muted">Aucun paiement pour l&apos;instant.</p>
          ) : (
            <ul className="divide-y divide-line rounded-2xl border border-line bg-surface text-sm">
              {payments.map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span>
                    {day(p.created_at)} · {p.pack_code} · {p.provider}
                  </span>
                  <span className="tabular-nums">
                    {formatXaf(p.amount_xaf)} · {STATUS[p.status] ?? p.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Chiffres à revérifier">
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface text-sm">
            {data.map((d, i) => {
              const late = d.expiresAt !== null && d.expiresAt < today;
              const near = !late && d.expiresAt !== null && d.expiresAt <= soon;
              return (
                <li key={i} className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    <span className="text-xs text-muted">{d.kind} · </span>
                    {d.label}
                  </span>
                  <span className="shrink-0 text-xs">
                    {STATUS[d.status] ?? d.status} ·{" "}
                    <span className={late ? "font-semibold text-danger" : near ? "font-semibold text-accent" : "text-muted"}>
                      {d.expiresAt ? `${late ? "à revérifier depuis le" : "à revérifier le"} ${day(d.expiresAt)}` : "sans échéance"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>
      </main>
    </>
  );
}
