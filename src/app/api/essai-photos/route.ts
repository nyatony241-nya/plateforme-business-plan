import { findPlanPhotos, searchPhotos } from "@/lib/images/photos";

// Route de diagnostic temporaire (site protégé par l'authentification Vercel).
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const searches = q.getAll("s");
  const raw: Record<string, string[]> = {};
  for (const s of searches) raw[s] = (await searchPhotos(s)).slice(0, 12).map((p) => `${p.id} | ${p.alt}`);
  const keywords = q.getAll("k");
  const category = q.get("c") ?? undefined;
  const picked = q.get("pick")
    ? await findPlanPhotos(
        { couverture: q.get("couverture") ?? "", projet: q.get("projet") ?? "", marche: q.get("marche") ?? "", marketing: q.get("marketing") ?? "" },
        keywords,
        category,
      )
    : {};
  return Response.json({ raw, picked: Object.fromEntries(Object.entries(picked).map(([k, v]) => [k, `${v.id} | ${v.alt}`])) });
}
