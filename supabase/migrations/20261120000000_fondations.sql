-- =============================================================================
-- Phase 0 — Fondations
-- Référentiel sourcé (pays, villes, données, institutions, procédures, fiscalité),
-- profils et projets. Toute table publique a la sécurité au niveau des lignes (RLS).
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------
create type public.statut_donnee as enum ('verifie', 'estimation', 'hypothese');

create type public.type_source as enum (
  'officielle',
  'organisation_internationale',
  'presse',
  'annonce',
  'site_marchand',
  'autre'
);

create type public.role_utilisateur as enum ('utilisateur', 'admin');

-- -----------------------------------------------------------------------------
-- Profils (un par compte Supabase Auth)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.role_utilisateur not null default 'utilisateur',
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Géographie
-- -----------------------------------------------------------------------------
create table public.countries (
  code char(2) primary key,               -- ISO 3166-1 alpha-2
  name text not null,
  currency char(3) not null,              -- ISO 4217
  locale text not null default 'fr',
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries (code),
  name text not null,
  region text,
  is_pilot boolean not null default false,
  created_at timestamptz not null default now(),
  unique (country_code, name)
);

create table public.districts (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (city_id, name)
);

create table public.sectors (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  parent_id uuid references public.sectors (id),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Sources et données de référence
-- -----------------------------------------------------------------------------
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text,
  publisher text,
  source_type public.type_source not null,
  published_at date,
  accessed_at date not null,              -- date de consultation
  notes text,
  created_at timestamptz not null default now()
);

create table public.data_points (
  id uuid primary key default gen_random_uuid(),
  indicator text not null,                -- ex. loyer_local_commercial_m2_mois
  value numeric not null,
  value_min numeric,
  value_max numeric,
  unit text not null,
  currency char(3),
  country_code char(2) not null references public.countries (code),
  city_id uuid references public.cities (id),
  district_id uuid references public.districts (id),
  sector_id uuid references public.sectors (id),
  status public.statut_donnee not null,
  method text,                            -- obligatoire pour une estimation
  source_id uuid not null references public.sources (id),
  verified_at date not null,
  expires_at date not null,
  verified_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  -- Le référentiel ne contient que du vérifié ou de l'estimé : les hypothèses
  -- appartiennent aux projets des utilisateurs.
  constraint data_points_pas_d_hypothese check (status <> 'hypothese'),
  constraint data_points_methode_estimation check (status <> 'estimation' or method is not null),
  constraint data_points_fourchette check (
    value_min is null or value_max is null or value_min <= value_max
  ),
  constraint data_points_expiration check (expires_at >= verified_at)
);

create index data_points_lookup on public.data_points (country_code, indicator, city_id, sector_id);

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries (code),
  city_id uuid references public.cities (id),
  name text not null,
  acronym text,
  role text not null,
  address text,
  phone text,
  website text,
  opening_hours text,
  source_id uuid not null references public.sources (id),
  verified_at date not null,
  expires_at date not null,
  created_at timestamptz not null default now(),
  constraint institutions_expiration check (expires_at >= verified_at)
);

create table public.procedures (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries (code),
  title text not null,
  legal_form text,                        -- ex. SARL, SARLU, entreprise individuelle
  summary text,
  steps jsonb not null default '[]'::jsonb, -- [{titre, details, pieces[], cout_xaf, delai}]
  source_id uuid not null references public.sources (id),
  verified_at date not null,
  expires_at date not null,
  created_at timestamptz not null default now(),
  constraint procedures_steps_tableau check (jsonb_typeof(steps) = 'array'),
  constraint procedures_expiration check (expires_at >= verified_at)
);

create table public.tax_parameters (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries (code),
  code text not null,                     -- ex. tva_taux_normal, is_taux
  label text not null,
  value numeric not null,
  unit text not null,                     -- 'pourcentage' ou 'xaf'
  valid_from date not null,
  valid_to date,
  source_id uuid not null references public.sources (id),
  verified_at date not null,
  created_at timestamptz not null default now(),
  constraint tax_parameters_periode check (valid_to is null or valid_to >= valid_from),
  unique (country_code, code, valid_from)
);

