"use client";

import { buttonClass } from "@/components/ui";

/** Ouvre la boîte d'impression du navigateur : « Enregistrer en PDF » produit le fichier. */
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("primary")}>
      Télécharger en PDF
    </button>
  );
}
