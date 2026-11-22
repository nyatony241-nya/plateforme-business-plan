-- Grille de prix du 22/11/2026 (modifiable ensuite dans l'espace admin).
-- Repères : freelances 10 000 à 60 000 FCFA, générateur IA concurrent dès 100 000 FCFA,
-- consultants 500 000 FCFA et plus. Coût de l'IA : moins de 50 FCFA par plan.
update public.credit_packs set name = 'Essentiel', credits = 1, price_xaf = 10000 where code = 'starter';
update public.credit_packs set name = 'Pro', credits = 3, price_xaf = 20000 where code = 'pro';
update public.credit_packs set name = 'Business', credits = 10, price_xaf = 50000 where code = 'business';
