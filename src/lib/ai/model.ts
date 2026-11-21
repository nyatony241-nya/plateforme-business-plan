import "server-only";
import { google } from "@ai-sdk/google";

/**
 * Modèle de rédaction, réglable par AI_MODEL_HYPOTHESES.
 * Avec une clé Gemini (GOOGLE_GENERATIVE_AI_API_KEY), appel direct à Google ;
 * sinon, passage par Vercel AI Gateway.
 */
export const DEFAULT_MODEL =
  process.env.AI_MODEL_HYPOTHESES?.trim() ||
  (process.env.GOOGLE_GENERATIVE_AI_API_KEY ? "google/gemini-3.8-flash" : "anthropic/claude-sonnet-5.5");

/** « google/… » + clé Gemini → API Google directe ; tout autre identifiant → AI Gateway. */
export function resolveModel(id: string) {
  if (id.startsWith("google/") && process.env.GOOGLE_GENERATIVE_AI_API_KEY) return google(id.slice("google/".length));
  return id;
}
