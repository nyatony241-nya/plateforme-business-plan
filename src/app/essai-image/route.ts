import { google } from "@ai-sdk/google";
import { generateImage } from "ai";
import { IMAGE_MODEL, coverPrompt } from "@/lib/images/ai-image";

// Essai TEMPORAIRE (branche d'aperçu uniquement) : génère une couverture d'exemple.
export const maxDuration = 120;

const SAMPLES = [
  { name: "Tchock's", sector: "prêt-à-porter", idea: "Boutique de vêtements pour jeunes actifs, tenues du quotidien et pièces en wax.", city: "Libreville", country: "Gabon", scene: "african woman selling clothes in a boutique", keywords: ["clothing", "fashion", "wax fabric"], online: false },
  { name: "Mama Délices", sector: "restauration", idea: "Vente de plats faits maison livrés au bureau : poulet nyembwe, poisson braisé, bananes.", city: "Port-Gentil", country: "Gabon", scene: "african home cooked meals delivery", keywords: ["food", "meal boxes"], online: true },
  { name: "Glow Beauty 241", sector: "salon de coiffure", idea: "Salon de tresses et soins capillaires pour femmes à Akanda.", city: "Akanda", country: "Gabon", scene: "african hair salon braids", keywords: ["hair", "braids", "salon"], online: false },
];

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV === "production") return new Response("Introuvable.", { status: 404 });
  const n = Number(new URL(request.url).searchParams.get("n") ?? 0);
  const sample = SAMPLES[n] ?? SAMPLES[0];
  const started = Date.now();
  try {
    const { image } = await generateImage({ model: google.image(IMAGE_MODEL), prompt: coverPrompt(sample), aspectRatio: "16:9", maxRetries: 1 });
    return new Response(new Uint8Array(image.uint8Array), {
      headers: { "Content-Type": image.mediaType || "image/png", "X-Duree-Ms": String(Date.now() - started), "X-Modele": IMAGE_MODEL },
    });
  } catch (error) {
    return new Response(`Échec (${IMAGE_MODEL}) : ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
  }
}
