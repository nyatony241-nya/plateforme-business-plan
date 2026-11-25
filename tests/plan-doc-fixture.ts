import type { PlanDocument } from "@/lib/business-plan";

export const SAMPLE_DOC: PlanDocument = {
  resume: "Boutique de chaussettes à Akanda.",
  projet: "Premier paragraphe.\nSecond paragraphe.",
  marche: { clientele: "Familles du quartier.", concurrence: "Marchés et vendeurs ambulants.", tendances: "Achats repérés sur WhatsApp." },
  emplacement: { analyse: "Axe passant à vérifier.", criteres: [{ critere: "Passage", note: 4, commentaire: "À compter aux heures de pointe." }] },
  marketing: {
    message: "La bonne paire pour chaque jour.",
    canaux: [
      { canal: "WhatsApp", action: "Catalogue", part: 60 },
      { canal: "Facebook", action: "Annonces locales", part: 40 },
    ],
    calendrier: [{ periode: "Semaines 1 et 2", actions: ["Aménagement"] }],
  },
  risques: [{ risque: "Rupture de stock", parade: "Suivi des ventes." }],
  swot: {
    forces: ["Savoir-faire de la fondatrice", "Emplacement passant"],
    faiblesses: ["Jeune entreprise sans clientèle"],
    opportunites: ["Clients qui commandent sur WhatsApp"],
    menaces: ["Hausse du prix des tissus importés"],
  },
  demarches: ["Bail commercial", "Immatriculation auprès de l'ANPI-Gabon"],
  conclusion: "Projet sobre et prudent.",
  generation: { model: "test", generatedAt: "2026-11-21T16:00:00.000Z" },
};
