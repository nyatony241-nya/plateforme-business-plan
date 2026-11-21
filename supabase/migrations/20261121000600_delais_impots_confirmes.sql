-- Délais de création et règles d'impôts confirmés le 21/11/2026.
update public.procedures p
set details = jsonb_set(p.details, '{delai}',
  (p.details -> 'delai') || jsonb_build_object('statut', 'verifie', 'note', 'Confirmé le 21/11/2026.'))
where p.country_code = 'GA' and p.details ? 'delai';

update public.tax_parameters
set status = 'verifie',
    note = coalesce(note || ' ', '') || 'Confirmé le 21/11/2026.'
where country_code = 'GA'
  and code in ('isl_seuil_ca', 'regime_reel_seuil_ca', 'tva_taux', 'tva_seuil_ca', 'patente_taux', 'patente_minimum');
