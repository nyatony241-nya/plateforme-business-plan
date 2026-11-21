-- Les frais et délais des démarches pointent vers leur source par identifiant.
with ids as (
  select (select id from public.sources where url = 'https://www.gni-anpigabon.com/gni-guide/individual') as guide,
         (select id from public.sources where url like 'https://fcagabon.com/%') as fca
)
update public.procedures p set details = jsonb_set(
  jsonb_set(p.details, '{frais}', (
    select jsonb_agg((f - 'source') || jsonb_build_object('source_id', (select guide from ids)))
    from jsonb_array_elements(p.details -> 'frais') f
  )),
  '{delai}', ((p.details -> 'delai') - 'source') || jsonb_build_object('source_id', (select fca from ids))
)
where p.country_code = 'GA';
