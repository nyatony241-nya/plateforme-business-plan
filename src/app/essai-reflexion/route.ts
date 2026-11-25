import { generateText } from "ai";
import { DEFAULT_MODEL, lightThinking, resolveModel } from "@/lib/ai/model";
import { aiCostUsd, usageFrom } from "@/lib/ai/pricing";

// Essai TEMPORAIRE (branche d'aperçu uniquement) : même demande avec et sans réflexion réduite.
export const maxDuration = 120;

const PROMPT =
  "Rédige en français le résumé (5 phrases) et la présentation (8 phrases) d'un projet : boutique de prêt-à-porter « Tchock's » à Akanda (Gabon), budget 3 millions de FCFA, vente en boutique et sur WhatsApp. Aucun montant.";

async function run(light: boolean) {
  const started = Date.now();
  const r = await generateText({
    model: resolveModel(DEFAULT_MODEL),
    prompt: PROMPT,
    providerOptions: light ? lightThinking() : undefined,
    maxRetries: 0,
    timeout: 90_000,
  });
  const usage = usageFrom(r.usage);
  return { light, ms: Date.now() - started, usage, usd: aiCostUsd(DEFAULT_MODEL, usage), debut: r.text.slice(0, 300) };
}

export async function GET() {
  if (process.env.VERCEL_ENV === "production") return new Response("Introuvable.", { status: 404 });
  try {
    const [normal, leger] = await Promise.all([run(false), run(true)]);
    return Response.json({ model: DEFAULT_MODEL, normal, leger });
  } catch (error) {
    return new Response(`Échec : ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
  }
}
