import { describe, expect, it } from "vitest";
import {
  formDataToObject,
  newProjectSchema,
  signInSchema,
  signUpSchema,
  toFieldErrors,
} from "@/lib/validation";

const CITY_ID = "0b6e7c1a-5d1f-4c2e-9a3b-7f8e9d0c1b2a";

describe("inscription", () => {
  it("accepte un formulaire complet et normalise l'e-mail", () => {
    const result = signUpSchema.parse({
      fullName: "  Tony Nya ",
      email: " Tony@Example.COM ",
      password: "motdepasse",
    });
    expect(result.fullName).toBe("Tony Nya");
    expect(result.email).toBe("tony@example.com");
  });

  it("refuse un mot de passe trop court, avec un message en français", () => {
    const result = signUpSchema.safeParse({ fullName: "Tony", email: "a@b.ga", password: "court" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error).password).toBe("8 caractères au minimum.");
    }
  });
});

describe("connexion", () => {
  it("exige un mot de passe", () => {
    const result = signInSchema.safeParse({ email: "a@b.ga", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("nouveau projet", () => {
  it("accepte le minimum : nom et ville", () => {
    const result = newProjectSchema.parse({ name: "Lavage auto", cityId: CITY_ID });
    expect(result).toEqual({ name: "Lavage auto", cityId: CITY_ID });
  });

  it("refuse une ville absente et un nom trop court", () => {
    const result = newProjectSchema.safeParse({ name: "Ab" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = toFieldErrors(result.error);
      expect(errors.name).toMatch(/au moins 3/);
      expect(errors.cityId).toBeDefined();
    }
  });

  it("limite la description de l'idée à 2 000 caractères", () => {
    const result = newProjectSchema.safeParse({
      name: "Restaurant",
      cityId: CITY_ID,
      idea: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

describe("lecture des formulaires", () => {
  it("ignore les champs vides", () => {
    const form = new FormData();
    form.set("name", "Boutique");
    form.set("district", "   ");
    expect(formDataToObject(form, ["name", "district", "sector"])).toEqual({ name: "Boutique" });
  });
});
