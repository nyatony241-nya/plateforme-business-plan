/**
 * Identité de la marque : AfriBiz (choisi par Tony le 22/11/2026).
 * Le nom peut encore être remplacé par la variable NEXT_PUBLIC_BRAND_NAME.
 * Logo : src/components/brand.tsx (marque) et docs/logo (fichiers SVG et PNG).
 */
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "AfriBiz",
  tagline: "De l'idée à l'entreprise rentable",
  /** Les 10 marchés ouverts (zone franc CFA), dans l'ordre d'affichage. */
  markets: [
    { flag: "🇬🇦", name: "Gabon", cities: "Libreville, Port-Gentil, Franceville" },
    { flag: "🇨🇮", name: "Côte d'Ivoire", cities: "Abidjan, Bouaké, San-Pédro" },
    { flag: "🇨🇲", name: "Cameroun", cities: "Douala, Yaoundé, Bafoussam" },
    { flag: "🇸🇳", name: "Sénégal", cities: "Dakar, Thiès, Touba" },
    { flag: "🇹🇬", name: "Togo", cities: "Lomé, Kara, Kpalimé" },
    { flag: "🇨🇬", name: "Congo", cities: "Brazzaville, Pointe-Noire" },
    { flag: "🇧🇯", name: "Bénin", cities: "Cotonou, Porto-Novo, Parakou" },
    { flag: "🇧🇫", name: "Burkina Faso", cities: "Ouagadougou, Bobo-Dioulasso" },
    { flag: "🇲🇱", name: "Mali", cities: "Bamako, Sikasso, Ségou" },
    { flag: "🇳🇪", name: "Niger", cities: "Niamey, Zinder, Maradi" },
  ],
} as const;
