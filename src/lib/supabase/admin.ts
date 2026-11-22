import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase avec la clé secrète, pour les seules écritures que l'utilisateur ne peut pas
 * faire lui-même (créditer un paiement confirmé). Null si la clé n'est pas configurée.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
