import { createClient, getCurrentUser } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE = /^[a-z0-9-]{1,60}\.(png|jpg|webp)$/;
const TYPES = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" } as const;

/** Illustration IA d'un projet ; le stockage ne la remet qu'au propriétaire du projet. */
export async function GET(_request: Request, ctx: RouteContext<"/api/images/[projectId]/[file]">) {
  const { projectId, file } = await ctx.params;
  if (!UUID.test(projectId) || !FILE.test(file)) return new Response("Introuvable.", { status: 404 });
  if (!(await getCurrentUser())) return new Response("Connexion requise.", { status: 401 });

  const supabase = await createClient();
  const { data } = await supabase.storage.from("plan-images").download(`${projectId}/${file}`);
  if (!data) return new Response("Introuvable.", { status: 404 });

  const ext = file.split(".").pop() as keyof typeof TYPES;
  return new Response(data, {
    headers: {
      "Content-Type": TYPES[ext],
      // Chaque fichier a un nom unique : il ne change jamais.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
