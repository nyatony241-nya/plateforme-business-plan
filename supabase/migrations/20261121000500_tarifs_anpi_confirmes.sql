-- Tarifs de l'ANPI confirmés le 21/11/2026 : ceux du portail officiel GNI sont les bons.
update public.procedures p set details = jsonb_set(
  p.details, '{frais}', (
    select jsonb_agg(
      f || jsonb_build_object(
        'statut', 'verifie',
        'note', case
          when f ->> 'libelle' = 'Modification' and p.legal_form = 'EI'
            then 'Tarif du portail officiel, confirmé le 21/11/2026. Plus 25 000 FCFA de nom commercial (OGAPI) si besoin.'
          else 'Tarif du portail officiel GNI, confirmé le 21/11/2026.'
        end))
    from jsonb_array_elements(p.details -> 'frais') f
  ))
where p.country_code = 'GA';
