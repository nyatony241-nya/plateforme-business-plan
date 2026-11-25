import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ConfigNotice } from "@/components/config-notice";
import { isSupabaseConfigured } from "@/lib/env";
import { ButtonLink } from "@/components/ui";
import { unlockPlan } from "@/lib/data/credits";
import { settlePayment } from "@/lib/payments/confirm";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Paiement" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Retour de la page de paiement : le dépôt est relu chez pawaPay avant tout crédit. */
export default async function PaymentReturnPage({ searchParams }: PageProps<"/credits/retour">) {
  if (!isSupabaseConfigured) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8">
          <ConfigNotice />
        </main>
      </>
    );
  }
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?suite=/credits");
  const query = await searchParams;
  const paymentId = typeof query.paiement === "string" && UUID.test(query.paiement) ? query.paiement : null;
  const projectId = typeof query.projet === "string" && UUID.test(query.projet) ? query.projet : null;
  if (!paymentId) redirect("/credits");

  const supabase = await createClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, status, provider, credits")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) redirect("/credits");

  let outcome = payment.status === "paye" ? "paid" : payment.status === "echoue" ? "failed" : "pending";
  if (outcome === "pending" && payment.provider === "pawapay") {
    outcome = await settlePayment(payment.id).catch(() => "pending" as const);
  }
  const paid = outcome === "paid";

  // Le plan qui attendait ce paiement est débloqué tout de suite.
  if (paid && projectId && (await unlockPlan(projectId).catch(() => false))) {
    redirect(`/projets/${projectId}/business-plan`);
  }

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? user.email;
  return (
    <>
      <AppHeader name={fullName} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-14 sm:px-8">
        {paid ? (
          <>
            <h1 className="font-display text-3xl font-semibold text-ink">✅ Paiement reçu</h1>
            <p className="text-ink-soft">
              {payment.credits} crédit{payment.credits > 1 ? "s ont" : " a"} été ajouté{payment.credits > 1 ? "s" : ""} à votre
              compte.
            </p>
            <ButtonLink href="/tableau-de-bord" className="self-start">
              Retour à mes projets
            </ButtonLink>
          </>
        ) : outcome === "failed" ? (
          <>
            <h1 className="font-display text-3xl font-semibold text-ink">❌ Paiement non abouti</h1>
            <p className="text-ink-soft">
              Le paiement n&apos;a pas été validé. Vérifiez le solde de votre compte mobile money, puis réessayez. Si votre
              compte a quand même été débité, contactez-nous.
            </p>
            <ButtonLink href={`/credits${projectId ? `?projet=${projectId}` : ""}`} className="self-start">
              Réessayer
            </ButtonLink>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-semibold text-ink">⏳ Paiement en cours de confirmation</h1>
            <p className="text-ink-soft">
              Validez le paiement sur votre téléphone si ce n&apos;est pas déjà fait. La confirmation arrive en général en
              moins d&apos;une minute.
            </p>
            <ButtonLink href={`/credits/retour?paiement=${paymentId}${projectId ? `&projet=${projectId}` : ""}`} className="self-start">
              Actualiser
            </ButtonLink>
          </>
        )}
      </main>
    </>
  );
}
