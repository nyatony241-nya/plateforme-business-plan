-- Prix unique : un business plan complet à 4 900 FCFA (22/11/2026). Les anciennes formules
-- restent en base (paiements passés) mais ne sont plus en vente.
update public.credit_packs set name = 'Business plan complet', credits = 1, price_xaf = 4900, active = true where code = 'starter';
update public.credit_packs set active = false where code in ('pro', 'business');
