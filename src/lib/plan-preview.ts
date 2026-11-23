import type { PlanDocument } from "@/lib/business-plan";

/** Parties lisibles dans l'aperçu gratuit (Résumé, Le projet), après la couverture et les chiffres clés. */
export const PREVIEW_SECTIONS = 2;

/** Ce que contient chaque partie verrouillée, pour donner envie sans rien dévoiler. */
export const LOCKED_CONTENTS: Record<number, string[]> = {
  3: ["Clientèle visée", "Concurrence", "Habitudes d'achat"],
  4: ["Lieu conseillé et critères de choix", "Note de l'emplacement"],
  5: [
    "Investissements de départ et financement",
    "Ventes, charges et bénéfice sur 3 ans",
    "Trois scénarios : prudent, réaliste, optimiste",
    "Argent en caisse, mois par mois",
  ],
  6: ["Canaux et budget publicitaire", "Calendrier des 90 premiers jours"],
  7: ["Principaux risques et parades"],
  8: ["Forme juridique conseillée", "Étapes, pièces et frais de création"],
  9: ["Synthèse et prochaines étapes"],
};

/**
 * Document réduit à l'aperçu : le texte des parties verrouillées n'est jamais envoyé au
 * navigateur, il ne peut donc pas être récupéré.
 */
export function previewDocument(doc: PlanDocument): PlanDocument {
  return {
    ...doc,
    marche: { clientele: "", concurrence: "", tendances: "" },
    emplacement: { analyse: "", criteres: [] },
    marketing: { message: "", canaux: [], calendrier: [] },
    risques: [],
    demarches: [],
    conclusion: "",
    photos: {
      ...(doc.photos?.couverture ? { couverture: doc.photos.couverture } : {}),
      ...(doc.photos?.projet ? { projet: doc.photos.projet } : {}),
    },
  };
}
