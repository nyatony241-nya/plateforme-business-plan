-- =============================================================================
-- Business plan rédigé : un document par projet, produit par l'IA.
-- =============================================================================

create table public.business_plans (
  project_id uuid primary key references public.projects (id) on delete cascade,
  schema_version integer not null default 1,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.business_plans enable row level security;

create policy business_plans_owner on public.business_plans
  for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
