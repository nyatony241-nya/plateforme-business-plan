/**
 * Identité de la marque.
 * Le nom définitif n'est pas encore choisi : il se change ici, ou via la variable
 * d'environnement NEXT_PUBLIC_BRAND_NAME, sans toucher au reste du code.
 */
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "Entreprendre",
  tagline: "De l'idée à l'entreprise rentable",
  pilot: {
    country: "Gabon",
    cities: ["Libreville", "Akanda", "Owendo"],
  },
} as const;
