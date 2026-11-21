import { unzipSync, strFromU8 } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";
import { computeScenarios } from "@/engine";
import { defaultAssumptions, toPlanInput } from "@/lib/assumptions";
import { planDocumentSchema, type PlanPhoto } from "@/lib/business-plan";
import { findPlanPhotos, photoProvider, searchPhoto } from "@/lib/images/photos";
import { businessPlanDocx } from "@/lib/word/business-plan-docx";
import { TEST_PARAMS } from "./engine/fixtures";
import { SAMPLE_DOC } from "./plan-doc-fixture";

const JPEG = Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDzeiiimeKf/9k=", "base64");

function pexelsPhoto(id: number) {
  return {
    id,
    url: `https://www.pexels.com/photo/${id}/`,
    alt: "Chaussettes en rayon",
    photographer: "Ama Mensah",
    photographer_url: "https://www.pexels.com/@ama",
    src: { landscape: `https://images.pexels.com/photos/${id}/p.jpeg?h=627&w=1200` },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function unsplashPhoto(id: string) {
  return {
    id,
    alt_description: "socks on a shelf",
    urls: { raw: `https://images.unsplash.com/photo-${id}?ixid=abc` },
    links: { html: `https://unsplash.com/photos/${id}`, download_location: `https://api.unsplash.com/photos/${id}/download?ixid=abc` },
    user: { name: "Kofi Boateng", links: { html: "https://unsplash.com/@kofi" } },
  };
}

describe("photos libres de droit", () => {
  it("ne cherche rien sans clé", async () => {
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "");
    vi.stubEnv("PEXELS_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(photoProvider()).toBeNull();
    expect(await findPlanPhotos({ couverture: "socks shop" })).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Unsplash en priorité : crédit avec lien de suivi, recadrage paysage, pas de doublon", async () => {
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "cle-unsplash");
    vi.stubEnv("PEXELS_API_KEY", "cle-pexels");
    const fetchMock = vi.fn(async () => Response.json({ results: [unsplashPhoto("a1"), unsplashPhoto("b2")] }));
    vi.stubGlobal("fetch", fetchMock);
    const photos = await findPlanPhotos({ couverture: "socks shop", projet: "socks display" });
    expect(photos.couverture).toMatchObject({ source: "unsplash", id: "a1", photographer: "Kofi Boateng" });
    expect(photos.projet?.id).toBe("b2");
    expect(photos.couverture?.photographerUrl).toContain("utm_source=entreprendre");
    expect(photos.couverture?.src).toContain("w=1200&h=627&fit=crop");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("api.unsplash.com/search/photos");
    expect((init.headers as Record<string, string>).Authorization).toBe("Client-ID cle-unsplash");
  });

  it("Pexels si seule sa clé existe", async () => {
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "");
    vi.stubEnv("PEXELS_API_KEY", "cle-pexels");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ photos: [pexelsPhoto(1)] })));
    expect((await findPlanPhotos({ couverture: "socks" })).couverture).toMatchObject({ source: "pexels", id: 1 });
  });

  it("continue sans photo si la banque d'images ne répond pas", async () => {
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "cle-unsplash");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("erreur", { status: 500 })));
    await expect(searchPhoto("socks", new Set())).rejects.toThrow();
    expect(await findPlanPhotos({ couverture: "socks" })).toEqual({});
  });
});

