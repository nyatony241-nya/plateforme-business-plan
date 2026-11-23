import { describe, expect, it } from "vitest";
import { budgetBucket, normalizeIdea, type AiIdea } from "@/lib/ai/analyze-idea";
import { assistantProjectSchema } from "@/lib/validation";

const CITIES = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Akanda" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Libreville" },
  { id: "33333333-3333-4333-8333-333333333333", name: "Owendo" },
];

const base: AiIdea = {
  clear: true,
  clarification: "",
  summary: "Vous voulez ouvrir une boutique de chaussettes.",
  name: "Tchock's",
  sector: "Prêt-à-porter",
  city: "",
  country: "",
  district: "",
  budget: 0,
  mode: "inconnu",
  staffing: "inconnu",
};

describe("lecture de l'idée par l'assistant", () => {
  const AFRIQUE = [
    { id: "a", name: "Libreville", countryName: "Gabon" },
    { id: "b", name: "Port-Gentil", countryName: "Gabon" },
    { id: "c", name: "Abidjan", countryName: "Côte d'Ivoire" },
    { id: "d", name: "Brazzaville", countryName: "Congo" },
  ];

  it("reconnaît une ville d'un autre pays, même écrite sans trait d'union", () => {
    expect(normalizeIdea({ ...base, city: "Abidjan", country: "Côte d'Ivoire" }, AFRIQUE).cityId).toBe("c");
    expect(normalizeIdea({ ...base, city: "port gentil" }, AFRIQUE).cityId).toBe("b");
  });

  it("reconnaît la ville sans tenir compte des accents ni des majuscules", () => {
    expect(normalizeIdea({ ...base, city: "libreville" }, CITIES).cityId).toBe(CITIES[1].id);
  });

  it("un quartier qui porte le nom d'une ville pilote désigne cette ville", () => {
    const a = normalizeIdea({ ...base, district: "Akanda" }, CITIES);
    expect(a.cityId).toBe(CITIES[0].id);
    expect(a.district).toBe("");
  });

  it("laisse vide ce qui n'a pas été dit, pour le demander", () => {
    const a = normalizeIdea(base, CITIES);
    expect(a).toMatchObject({ cityId: null, budget: null, mode: null, staffing: null, clarification: null });
  });

  it("ramène le budget cité à la tranche qui le contient", () => {
    expect(budgetBucket(2_000_000)).toBe(3_000_000);
    expect(budgetBucket(500_000)).toBe(500_000);
    expect(budgetBucket(80_000_000)).toBe(100_000_000);
    expect(budgetBucket(500_000_000)).toBe(100_000_000);
    expect(budgetBucket(0)).toBeNull();
  });

  it("pose une question quand l'idée est trop vague", () => {
    expect(normalizeIdea({ ...base, clear: false, clarification: "" }, CITIES).clarification).toBe(
      "Que voulez-vous vendre, et à qui ?",
    );
  });
});

describe("création par l'assistant", () => {
  const ok = {
    idea: "Boutique de chaussettes à Akanda, seul, 2 millions.",
    name: "Tchock's",
    cityId: CITIES[0].id,
    district: "",
    sector: "Prêt-à-porter",
    budget: "3000000",
    mode: "local",
    staffing: "seul",
  };

  it("accepte un projet complet et convertit le budget", () => {
    const parsed = assistantProjectSchema.safeParse(ok);
    expect(parsed.success && parsed.data.budget).toBe(3_000_000);
  });

  it("exige l'idée, la ville et les trois choix", () => {
    expect(assistantProjectSchema.safeParse({ ...ok, idea: "court" }).success).toBe(false);
    expect(assistantProjectSchema.safeParse({ ...ok, cityId: "" }).success).toBe(false);
    expect(assistantProjectSchema.safeParse({ ...ok, staffing: undefined }).success).toBe(false);
  });
});
