-- Coût réel de chaque appel à l'IA : réflexion cachée du modèle, cache, coût en dollars.
alter table public.ai_runs
  add column reasoning_tokens integer,
  add column cached_input_tokens integer,
  add column cost_usd numeric(12, 6);

comment on column public.ai_runs.output_tokens is 'Jetons de sortie facturés, réflexion comprise.';
comment on column public.ai_runs.reasoning_tokens is 'Dont réflexion cachée du modèle (thinking).';
comment on column public.ai_runs.cost_usd is 'Coût de l''appel au tarif du jour de l''appel.';
