import { describe, expect, it } from "vitest";
import { isGuestOnlyPath, isProtectedPath } from "@/lib/supabase/proxy";

describe("protection des pages", () => {
  it("protège le tableau de bord et les projets", () => {
    expect(isProtectedPath("/tableau-de-bord")).toBe(true);
    expect(isProtectedPath("/projets/123")).toBe(true);
  });

  it("laisse publiques l'accueil et les pages proches par le nom", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/projets-exemples")).toBe(false);
  });

  it("réserve la connexion et l'inscription aux visiteurs", () => {
    expect(isGuestOnlyPath("/connexion")).toBe(true);
    expect(isGuestOnlyPath("/inscription")).toBe(true);
    expect(isGuestOnlyPath("/tableau-de-bord")).toBe(false);
  });
});
