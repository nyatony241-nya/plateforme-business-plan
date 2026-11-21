import { z } from "zod";
import { roundXaf } from "@/engine";
import type { Assumptions } from "@/lib/assumptions";

const text = (max: number) => z.string().trim().min(1).max(max);

export const CHANNELS = ["Facebook", "TikTok", "WhatsApp", "Instagram", "Bouche-à-oreille", "Affichage", "Autre"] as const;

export const PHOTO_SOURCES = { pexels: "Pexels", unsplash: "Unsplash" } as const;

/** Photo libre de droit (Unsplash ou Pexels), avec ce qu'il faut pour créditer son auteur. */
export const planPhotoSchema = z.object({
  source: z.enum(["pexels", "unsplash"]).default("pexels"),
  id: z.union([z.number().int(), z.string().max(40)]),
  alt: z.string().max(300),
  photographer: z.string().max(120),
  photographerUrl: z.string().url().max(300),
  pageUrl: z.string().url().max(300),
  src: z.string().url().max(600),
  /** Unsplash : adresse à appeler quand la photo est téléchargée (export Word). */
  downloadLocation: z.string().url().max(400).optional(),
});

export type PlanPhoto = z.infer<typeof planPhotoSchema>;

export const PHOTO_SLOTS = ["couverture", "projet", "marche", "marketing"] as const;
export type PhotoSlot = (typeof PHOTO_SLOTS)[number];

/** Business plan rédigé. Il ne contient aucun montant : les chiffres viennent du moteur au moment de l'affichage. */
export const planDocumentSchema = z.object({
  resume: text(1500),
  projet: text(2000),
  marche: z.object({ clientele: text(1500), concurrence: text(1500), tendances: text(1500) }),
  emplacement: z.object({
    analyse: text(1500),
    criteres: z.array(z.object({ critere: text(80), note: z.number().int().min(1).max(5), commentaire: text(300) })).max(6),
  }),
  marketing: z.object({
    message: text(600),
    canaux: z
      .array(z.object({ canal: z.enum(CHANNELS), action: text(400), part: z.number().int().min(0).max(100) }))
      .min(1)
      .max(6),
    calendrier: z.array(z.object({ periode: text(40), actions: z.array(text(200)).min(1).max(5) })).min(1).max(8),
  }),
  risques: z.array(z.object({ risque: text(200), parade: text(400) })).min(1).max(6),
  demarches: z.array(text(300)).min(1).max(8),
  conclusion: text(1200),
  /** Recherches de photos proposées par l'IA (en anglais), une par emplacement. */
  photoQueries: z.partialRecord(z.enum(PHOTO_SLOTS), z.string().max(80)).optional(),
  photos: z.partialRecord(z.enum(PHOTO_SLOTS), planPhotoSchema).optional(),
  generation: z.object({ model: z.string().max(100), generatedAt: z.string().max(40) }),
});

export type PlanDocument = z.infer<typeof planDocumentSchema>;

const MARKETING = /marketing|publicit|communication|promotion|r[ée]seaux|visibilit|flyer|affich/i;

/** Budget marketing mensuel = charges fixes dont le libellé relève du marketing. */
export function monthlyMarketingBudget(a: Assumptions) {
  return a.fixedCosts.filter((c) => MARKETING.test(c.label)).reduce((total, c) => total + c.monthly, 0);
}

/** Répartit le budget mensuel entre les canaux, selon les parts proposées (calcul fait ici, pas par l'IA). */
export function splitBudget(budget: number, channels: { part: number }[]) {
  const totalParts = channels.reduce((total, c) => total + c.part, 0);
  if (budget <= 0 || totalParts <= 0) return channels.map(() => 0);
  const amounts = channels.map((c) => roundXaf((budget * c.part) / totalParts));
  // L'écart d'arrondi va au premier canal, pour que la somme soit exacte.
  amounts[0] += budget - amounts.reduce((total, x) => total + x, 0);
  return amounts;
}
