import { z } from "zod";

const status = z.enum(["verifie", "estimation", "hypothese"]);

export const procedureStepsSchema = z.array(z.object({ titre: z.string(), detail: z.string() }));

export const procedureDetailsSchema = z.object({
  avantages: z.array(z.string()).default([]),
  inconvenients: z.array(z.string()).default([]),
  pieces: z.array(z.string()).default([]),
  frais: z
    .array(
      z.object({
        libelle: z.string(),
        gabonais: z.number(),
        non_gabonais: z.number(),
        statut: status,
        note: z.string().nullable().optional(),
        source_id: z.string().uuid().optional(),
      }),
    )
    .default([]),
  delai: z.object({ texte: z.string(), statut: status, source_id: z.string().uuid().optional() }).optional(),
});

export type ProcedureSteps = z.infer<typeof procedureStepsSchema>;
export type ProcedureDetails = z.infer<typeof procedureDetailsSchema>;
export type LegalForm = "EI" | "SOCIETE";

export const LEGAL_FORM_LABEL: Record<LegalForm, string> = {
  EI: "Entreprise individuelle",
  SOCIETE: "Société (SARLU si vous êtes seul associé, SARL à plusieurs)",
};

/**
 * Forme juridique conseillée, règle simple et explicable :
 * seul et petit budget → entreprise individuelle ; avec du personnel ou un budget
 * d'au moins 10 millions → société, pour limiter la responsabilité et rassurer les banques.
 */
export function recommendLegalForm(input: { staffing: "seul" | "recruter" | null; budget: number | null }): {
  form: LegalForm;
  reason: string;
} {
  if (input.staffing === "recruter") {
    return {
      form: "SOCIETE",
      reason:
        "Vous prévoyez d'embaucher : une société limite votre responsabilité à vos apports et inspire davantage confiance aux banques et aux partenaires.",
    };
  }
  if ((input.budget ?? 0) >= 10_000_000) {
    return {
      form: "SOCIETE",
      reason:
        "Votre budget est important : une société protège votre patrimoine personnel et facilite l'accès au crédit.",
    };
  }
  return {
    form: "EI",
    reason:
      "Vous démarrez seul avec un budget modeste : l'entreprise individuelle est la forme la plus simple et la moins chère. Une SARLU reste possible si vous voulez protéger votre patrimoine personnel.",
  };
}
