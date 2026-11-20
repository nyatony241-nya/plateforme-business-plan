import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Lien reçu par e-mail (confirmation d'inscription).
 * Accepte les deux formats de Supabase : `code` (PKCE) ou `token_hash` + `type`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const suite = searchParams.get("suite");
  const next = suite?.startsWith("/") && !suite.startsWith("//") ? suite : "/tableau-de-bord";

  if (!isSupabaseConfigured) return NextResponse.redirect(new URL("/", origin));

  const supabase = await createClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Lien incomplet") };

  if (error) return NextResponse.redirect(new URL("/connexion?erreur=lien", origin));
  return NextResponse.redirect(new URL(next, origin));
}
