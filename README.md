# Plateforme business plans — pilote Gabon

Application web qui transforme une idée en business plan fondé sur les réalités locales :
chiffres sourcés et datés, calculs faits par un moteur déterministe, démarches officielles.
Pilote : Libreville, Akanda, Owendo.

Le nom de la marque est provisoire : il se change dans `src/config/brand.ts` ou via
`NEXT_PUBLIC_BRAND_NAME`.

## Stack

- Next.js 16 (App Router, TypeScript), Tailwind CSS 4
- Supabase : PostgreSQL, authentification, sécurité au niveau des lignes
- Vitest pour les tests
- Hébergement Vercel

## Démarrer en local

```bash
npm install
cp .env.example .env.local   # renseigner l'URL et la clé Supabase
npm run dev                  # http://localhost:3000
```

Sans variables Supabase, le site public fonctionne et les pages privées affichent
« Base de données en cours de raccordement ».

## Base de données

Les migrations sont dans `supabase/migrations/`. À appliquer dans l'ordre, depuis
l'éditeur SQL de Supabase ou avec la CLI Supabase (`supabase db push`).

Règles clés du schéma :

- toute table publique a la sécurité au niveau des lignes ;
- chaque donnée de référence a une source, une date de vérification et une date d'expiration ;
- le référentiel n'accepte que `verifie` ou `estimation` ; une estimation exige sa méthode ;
- les projets ne sont visibles que par leur propriétaire ;
- toute modification du référentiel est journalisée (`change_log`).

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm test` | Tests (Vitest) |
| `npm run lint` | Analyse ESLint |
| `npm run typecheck` | Vérification TypeScript |

## Organisation

```
src/app/            pages et actions serveur (routes en français)
src/components/     composants d'interface
src/config/         marque et réglages
src/lib/            accès aux données, Supabase, validation, statuts des données
supabase/migrations schéma SQL
tests/              tests Vitest
```

## Feuille de route

Phase 0 (fondations) en cours : compte, projet vide, déploiement. Ensuite : moteur financier
(phase 1), IA et exports (phase 2), référentiel Gabon et module « Créer mon entreprise »
(phase 3), paiement Chariow et SasPay, landing et bêta (phase 4).
