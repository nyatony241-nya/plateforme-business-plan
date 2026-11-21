-- =============================================================================
-- Génération automatique du plan : contexte du projet, salaire minimum,
-- journal des appels à l'IA.
-- =============================================================================

alter table public.projects
  add column budget bigint check (budget is null or budget >= 0),
  add column mode text check (mode is null or mode in ('local', 'en_ligne', 'mixte')),
  add column staffing text check (staffing is null or staffing in ('seul', 'recruter'));

-- Revenu minimum mensuel, plancher des salaires proposés.
with s as (
  insert into public.sources (title, url, publisher, source_type, published_at, accessed_at, notes) values
    ('Salaires minimums – Gabon (décret n°0127/PR/MTEPS/MBCPFPRE du 22/04/2010)',
     'https://wageindicator.org/fr-ga/ai/travail-au-gabon/salaire-minimum/', 'WageIndicator', 'autre', null, '2026-11-21',
     'Page valable en août 2026.')
  returning id
)
insert into public.tax_parameters
  (country_code, code, label, value, unit, valid_from, source_id, verified_at, status, note)
select 'GA', 'revenu_minimum_mensuel', 'Revenu minimum mensuel', 150000, 'xaf', '2010-01-01', s.id, '2026-11-21', 'estimation',
  'WageIndicator : 150 000 FCFA (décret de 2010). La presse gabonaise rappelle un SMIG de base de 80 000 FCFA (2006), hors primes. Retenu comme plancher des salaires proposés ; à confirmer auprès du ministère du Travail.'
from s;

-- Journal des appels à l'IA : coût et durée suivis par utilisateur.
create table public.ai_runs (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  purpose text not null,
  model text not null,
  status text not null check (status in ('succes', 'echec')),
  duration_ms integer,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

create index ai_runs_user on public.ai_runs (user_id, created_at desc);

alter table public.ai_runs enable row level security;

create policy ai_runs_insert_own on public.ai_runs
  for insert to authenticated with check (user_id = auth.uid());
create policy ai_runs_select_own on public.ai_runs
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
