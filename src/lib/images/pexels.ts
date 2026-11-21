import "server-only";
import { z } from "zod";
import { PHOTO_SLOTS, type PhotoSlot, type PlanPhoto } from "@/lib/business-plan";

/** Réponse de https://api.pexels.com/v1/search, limitée aux champs utilisés. */
const searchResponse = z.object({
  photos: z.array(
    z.object({
      id: z.number(),
      url: z.string(),
      alt: z.string().nullable().optional(),
      photographer: z.string(),
      photographer_url: z.string(),
      src: z.object({ landscape: z.string() }),
    }),
  ),
});

export const isPexelsConfigured = () => Boolean(process.env.PEXELS_API_KEY?.trim());

/** Première photo paysage pour la recherche, en évitant celles déjà retenues. */
export async function searchPhoto(query: string, exclude: Set<number>): Promise<PlanPhoto | null> {
  const key = process.env.PEXELS_API_KEY?.trim();
  if (!key || !query.trim()) return null;
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query.trim())}&orientation=landscape&per_page=10`;
  const res = await fetch(url, { headers: { Authorization: key }, signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!res.ok) throw new Error(`Pexels a répondu ${res.status}`);
  const parsed = searchResponse.safeParse(await res.json());
  if (!parsed.success) return null;
  const photo = parsed.data.photos.find((p) => !exclude.has(p.id));
  if (!photo) return null;
  return {
    id: photo.id,
    alt: (photo.alt ?? "").slice(0, 300),
    photographer: photo.photographer.slice(0, 120),
    photographerUrl: photo.photographer_url,
    pageUrl: photo.url,
    src: photo.src.landscape,
  };
}

/** Une photo par emplacement ; une recherche qui échoue laisse simplement l'emplacement vide. */
export async function findPlanPhotos(queries: Partial<Record<PhotoSlot, string>>) {
  const photos: Partial<Record<PhotoSlot, PlanPhoto>> = {};
  if (!isPexelsConfigured()) return photos;
  const used = new Set<number>();
  for (const slot of PHOTO_SLOTS) {
    const query = queries[slot];
    if (!query) continue;
    try {
      const photo = await searchPhoto(query, used);
      if (photo) {
        photos[slot] = photo;
        used.add(photo.id);
      }
    } catch (error) {
      console.error(`Recherche de photo impossible (${slot})`, error);
    }
  }
  return photos;
}