describe("export Word illustré", () => {
  it("intègre la photo, son crédit, les émoticônes et les chiffres clés", async () => {
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "cle-unsplash");
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(async () => new Response(JPEG));
    vi.stubGlobal("fetch", fetchMock);
    const photo: PlanPhoto = {
      source: "unsplash",
      id: "a1",
      alt: "Chaussettes",
      photographer: "Ama Mensah",
      photographerUrl: "https://unsplash.com/@ama",
      pageUrl: "https://unsplash.com/photos/a1",
      src: "https://images.unsplash.com/photo-a1?w=1200&h=627&fit=crop",
      downloadLocation: "https://api.unsplash.com/photos/a1/download",
    };
    const doc = planDocumentSchema.parse({ ...SAMPLE_DOC, photos: { couverture: photo } });
    const a = { ...defaultAssumptions(new Date("2026-11-21T12:00:00Z")), offers: [{ id: "o", label: "Paire", unitPrice: 1500, unitCost: 600, monthlyVolume: 250, rampUpMonths: 3, annualVolumeGrowth: 0 }] };
    const buffer = await businessPlanDocx({
      doc,
      a,
      results: computeScenarios(toPlanInput(a, TEST_PARAMS)),
      project: { name: "tchock's", sector: null, district: "Akanda", city: "Libreville", country: "Gabon" },
      minimumWage: 150_000,
    });
    const files = unzipSync(new Uint8Array(buffer));
    expect(Object.keys(files).some((f) => f.startsWith("word/media/"))).toBe(true);
    const xml = strFromU8(files["word/document.xml"]);
    expect(xml).toContain("Ama Mensah");
    expect(xml).toContain("📌");
    expect(xml).toContain("Rentable dès");
    expect(xml).toContain("Photos fournies par Unsplash");
    // Unsplash : téléchargement signalé.
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/download"))).toBe(true);
  });
});

describe("photos adaptées à l'Afrique", () => {
  it("ajoute « african » quand la recherche ne le précise pas", async () => {
    const { africanize } = await import("@/lib/images/photos");
    expect(africanize("socks shop")).toBe("african socks shop");
    expect(africanize("African woman market")).toBe("African woman market");
  });

  it("cherche d'abord en Afrique, puis la recherche d'origine si rien ne sort", async () => {
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "cle-unsplash");
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(async (url) =>
      Response.json({ results: url.includes("african") ? [] : [unsplashPhoto("z9")] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const photos = await findPlanPhotos({ couverture: "colorful socks" });
    expect(fetchMock.mock.calls[0][0]).toContain("african%20colorful%20socks");
    expect(photos.couverture?.id).toBe("z9");
  });
});

describe("photos fidèles à l'activité", () => {
  const shot = (id: string, alt: string) => ({ ...unsplashPhoto(id), alt_description: alt });

  it("écarte les photos hors sujet et préfère l'Afrique et la scène de la section", async () => {
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "cle-unsplash");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          results: [
            shot("velo", "A black and white photo of a man on a bicycle"),
            shot("rayon", "colorful socks on a shelf"),
            shot("client", "black woman buying socks at a market stall"),
          ],
        }),
      ),
    );
    const photos = await findPlanPhotos({ marche: "african woman buying socks", projet: "colorful socks display" }, ["sock", "socks"]);
    expect(photos.projet?.id).toBe("rayon");
    expect(photos.marche?.id).toBe("client");
  });

  it("se replie sur le produit seul, sinon laisse la section sans photo", async () => {
    vi.stubEnv("UNSPLASH_ACCESS_KEY", "cle-unsplash");
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(async (url) =>
      Response.json({
        results: url.endsWith("query=socks&orientation=landscape&content_filter=high&per_page=20")
          ? [shot("seul", "pair of striped socks")]
          : [shot("velo", "man on a bicycle"), shot("tel", "person holding a smartphone")],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const photos = await findPlanPhotos(
      { couverture: "african man selling socks shop", marche: "african woman buying socks", marketing: "socks smartphone" },
      ["sock", "socks"],
    );
    expect(photos.couverture?.id).toBe("seul");
    expect(photos.marche).toBeUndefined();
    // La section marketing accepte une scène de promotion générique.
    expect(photos.marketing?.id).toBe("tel");
  });

  it("chaque recherche nomme ce que l'entreprise vend", async () => {
    const { photoBrief } = await import("@/lib/ai/generate-plan-document");
    const brief = photoBrief({
      motsCles: ["Sock", "socks", "x"],
      couverture: "african shop owner counter",
      projet: "colorful socks display",
      marche: "african clients street",
      marketing: "african person smartphone",
    });
    expect(brief.photoKeywords).toEqual(["sock", "socks"]);
    expect(brief.photoQueries.couverture).toBe("sock african shop owner counter");
    expect(brief.photoQueries.projet).toBe("colorful socks display");
  });
});
