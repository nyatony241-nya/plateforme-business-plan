import { notFound } from "next/navigation";
import { PlanDocumentView } from "@/app/projets/[id]/business-plan/document";
import { DesignThumb } from "@/app/projets/[id]/business-plan/design-thumb";
import { computeScenarios } from "@/engine";
import { defaultAssumptions, toPlanInput } from "@/lib/assumptions";
import type { PlanDocument } from "@/lib/business-plan";
import { searchPhotos } from "@/lib/images/photos";
import { PLAN_DESIGNS, getPlanDesign } from "@/lib/plan-designs";

// Page d'essai TEMPORAIRE (branche d'aperçu uniquement) : jamais en production.
export const dynamic = "force-dynamic";

const DOC: PlanDocument = {
  resume:
    "Tchock's est une boutique de prêt-à-porter à Akanda, pensée pour les jeunes actifs du quartier.\nLe projet démarre avec un stock modeste, une vitrine soignée et une vente active sur WhatsApp.",
  projet: "La boutique propose des tenues du quotidien et des pièces en wax.\nLes prix restent accessibles et les nouveautés arrivent chaque mois.",
  marche: { clientele: "Jeunes actifs et familles du quartier.", concurrence: "Marchés, friperies et vendeurs en ligne.", tendances: "Achats repérés sur WhatsApp et Facebook." },
  emplacement: { analyse: "Axe passant près d'un carrefour animé.", criteres: [{ critere: "Passage", note: 4, commentaire: "À compter aux heures de pointe." }, { critere: "Loyer", note: 3, commentaire: "Dans la moyenne du quartier." }] },
  marketing: {
    message: "Le style qui vous ressemble, à deux pas de chez vous.",
    canaux: [
      { canal: "WhatsApp", action: "Catalogue et statuts", part: 60 },
      { canal: "Facebook", action: "Annonces locales", part: 40 },
    ],
    calendrier: [{ periode: "Semaines 1 et 2", actions: ["Aménagement", "Ouverture"] }],
  },
  risques: [{ risque: "Rupture de stock", parade: "Suivi des ventes chaque semaine." }],
  demarches: ["Bail commercial", "Immatriculation auprès du guichet unique"],
  conclusion: "Projet sobre et prudent, rentable dès la deuxième année dans le scénario réaliste.",
  generation: { model: "essai", generatedAt: "2026-11-23T10:00:00.000Z" },
};

const PARAMS = {
  currency: "XAF" as const,
  corporateTaxRate: 0.3,
  minimumTaxRate: 0.01,
  minimumTaxFloor: 0,
  minimumTaxExemptYears: 0,
  employerContributions: [{ label: "Charges patronales", rate: 0.2, monthlyCeiling: null }],
  lossCarryForwardYears: 3,
};

export default async function Page(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const sp = await props.searchParams;
  const id = typeof sp.d === "string" ? sp.d : null;
  const [cover, projet, marche, marketing] = await Promise.all(
    ["african fashion boutique", "african woman tailor", "african market clothes", "african woman smartphone"].map((q) => searchPhotos(q).catch(() => [])),
  );
  const a = defaultAssumptions(new Date("2026-11-23T12:00:00Z"));
  const input = {
    doc: { ...DOC, photos: Object.fromEntries(Object.entries({ couverture: cover[0], projet: projet[0], marche: marche[0], marketing: marketing[0] }).filter(([, v]) => v)) },
    a,
    results: computeScenarios(toPlanInput(a, PARAMS)),
    project: { name: "Tchock's", sector: "prêt-à-porter", district: "Akanda", city: "Libreville", country: "Gabon" },
    minimumWage: 150_000,
  };
  if (!id) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {PLAN_DESIGNS.map((d) => (
            <a key={d.id} href={`?d=${d.id}`} className="overflow-hidden rounded-xl border border-line bg-surface">
              <DesignThumb d={d} />
              <span className="block px-3 py-2 text-xs font-semibold">{d.name}</span>
            </a>
          ))}
        </div>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-4xl p-4">
      <PlanDocumentView {...input} design={getPlanDesign(id)} />
    </main>
  );
}
