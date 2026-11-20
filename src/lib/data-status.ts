/**
 * Statut d'une donnée chiffrée. C'est une règle centrale du produit :
 * chaque chiffre affiché indique s'il est vérifié, estimé ou supposé.
 */
export type DataStatus = "verifie" | "estimation" | "hypothese";

export const DATA_STATUS_LABEL: Record<DataStatus, string> = {
  verifie: "Vérifié",
  estimation: "Estimation",
  hypothese: "Hypothèse",
};

export const DATA_STATUS_HELP: Record<DataStatus, string> = {
  verifie: "Source officielle, avec date de vérification.",
  estimation: "Ordre de grandeur tiré d'annonces, de la presse ou de sites marchands.",
  hypothese: "Valeur saisie ou proposée, à confirmer par l'entrepreneur.",
};

/** Une donnée de référence est périmée à sa date d'expiration. */
export function isExpired(expiresAt: string | Date, today: Date = new Date()) {
  const end = typeof expiresAt === "string" ? new Date(`${expiresAt}T23:59:59Z`) : expiresAt;
  return end.getTime() < today.getTime();
}

/** Format court en français : 20/11/2026. */
export function formatDateFr(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Libreville" }).format(date);
}
