import "server-only";
import { google } from "@ai-sdk/google";
import { generateImage } from "ai";
import type { AiPhoto } from "@/lib/business-plan";
import { createClient } from "@/lib/supabase/server";

/**
 * Illustration de couverture créée par IA pour chaque projet (Gemini, appel direct à Google).
 * Modèle réglable par AI_IMAGE_MODEL ; prix Google ≈ 0,045 $ l'image (1K), soit ≈ 27 FCFA.
 */
export const IMAGE_MODEL = process.env.AI_IMAGE_MODEL?.trim() || "gemini-3.1-flash-image-preview";
export const IMAGE_COST_USD = 0.045;

/** La génération d'images est possible avec la clé Gemini de Tony. */
export const aiImagesEnabled = () => Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY) && process.env.AI_IMAGES !== "off";

export type CoverBrief = {
  name: string;
  sector: string;
  idea: string;
  city: string | null;
  country: string;
  /** Scène proposée par l'IA de rédaction, en anglais (ex. « african woman selling socks shop »). */
  scene?: string;
  /** Ce que l'entreprise vend, en anglais. */
  keywords?: string[];
  online: boolean;
};

/** Consigne de l'image : une photo réaliste de CE commerce, avec son nom bien visible une seule fois. */
export function coverPrompt(b: CoverBrief): string {
  const place = [b.city, b.country].filter(Boolean).join(", ");
  const name = b.name.replace(/["\n\r]/g, " ").trim().slice(0, 60);
  const idea = b.idea.replace(/\s+/g, " ").trim().slice(0, 400);
  return [
    `Photorealistic editorial photograph for the cover of a business plan, shot in ${place}, Africa.`,
    `The business: "${name}", ${b.sector}. Owner's description (French): ${idea}`,
    b.scene ? `Scene idea: ${b.scene}.` : "",
    b.keywords?.length ? `Show clearly what it sells: ${b.keywords.join(", ")}.` : "",
    b.online
      ? "Show the products attractively presented, with a smartphone or delivery bag suggesting online orders."
      : "Show the shop or workplace with its products attractively displayed, in a real local street or market setting of this city.",
    `The exact name "${name}" appears once, clearly and correctly spelled, on a shop sign, packaging, apron or label.`,
    "Black African people only if people appear, natural and dignified, no celebrities. Warm natural light, rich but realistic colors, professional and optimistic mood.",
    "No other text or numbers, no real brand logos, no watermark, no frame, no collage.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Crée l'illustration, la range dans le stockage privé du projet et renvoie la photo à placer en couverture. */
export async function createAiCover(projectId: string, brief: CoverBrief): Promise<AiPhoto> {
  const { image } = await generateImage({
    model: google.image(IMAGE_MODEL),
    prompt: coverPrompt(brief),
    aspectRatio: "16:9",
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(90_000),
  });
  const type = image.mediaType === "image/jpeg" ? "jpg" : image.mediaType === "image/webp" ? "webp" : "png";
  const file = `couverture-${Date.now().toString(36)}.${type}`;
  const path = `${projectId}/${file}`;

  const supabase = await createClient();
  const { error } = await supabase.storage
    .from("plan-images")
    .upload(path, image.uint8Array, { contentType: image.mediaType || "image/png", upsert: true });
  if (error) throw new Error(`Image non enregistrée : ${error.message}`);

  // Les anciennes couvertures de ce projet ne servent plus.
  const { data: old } = await supabase.storage.from("plan-images").list(projectId, { limit: 50 });
  const stale = (old ?? []).map((o) => `${projectId}/${o.name}`).filter((p) => p !== path && p.includes("/couverture-"));
  if (stale.length > 0) await supabase.storage.from("plan-images").remove(stale);

  return {
    source: "ia",
    id: path,
    alt: `Illustration de ${brief.name}, ${brief.sector}`.slice(0, 300),
    src: `/api/images/${path}`,
  };
}

/** Octets d'une illustration du projet (lecture réservée à son propriétaire). */
export async function readAiImage(photo: AiPhoto): Promise<{ data: Uint8Array; type: "png" | "jpg" } | null> {
  const supabase = await createClient();
  const { data } = await supabase.storage.from("plan-images").download(photo.id);
  if (!data) return null;
  return { data: new Uint8Array(await data.arrayBuffer()), type: photo.id.endsWith(".jpg") ? "jpg" : "png" };
}
