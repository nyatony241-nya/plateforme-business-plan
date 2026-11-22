/**
 * Identité de la marque : AfriBiz (choisi par Tony le 22/11/2026).
 * Le nom peut encore être remplacé par la variable NEXT_PUBLIC_BRAND_NAME.
 * Logo : src/components/brand.tsx (marque) et docs/logo (fichiers SVG et PNG).
 */
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "AfriBiz",
  tagline: "De l'idée à l'entreprise rentable",
  pilot: {
    country: "Gabon",
    cities: ["Libreville", "Akanda", "Owendo"],
  },
} as const;
