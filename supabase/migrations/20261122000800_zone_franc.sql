-- Ouverture à la zone franc : 10 marchés prioritaires + les 4 autres pays de la zone (22/11/2026).
-- Statuts : « estimation » = source professionnelle (PwC, presse) ; « hypothese » = à vérifier.

alter table public.countries
  add column if not exists zone text,
  add column if not exists priority smallint,
  add column if not exists creation_agency text,
  add column if not exists creation_agency_url text,
  add column if not exists data_level text check (data_level in ('verifie', 'sourcee', 'hypothese'));

update public.countries
set zone = 'CEMAC', priority = 1, creation_agency = 'l''ANPI-Gabon', creation_agency_url = 'https://gni-anpigabon.com', data_level = 'verifie'
where code = 'GA';

insert into public.countries (code, name, currency, locale, is_active, zone, priority, creation_agency, creation_agency_url, data_level) values
  ('CI', 'Côte d''Ivoire', 'XOF', 'fr', true, 'UEMOA', 2, 'le CEPICI (guichet unique)', 'https://www.cepici.gouv.ci', 'sourcee'),
  ('CM', 'Cameroun', 'XAF', 'fr', true, 'CEMAC', 3, 'le CFCE (centre de formalités de création d''entreprises)', null, 'sourcee'),
  ('SN', 'Sénégal', 'XOF', 'fr', true, 'UEMOA', 4, 'l''APIX (guichet de création d''entreprise)', 'https://www.investinsenegal.com', 'sourcee'),
  ('BJ', 'Bénin', 'XOF', 'fr', true, 'UEMOA', 5, 'l''APIEx (guichet unique)', null, 'hypothese'),
  ('TG', 'Togo', 'XOF', 'fr', true, 'UEMOA', 6, 'le CFE (centre de formalités des entreprises)', null, 'sourcee'),
  ('CG', 'Congo', 'XAF', 'fr', true, 'CEMAC', 7, 'l''ACPCE (agence pour la création des entreprises)', null, 'sourcee'),
  ('BF', 'Burkina Faso', 'XOF', 'fr', true, 'UEMOA', 8, 'la Maison de l''entreprise (CEFORE)', null, 'hypothese'),
  ('ML', 'Mali', 'XOF', 'fr', true, 'UEMOA', 9, 'l''API-Mali (guichet unique)', null, 'hypothese'),
  ('TD', 'Tchad', 'XAF', 'fr', true, 'CEMAC', 10, 'le guichet unique de création d''entreprise', null, 'hypothese'),
  ('NE', 'Niger', 'XOF', 'fr', true, 'UEMOA', 20, 'la Maison de l''entreprise', null, 'hypothese'),
  ('CF', 'Centrafrique', 'XAF', 'fr', true, 'CEMAC', 21, 'le guichet unique de formalités des entreprises', null, 'hypothese'),
  ('GQ', 'Guinée équatoriale', 'XAF', 'fr', true, 'CEMAC', 22, 'le guichet unique de création d''entreprise', null, 'hypothese'),
  ('GW', 'Guinée-Bissau', 'XOF', 'fr', true, 'UEMOA', 23, 'le centre de formalités des entreprises', null, 'hypothese')
on conflict (code) do nothing;

-- Villes proposées (les plus grandes de chaque pays).
insert into public.cities (country_code, name, region, is_pilot)
select v.cc, v.name, null, true
from (values
  ('GA','Port-Gentil'),('GA','Franceville'),('GA','Oyem'),('GA','Moanda'),('GA','Lambaréné'),('GA','Mouila'),('GA','Tchibanga'),('GA','Koulamoutou'),('GA','Makokou'),
  ('CI','Abidjan'),('CI','Bouaké'),('CI','Yamoussoukro'),('CI','San-Pédro'),('CI','Daloa'),('CI','Korhogo'),('CI','Man'),('CI','Grand-Bassam'),
  ('CM','Douala'),('CM','Yaoundé'),('CM','Bafoussam'),('CM','Garoua'),('CM','Bamenda'),('CM','Maroua'),('CM','Kribi'),('CM','Limbé'),
  ('SN','Dakar'),('SN','Thiès'),('SN','Touba'),('SN','Saint-Louis'),('SN','Kaolack'),('SN','Ziguinchor'),('SN','Mbour'),
  ('BJ','Cotonou'),('BJ','Porto-Novo'),('BJ','Abomey-Calavi'),('BJ','Parakou'),('BJ','Bohicon'),
  ('TG','Lomé'),('TG','Kara'),('TG','Sokodé'),('TG','Kpalimé'),('TG','Atakpamé'),
  ('CG','Brazzaville'),('CG','Pointe-Noire'),('CG','Dolisie'),('CG','Nkayi'),('CG','Oyo'),
  ('BF','Ouagadougou'),('BF','Bobo-Dioulasso'),('BF','Koudougou'),
  ('ML','Bamako'),('ML','Sikasso'),('ML','Ségou'),('ML','Kayes'),('ML','Mopti'),
  ('TD','N''Djaména'),('TD','Moundou'),('TD','Abéché'),
  ('NE','Niamey'),('NE','Zinder'),('NE','Maradi'),
  ('CF','Bangui'),
  ('GQ','Malabo'),('GQ','Bata'),
  ('GW','Bissau')
) as v(cc, name)
where not exists (select 1 from public.cities c where c.country_code = v.cc and c.name = v.name);

-- Sources
insert into public.sources (title, url, publisher, source_type, accessed_at) values
  ('PwC Worldwide Tax Summaries — Côte d''Ivoire', 'https://taxsummaries.pwc.com/ivory-coast', 'PwC', 'autre', '2026-11-22'),
  ('PwC Worldwide Tax Summaries — Cameroun', 'https://taxsummaries.pwc.com/republic-of-cameroon', 'PwC', 'autre', '2026-11-22'),
  ('PwC Worldwide Tax Summaries — Sénégal', 'https://taxsummaries.pwc.com/senegal', 'PwC', 'autre', '2026-11-22'),
  ('PwC Worldwide Tax Summaries — Congo', 'https://taxsummaries.pwc.com/republic-of-congo', 'PwC', 'autre', '2026-11-22'),
  ('PwC Ghana — Togo Tax Facts and Figures 2026', 'https://www.pwc.com/gh/en/assets/pdf/2026-togo-tax-facts-and-figures.pdf', 'PwC', 'autre', '2026-11-22'),
  ('PwC Worldwide Tax Summaries — taux d''IS et de TVA (Quick Charts)', 'https://taxsummaries.pwc.com/quick-charts/corporate-income-tax-cit-rates', 'PwC', 'autre', '2026-11-22'),
  ('Salaires minimums en Afrique de l''Ouest et du Centre (presse, 2026)', 'https://guidedufonctionnaire.com/salaire-minimum-en-cote-divoire/', 'Guide du fonctionnaire', 'presse', '2026-11-22'),
  ('SMIG dans l''UEMOA en 2026 (presse)', 'https://lesafriques.com/en/2026/06/average-salary-in-mali-in-2026-sectors-bamako-and-tips/', 'Les Afriques', 'presse', '2026-11-22'),
  ('Valeur prudente AfriBiz, à vérifier', null, 'AfriBiz', 'autre', '2026-11-22');


