-- =============================================================================
-- Phase 1 — Paramètres fiscaux et sociaux du Gabon, hypothèses des projets
-- =============================================================================

-- Les paramètres fiscaux portent aussi un statut, une note et un plafond éventuel.
alter table public.tax_parameters
  add column status public.statut_donnee not null default 'verifie',
  add column note text,
  add column monthly_ceiling numeric,
  add constraint tax_parameters_pas_d_hypothese check (status <> 'hypothese'),
  add constraint tax_parameters_note_estimation check (status <> 'estimation' or note is not null);

-- -----------------------------------------------------------------------------
-- Sources consultées le 21/11/2026
-- -----------------------------------------------------------------------------
with s as (
  insert into public.sources (title, url, publisher, source_type, published_at, accessed_at, notes) values
    ('Loi n°026/2016 du 6 janvier 2017 déterminant les ressources et les charges de l''État pour l''année 2017 (articles 16 et 24 du CGI)',
     'https://faolex.fao.org/docs/pdf/gab207546.pdf', 'République gabonaise, Journal officiel n°331 bis spécial', 'officielle', '2017-01-09', '2026-11-21',
     'Texte officiel. Taux confirmés en vigueur en 2026 par PwC (synthèse revue le 06/08/2026).'),
    ('Gabon — Corporate — Taxes on corporate income',
     'https://taxsummaries.pwc.com/Gabon/Corporate/Taxes-on-corporate-income', 'PwC Worldwide Tax Summaries', 'autre', '2026-08-06', '2026-11-21',
     'Synthèse professionnelle, revue le 06/08/2026.'),
    ('Gabon — Corporate — Deductions',
     'https://taxsummaries.pwc.com/gabon/corporate/deductions', 'PwC Worldwide Tax Summaries', 'autre', '2026-08-06', '2026-11-21',
     'Synthèse professionnelle, revue le 06/08/2026.'),
    ('Les cotisations au Gabon — taux au 1er janvier 2026',
     'https://www.cleiss.fr/docs/cotisations/gabon.html', 'CLEISS (organisme public français)', 'autre', null, '2026-11-21',
     'Taux issus de la réforme CNSS de décembre 2025 (décret n°0487/PR/MASI du 18/12/2025, cité par la presse gabonaise).')
  returning id, url
)
insert into public.tax_parameters
  (country_code, code, label, value, unit, monthly_ceiling, valid_from, source_id, verified_at, status, note)
select 'GA', p.code, p.label, p.value, p.unit, p.ceiling, p.valid_from::date, s.id, '2026-11-21', p.status::public.statut_donnee, p.note
from (values
  ('https://faolex.fao.org/docs/pdf/gab207546.pdf', 'is_taux', 'Impôt sur les sociétés (taux de droit commun)', 0.30, 'pourcentage', null::numeric, '2017-01-01', 'verifie', null),
  ('https://faolex.fao.org/docs/pdf/gab207546.pdf', 'imf_taux', 'Impôt minimum forfaitaire (en % du chiffre d''affaires)', 0.01, 'pourcentage', null, '2017-01-01', 'verifie', null),
  ('https://taxsummaries.pwc.com/Gabon/Corporate/Taxes-on-corporate-income', 'minimum_perception', 'Minimum de perception', 500000, 'xaf', null, '2026-01-01', 'estimation',
     'PwC (2026) indique 500 000 XAF ; le texte officiel de 2017 indiquait 1 000 000 FCFA. À confirmer auprès de la DGI.'),
  ('https://taxsummaries.pwc.com/Gabon/Corporate/Taxes-on-corporate-income', 'minimum_dispense_annees', 'Exercices dispensés du minimum d''impôt (entreprise nouvelle)', 0, 'annees', null, '2026-01-01', 'estimation',
     'PwC signale une dispense pour les entreprises nouvelles et les PME, sans durée certaine. Valeur prudente : aucune dispense. À confirmer auprès de la DGI.'),
  ('https://taxsummaries.pwc.com/gabon/corporate/deductions', 'deficit_report_annees', 'Report des déficits', 5, 'annees', null, '2026-01-01', 'estimation',
     'Synthèse PwC : report sur les cinq exercices suivants. À confirmer sur le CGI.'),
  ('https://www.cleiss.fr/docs/cotisations/gabon.html', 'cotisation_prestations_familiales', 'CNSS — prestations familiales (part patronale)', 0.05, 'pourcentage', 1500000, '2026-01-01', 'estimation',
     'Relevé CLEISS ; à confirmer sur le décret CNSS.'),
  ('https://www.cleiss.fr/docs/cotisations/gabon.html', 'cotisation_accidents_travail', 'CNSS — accidents du travail (part patronale)', 0.02, 'pourcentage', 1500000, '2026-01-01', 'estimation',
     'Relevé CLEISS ; le taux peut varier selon le risque de l''activité.'),
  ('https://www.cleiss.fr/docs/cotisations/gabon.html', 'cotisation_pensions', 'CNSS — pensions vieillesse, invalidité, décès (part patronale)', 0.11, 'pourcentage', 1500000, '2026-01-01', 'estimation',
     'Relevé CLEISS ; à confirmer sur le décret CNSS.'),
  ('https://www.cleiss.fr/docs/cotisations/gabon.html', 'cotisation_assurance_maladie', 'CNAMGS — assurance maladie (part patronale)', 0.041, 'pourcentage', 2500000, '2026-01-01', 'estimation',
     'Relevé CLEISS ; taux confirmé par la presse gabonaise (campagne CNAMGS 2026).')
) as p(url, code, label, value, unit, ceiling, valid_from, status, note)
join s on s.url = p.url;

-- -----------------------------------------------------------------------------
-- Hypothèses financières d'un projet (saisies par l'entrepreneur)
-- -----------------------------------------------------------------------------
create table public.project_assumptions (
  project_id uuid primary key references public.projects (id) on delete cascade,
  schema_version integer not null default 1,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  constraint project_assumptions_objet check (jsonb_typeof(data) = 'object')
);

create trigger project_assumptions_touch_updated_at
  before update on public.project_assumptions
  for each row execute function public.touch_updated_at();

alter table public.project_assumptions enable row level security;

create policy project_assumptions_own on public.project_assumptions
  for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
