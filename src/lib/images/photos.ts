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
  couverture: ["shop", "store", "market", "seller", "selling", "vendor", "salon", "stall", "owner", "workshop", "sale", "display"],
  projet: ["display", "shelf", "closeup", "close", "product", "detail", "pile", "stack", "rack", "folded"],
  marche: ["customer", "client", "shopping", "shopper", "buying", "buyer", "browse", "people", "crowd", "market", "woman", "man"],
  marketing: ["phone", "smartphone", "social", "online", "laptop", "poster", "advert", "storefront", "card"],
};
const AFRICAN = ["african", "africa", "black", "gabon", "nigeria", "ghana", "kenya", "senegal", "cameroon", "congo", "wax"];
/** Mots trop généraux pour désigner un commerce. */
const GENERIC = new Set(["store", "shop", "business", "service", "company", "small", "local"]);

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

export type PhotoTerms = {
  /** Ce que l'entreprise vend (sock, socks). */
  keywords: string[];
  /** Lieu du commerce (clothing shop). */
  category?: string;
  /** Mots visibles sur les photos de ce commerce (clothing, fabric…). */
  trade?: string[];
  /** Vente en ligne : la section marketing montre l'achat sur smartphone. */
  online?: boolean;
};

/**
 * Pertinence d'une photo pour une section, d'après sa description : ce que l'entreprise vend
 * (10) ou son métier (6), la scène de la section (5), l'Afrique (3), et un bonus (2) pour les
 * premiers résultats d'une recherche précise sur ce commerce en Afrique.
 */
export function photoScore(photo: Pick<PlanPhoto, "alt">, slot: PhotoSlot, terms: PhotoTerms, trusted = false) {
  const alt = photo.alt ?? "";
  const trade = [
    ...(terms.trade ?? []),
    ...(terms.category ?? "").split(/\s+/).filter((w) => w.length >= 3 && !GENERIC.has(w)),
  ];
  const business =
    terms.keywords.length === 0 || mentions(alt, terms.keywords) ? 10 : trade.length > 0 && mentions(alt, trade) ? 6 : 0;
  return business + (mentions(alt, SLOT_HINTS[slot]) ? 5 : 0) + (mentions(alt, AFRICAN) ? 3 : 0) + (trusted ? 2 : 0);
}

/** Seuil d'une photo acceptable : le produit pour « projet », sinon l'activité ou une scène fiable. */
const acceptable = (slot: PhotoSlot, score: number) => (slot === "projet" ? score >= 10 : score >= 7);

type Search = { query: string; trusted: boolean };

/**
 * Recherches courtes (les longues ne trouvent presque rien), d'abord en Afrique, partagées entre
 * les sections pour économiser le quota de la banque d'images (50 requêtes par heure en mode démo).
 */
function searchesFor(slot: PhotoSlot, aiQuery: string, terms: PhotoTerms): Search[] {
  const subject = terms.keywords.find((k) => k.endsWith("s")) ?? terms.keywords[0];
  const place = terms.category;
  const list: (Search | null)[] =
    slot === "projet"
      ? [subject ? { query: subject, trusted: false } : null, { query: aiQuery, trusted: false }]
      : slot === "couverture"
        ? [
            place ? { query: africanize(place), trusted: true } : null,
            { query: africanize(aiQuery), trusted: false },
            // En couverture, le produit seul vaut mieux qu'aucune image.
            subject ? { query: subject, trusted: false } : null,
          ]
        : slot === "marche"
          ? [
              place ? { query: africanize(place), trusted: true } : null,
              { query: "african shoppers", trusted: false },
              { query: africanize(aiQuery), trusted: false },
            ]
          : [
              {
                query: terms.online ? "african woman smartphone shopping" : place ? africanize(`${place} storefront`) : "african shop storefront",
                trusted: true,
              },
              { query: africanize(aiQuery), trusted: false },
            ];
  // En dernier recours, la recherche de l'IA telle quelle.
  list.push({ query: aiQuery, trusted: false });
  const seen = new Set<string>();
  return list.filter((s): s is Search => {
    if (!s || !s.query.trim() || seen.has(s.query)) return false;
    seen.add(s.query);
    return true;
  });
}

/**
 * Une photo par section, qui montre l'activité dans la scène de la section. Une section sans
 * photo pertinente reste sans photo plutôt que d'afficher une image hors sujet.
 */
export async function findPlanPhotos(queries: Partial<Record<PhotoSlot, string>>, terms: PhotoTerms = { keywords: [] }) {
  const photos: Partial<Record<PhotoSlot, PlanPhoto>> = {};
  if (!photoProvider()) return photos;
  const used = new Set<string>();
  const cache = new Map<string, Promise<PlanPhoto[]>>();
  const search = (q: string) => {
    if (!cache.has(q)) cache.set(q, searchPhotos(q).catch((error) => (console.error("Recherche de photo impossible", error), [])));
    return cache.get(q)!;
  };

  for (const slot of PHOTO_SLOTS) {
    const query = queries[slot]?.trim();
    if (!query) continue;
    let best: { photo: PlanPhoto; score: number } | null = null;
    for (const s of searchesFor(slot, query, terms)) {
      const results = await search(s.query);
      for (const [rank, photo] of results.entries()) {
        if (used.has(String(photo.id))) continue;
        const score = photoScore(photo, slot, terms, s.trusted && rank < 5);
        if (acceptable(slot, score) && (!best || score > best.score)) best = { photo, score };
      }
      // Une photo qui montre l'activité dans la bonne scène suffit : inutile de chercher plus.
      if (best && best.score >= 15) break;
    }
    if (best) {
      photos[slot] = best.photo;
      used.add(String(best.photo.id));
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
