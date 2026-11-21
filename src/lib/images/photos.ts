import "server-only";
import { z } from "zod";
import { PHOTO_SLOTS, type PhotoSlot, type PlanPhoto } from "@/lib/business-plan";

/** Paramètre exigé par Unsplash sur les liens de crédit. */
const UTM = "utm_source=entreprendre&utm_medium=referral";
const withUtm = (url: string) => `${url}${url.includes("?") ? "&" : "?"}${UTM}`;

const unsplashResponse = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      alt_description: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      urls: z.object({ raw: z.string() }),
      links: z.object({ html: z.string(), download_location: z.string() }),
      user: z.object({ name: z.string(), links: z.object({ html: z.string() }) }),
    }),
  ),
});

const pexelsResponse = z.object({
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

const unsplashKey = () => process.env.UNSPLASH_ACCESS_KEY?.trim();
const pexelsKey = () => process.env.PEXELS_API_KEY?.trim();

/** Fournisseur utilisé : Unsplash en priorité, sinon Pexels, sinon aucun (document sans photo). */
export function photoProvider(): "unsplash" | "pexels" | null {
  if (unsplashKey()) return "unsplash";
  if (pexelsKey()) return "pexels";
  return null;
}

async function searchUnsplash(query: string, key: string): Promise<PlanPhoto[]> {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high&per_page=10`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Unsplash a répondu ${res.status}`);
  const parsed = unsplashResponse.safeParse(await res.json());
  if (!parsed.success) return [];
  return parsed.data.results.map((p) => ({
    source: "unsplash" as const,
    id: p.id,
    alt: (p.alt_description ?? p.description ?? "").slice(0, 300),
    photographer: p.user.name.slice(0, 120),
    photographerUrl: withUtm(p.user.links.html),
    pageUrl: withUtm(p.links.html),
    // Recadrage paysage 1200 × 627, servi par Unsplash (lien direct exigé par leurs règles).
    src: `${p.urls.raw}&w=1200&h=627&fit=crop&q=80&fm=jpg`,
    downloadLocation: p.links.download_location,
  }));
}

async function searchPexels(query: string, key: string): Promise<PlanPhoto[]> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=10`;
  const res = await fetch(url, { headers: { Authorization: key }, signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!res.ok) throw new Error(`Pexels a répondu ${res.status}`);
  const parsed = pexelsResponse.safeParse(await res.json());
  if (!parsed.success) return [];
  return parsed.data.photos.map((p) => ({
    source: "pexels" as const,
    id: p.id,
    alt: (p.alt ?? "").slice(0, 300),
    photographer: p.photographer.slice(0, 120),
    photographerUrl: p.photographer_url,
    pageUrl: p.url,
    src: p.src.landscape,
  }));
}

/** Première photo paysage pour la recherche, en évitant celles déjà retenues. */
export async function searchPhoto(query: string, exclude: Set<string>): Promise<PlanPhoto | null> {
  if (!query.trim()) return null;
  const provider = photoProvider();
  const results =
    provider === "unsplash"
      ? await searchUnsplash(query.trim(), unsplashKey()!)
      : provider === "pexels"
        ? await searchPexels(query.trim(), pexelsKey()!)
        : [];
  return results.find((p) => !exclude.has(String(p.id))) ?? null;
}

/** Une photo par emplacement ; une recherche qui échoue laisse simplement l'emplacement vide. */
export async function findPlanPhotos(queries: Partial<Record<PhotoSlot, string>>) {
  const photos: Partial<Record<PhotoSlot, PlanPhoto>> = {};
  if (!photoProvider()) return photos;
  const used = new Set<string>();
  for (const slot of PHOTO_SLOTS) {
    const query = queries[slot];
    if (!query) continue;
    try {
      const photo = await searchPhoto(query, used);
      if (photo) {
        photos[slot] = photo;
        used.add(String(photo.id));
      }
    } catch (error) {
      console.error(`Recherche de photo impossible (${slot})`, error);
    }
  }
  return photos;
}

/** Unsplash demande de signaler chaque téléchargement (ici : intégration dans le fichier Word). */
export async function reportDownload(photo: PlanPhoto) {
  const key = unsplashKey();
  if (photo.source !== "unsplash" || !photo.downloadLocation || !key) return;
  if (!photo.downloadLocation.startsWith("https://api.unsplash.com/")) return;
  try {
    await fetch(photo.downloadLocation, {
      headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Signalement best-effort.
  }
}
