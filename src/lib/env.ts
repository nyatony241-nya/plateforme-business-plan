/**
 * Configuration Supabase lue depuis l'environnement.
 * L'intégration Supabase de Vercel fournit NEXT_PUBLIC_SUPABASE_URL et
 * NEXT_PUBLIC_SUPABASE_ANON_KEY ; la clé « publishable » plus récente est aussi acceptée.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export function requireSupabaseEnv(): { url: string; key: string } {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase n'est pas configuré : définir NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return { url: supabaseUrl, key: supabaseKey };
}
