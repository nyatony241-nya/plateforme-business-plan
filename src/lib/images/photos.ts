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
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high&per_page=20`;
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
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=20`;
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

/** Photos paysage pour une recherche, dans l'ordre de pertinence de la banque d'images. */
export async function searchPhotos(query: string): Promise<PlanPhoto[]> {
  if (!query.trim()) return [];
  const provider = photoProvider();
  return provider === "unsplash"
    ? searchUnsplash(query.trim(), unsplashKey()!)
    : provider === "pexels"
      ? searchPexels(query.trim(), pexelsKey()!)
      : [];
}

/** Première photo paysage pour la recherche, en évitant celles déjà retenues. */
export async function searchPhoto(query: string, exclude: Set<string>): Promise<PlanPhoto | null> {
  return (await searchPhotos(query)).find((p) => !exclude.has(String(p.id))) ?? null;
}

/** Les photos doivent montrer l'Afrique : on ajoute « african » si la recherche ne le précise pas. */
export function africanize(query: string) {
  const q = query.trim();
  return /\b(africa|african|black)\b/i.test(q) ? q : `african ${q}`;
}

/** Ce que chaque section doit montrer, en plus du produit ou du service. */
const SLOT_HINTS: Record<PhotoSlot, string[]> = {
  couverture: ["shop", "store", "market", "seller", "vendor", "salon", "stall", "owner", "business", "workshop"],
  projet: ["display", "shelf", "closeup", "close", "product", "detail", "pile", "stack", "rack"],
  marche: ["customer", "client", "shopping", "buying", "buyer", "people", "woman", "man", "family"],
  marketing: ["phone", "smartphone", "social", "online", "laptop", "poster", "sign", "advert", "storefront"],
};
const AFRICAN = ["african", "africa", "black", "gabon", "nigeria", "ghana", "kenya", "senegal", "cameroon", "congo"];

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3)
    .map((w) => w.replace(/s$/, ""));
const sameWord = (a: string, b: string) =>
  a === b || (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a)));
const mentions = (text: string, list: string[]) => {
  const w = words(text);
  return list.some((k) => words(k).every((part) => w.some((x) => sameWord(x, part))));
};

/**
 * Pertinence d'une photo pour une section, d'après sa description : elle doit montrer ce que
 * l'entreprise vend (mots-clés), si possible en Afrique et dans la scène de la section.
 */
export function photoScore(photo: Pick<PlanPhoto, "alt">, slot: PhotoSlot, keywords: string[]) {
  const alt = photo.alt ?? "";
  return (
    (keywords.length === 0 || mentions(alt, keywords) ? 10 : 0) +
    (mentions(alt, AFRICAN) ? 2 : 0) +
    (mentions(alt, SLOT_HINTS[slot]) ? 3 : 0)
  );
}

/** Meilleure photo non encore utilisée ; sans mots-clés, la première ; sinon une qui montre le produit. */
function bestPhoto(photos: PlanPhoto[], slot: PhotoSlot, keywords: string[], used: Set<string>, requireHint = false) {
  let best: { photo: PlanPhoto; score: number } | null = null;
  for (const photo of photos) {
    if (used.has(String(photo.id))) continue;
    const score = photoScore(photo, slot, keywords);
    if (keywords.length > 0 && score < 10 && !(requireHint && mentions(photo.alt ?? "", SLOT_HINTS[slot]))) continue;
    if (!best || score > best.score) best = { photo, score };
  }
  return best?.photo ?? null;
}

/**
 * Une photo par section, qui montre ce que l'entreprise vend : la recherche de la section
 * (en Afrique d'abord), puis une recherche sur le produit seul. Une section sans photo
 * pertinente reste sans photo plutôt que d'afficher une image hors sujet ; seule la section
 * marketing accepte une scène de promotion générique (smartphone, vitrine).
 */
export async function findPlanPhotos(queries: Partial<Record<PhotoSlot, string>>, keywords: string[] = []) {
  const photos: Partial<Record<PhotoSlot, PlanPhoto>> = {};
  if (!photoProvider()) return photos;
  const used = new Set<string>();
  const cache = new Map<string, Promise<PlanPhoto[]>>();
  const search = (q: string) => {
    if (!cache.has(q)) cache.set(q, searchPhotos(q).catch((error) => (console.error("Recherche de photo impossible", error), [])));
    return cache.get(q)!;
  };
  const subject = keywords.find((k) => k.endsWith("s")) ?? keywords[0];

  for (const slot of PHOTO_SLOTS) {
    const query = queries[slot]?.trim();
    if (!query) continue;
    const attempts = [...new Set([africanize(query), query, ...(subject ? [africanize(subject), subject] : [])])];
    let photo: PlanPhoto | null = null;
    for (const q of attempts) {
      photo = bestPhoto(await search(q), slot, keywords, used);
      if (photo) break;
    }
    if (!photo && slot === "marketing") photo = bestPhoto(await search(africanize(query)), slot, keywords, used, true);
    if (photo) {
      photos[slot] = photo;
      used.add(String(photo.id));
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
