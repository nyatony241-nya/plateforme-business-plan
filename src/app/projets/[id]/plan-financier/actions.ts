"use server";

import { z } from "zod";
import { assumptionsSchema } from "@/lib/assumptions";
import { upsertAssumptions } from "@/lib/data/projects";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";

export type SaveResult = { ok: true; savedAt: string } | { ok: false; message: string };

export async function saveAssumptions(projectId: string, data: unknown): Promise<SaveResult> {
  if (!isSupabaseConfigured) return { ok: false, message: "Base de données non raccordée." };
  if (!z.string().uuid().safeParse(projectId).success) return { ok: false, message: "Projet inconnu." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Session expirée : reconnectez-vous." };

  const parsed = assumptionsSchema.safeParse(data);
  if (!parsed.success) return { ok: false, message: "Certaines valeurs sont invalides." };

  try {
    const savedAt = await upsertAssumptions(projectId, parsed.data);
    return { ok: true, savedAt };
  } catch {
    return { ok: false, message: "Enregistrement impossible. Vos saisies restent à l'écran." };
  }
}
