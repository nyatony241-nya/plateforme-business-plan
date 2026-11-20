import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requireSupabaseEnv } from "@/lib/env";

const PROTECTED_PREFIXES = ["/tableau-de-bord", "/projets"];
const GUEST_ONLY = ["/connexion", "/inscription"];

export function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isGuestOnlyPath(pathname: string) {
  return GUEST_ONLY.includes(pathname);
}

/**
 * Rafraîchit la session Supabase à chaque navigation et applique les redirections :
 * pages privées → connexion ; pages de connexion → tableau de bord si déjà connecté.
 */
export async function updateSession(request: NextRequest) {
  const { url, key } = requireSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([header, value]) =>
          response.headers.set(header, value),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  if (!isSignedIn && isProtectedPath(pathname)) {
    const target = request.nextUrl.clone();
    target.pathname = "/connexion";
    target.search = `?suite=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(target);
  }

  if (isSignedIn && isGuestOnlyPath(pathname)) {
    const target = request.nextUrl.clone();
    target.pathname = "/tableau-de-bord";
    target.search = "";
    return NextResponse.redirect(target);
  }

  return response;
}
