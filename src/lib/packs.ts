/** Prix d'un plan dans une formule, et économie par rapport au plan acheté seul. */
type Pack = { credits: number; price_xaf: number };

export const perPlan = (p: Pack) => Math.round(p.price_xaf / Math.max(1, p.credits));

/** Prix d'un plan acheté seul (formule à 1 crédit), sinon le plus cher par plan. */
export const singlePrice = (packs: Pack[]) =>
  packs.find((p) => p.credits === 1)?.price_xaf ?? Math.max(0, ...packs.map(perPlan));

/** Économie en pourcentage entier par rapport au plan acheté seul (0 pour la formule à 1 plan). */
export function saving(p: Pack, packs: Pack[]) {
  const base = singlePrice(packs);
  return base > 0 ? Math.max(0, Math.round((1 - perPlan(p) / base) * 100)) : 0;
}

/** Plus petit prix par plan parmi les formules. */
export const bestPerPlan = (packs: Pack[]) => (packs.length ? Math.min(...packs.map(perPlan)) : null);
