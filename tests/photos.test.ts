import { unzipSync, strFromU8 } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";
import { computeScenarios } from "@/engine";
import { defaultAssumptions, toPlanInput } from "@/lib/assumptions";
import { planDocumentSchema, type PlanPhoto } from "@/lib/business-plan";
import { findPlanPhotos, searchPhoto } from "@/lib/images/pexels";
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

describe("photos Pexels", () => {
  it("ne cherche rien sans clé", async () => {
    vi.stubEnv("PEXELS_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await findPlanPhotos({ couverture: "socks shop" })).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("garde le crédit du photographe et évite de reprendre la même photo", async () => {
    vi.stubEnv("PEXELS_API_KEY", "cle-test");
    const fetchMock = vi.fn(async () => Response.json({ photos: [pexelsPhoto(1), pexelsPhoto(2)] }));
    vi.stubGlobal("fetch", fetchMock);
    const photos = await findPlanPhotos({ couverture: "socks shop", projet: "socks display" });
    expect(photos.couverture?.id).toBe(1);
    expect(photos.projet?.id).toBe(2);
    expect(photos.projet?.photographer).toBe("Ama Mensah");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("orientation=landscape");
    expect((init.headers as Record<string, string>).Authorization).toBe("cle-test");
  });

  it("continue sans photo si Pexels ne répond pas", async () => {
    vi.stubEnv("PEXELS_API_KEY", "cle-test");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("erreur", { status: 500 })));
    await expect(searchPhoto("socks", new Set())).rejects.toThrow();
    expect(await findPlanPhotos({ couverture: "socks" })).toEqual({});
  });
});

describe("export Word illustré", () => {
  it("intègre la photo, son crédit, les émoticônes et les chiffres clés", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JPEG)));
    const photo: PlanPhoto = {
      id: 1,
      alt: "Chaussettes",
      photographer: "Ama Mensah",
      photographerUrl: "https://www.pexels.com/@ama",
      pageUrl: "https://www.pexels.com/photo/1/",
      src: "https://images.pexels.com/photos/1/p.jpeg?h=627&w=1200",
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
    expect(xml).toContain("Photos fournies par Pexels");
  });
});
