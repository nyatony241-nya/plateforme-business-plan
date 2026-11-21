import { writeFileSync } from "node:fs";
import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { computeScenarios } from "@/engine";
import { defaultAssumptions, toPlanInput, type Assumptions } from "@/lib/assumptions";
import type { PlanDocument } from "@/lib/business-plan";
import { businessPlanDocx } from "@/lib/word/business-plan-docx";
import { TEST_PARAMS } from "./engine/fixtures";

const a: Assumptions = {
  ...defaultAssumptions(new Date("2026-11-21T12:00:00Z")),
  investments: [{ id: "i", label: "Présentoirs", kind: "materiel", amount: 400_000, lifeYears: 5 }],
  offers: [{ id: "o", label: "Paire de chaussettes", unitPrice: 1500, unitCost: 600, monthlyVolume: 250, rampUpMonths: 3, annualVolumeGrowth: 0 }],
  fixedCosts: [
    { id: "c1", label: "Loyer", monthly: 100_000 },
    { id: "c2", label: "Publicité locale", monthly: 20_000 },
  ],
  financing: { equity: 2_000_000, grants: 0, loans: [] },
};

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
  demarches: ["Bail commercial", "Immatriculation auprès de l'ANPI-Gabon"],
  conclusion: "Projet sobre et prudent.",
  generation: { model: "test", generatedAt: "2026-11-21T16:00:00.000Z" },
};

describe("export Word du business plan", () => {
  it("produit un fichier Word valide avec les sections et les chiffres du moteur", async () => {
    const buffer = await businessPlanDocx({
      doc: SAMPLE_DOC,
      a,
      results: computeScenarios(toPlanInput(a, TEST_PARAMS)),
      project: { name: "tchock's", sector: "prêt-à-porter", district: "Akanda", city: "Libreville", country: "Gabon" },
      minimumWage: 150_000,
    });
    if (process.env.WORD_SAMPLE) writeFileSync(process.env.WORD_SAMPLE, buffer);
    const files = unzipSync(new Uint8Array(buffer));
    const xml = strFromU8(files["word/document.xml"]);
    for (const title of ["Résumé", "Le plan financier", "Les 90 premiers jours", "Les démarches", "Conclusion"]) {
      expect(xml).toContain(title);
    }
    expect(xml).toContain("Second paragraphe.");
    expect(xml).toMatch(/12\s000\sFCFA/); // 60 % de 20 000 FCFA, calculé par le code
    expect(xml).not.toContain("NaN");
  });
});