-- -----------------------------------------------------------------------------
-- Projets des utilisateurs
-- -----------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 3 and 120),
  country_code char(2) not null default 'GA' references public.countries (code),
  city_id uuid references public.cities (id),
  district text,
  sector text,
  idea text check (idea is null or char_length(idea) <= 2000),
  status text not null default 'brouillon',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner on public.projects (owner_id, updated_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Journal des modifications du référentiel
-- -----------------------------------------------------------------------------
create table public.change_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id text not null,
  action text not null,
  before jsonb,
  after jsonb,
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now()
);

create or replace function public.log_reference_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.change_log (table_name, row_id, action, before, after)
  values (
    tg_table_name,
    coalesce((case when tg_op = 'DELETE' then old.id else new.id end)::text, ''),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger sources_log after insert or update or delete on public.sources
  for each row execute function public.log_reference_change();
create trigger data_points_log after insert or update or delete on public.data_points
  for each row execute function public.log_reference_change();
create trigger institutions_log after insert or update or delete on public.institutions
  for each row execute function public.log_reference_change();
create trigger procedures_log after insert or update or delete on public.procedures
  for each row execute function public.log_reference_change();
create trigger tax_parameters_log after insert or update or delete on public.tax_parameters
  for each row execute function public.log_reference_change();

-- -----------------------------------------------------------------------------
-- Sécurité au niveau des lignes
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.countries enable row level security;
alter table public.cities enable row level security;
alter table public.districts enable row level security;
alter table public.sectors enable row level security;
alter table public.sources enable row level security;
alter table public.data_points enable row level security;
alter table public.institutions enable row level security;
alter table public.procedures enable row level security;
alter table public.tax_parameters enable row level security;
alter table public.projects enable row level security;
alter table public.change_log enable row level security;

-- Profils : chacun lit et modifie le sien (le rôle n'est modifiable que par un admin).
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));
create policy profiles_admin_update on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Référentiel : lecture publique, écriture réservée aux administrateurs.
create policy countries_read on public.countries for select to anon, authenticated using (true);
create policy countries_admin on public.countries for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy cities_read on public.cities for select to anon, authenticated using (true);
create policy cities_admin on public.cities for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy districts_read on public.districts for select to anon, authenticated using (true);
create policy districts_admin on public.districts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy sectors_read on public.sectors for select to anon, authenticated using (true);
create policy sectors_admin on public.sectors for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy sources_read on public.sources for select to anon, authenticated using (true);
create policy sources_admin on public.sources for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy data_points_read on public.data_points for select to anon, authenticated using (true);
create policy data_points_admin on public.data_points for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy institutions_read on public.institutions for select to anon, authenticated using (true);
create policy institutions_admin on public.institutions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy procedures_read on public.procedures for select to anon, authenticated using (true);
create policy procedures_admin on public.procedures for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy tax_parameters_read on public.tax_parameters for select to anon, authenticated using (true);
create policy tax_parameters_admin on public.tax_parameters for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Projets : strictement privés à leur propriétaire.
create policy projects_select_own on public.projects
  for select to authenticated using (owner_id = auth.uid());
create policy projects_insert_own on public.projects
  for insert to authenticated with check (owner_id = auth.uid());
create policy projects_update_own on public.projects
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy projects_delete_own on public.projects
  for delete to authenticated using (owner_id = auth.uid());

-- Journal : lecture par les administrateurs uniquement ; écriture par déclencheur.
create policy change_log_admin_read on public.change_log
  for select to authenticated using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Données de départ : pays pilote et communes couvertes
-- -----------------------------------------------------------------------------
insert into public.countries (code, name, currency, locale, is_active)
values ('GA', 'Gabon', 'XAF', 'fr', true);

insert into public.cities (country_code, name, region, is_pilot) values
  ('GA', 'Libreville', 'Estuaire', true),
  ('GA', 'Akanda', 'Estuaire', true),
  ('GA', 'Owendo', 'Estuaire', true);
