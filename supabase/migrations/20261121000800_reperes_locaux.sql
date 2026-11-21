-- Premiers repères locaux du Grand Libreville, relevés le 21/11/2026.
-- Tous en « estimation » : ils viennent d'annonces et de la presse, pas d'une enquête.
-- Valable six mois, puis à relever de nouveau.

with src as (
  insert into public.sources (title, url, publisher, source_type, published_at, accessed_at, notes)
  values
    ('Locaux commerciaux à louer au Gabon', 'https://gabonhome.com/bien.php?bien=8',
     'gabonhome.com', 'annonce', null, '2026-11-21',
     'Annonces de locaux commerciaux publiées de juillet à novembre 2026.'),
    ('Local commercial à louer à Akanda, Angondjé (275 000 FCFA)',
     'https://www.gabonhome.com/detail-offre-immo-gabon.php?detail=55301',
     'gabonhome.com', 'annonce', null, '2026-11-21', 'Annonce, local en bordure de route principale.'),
    ('Offres d''emploi à Libreville et Akanda (exemple : serveuses, Louis, 200 000 FCFA)',
     'https://simoon-cv.com/emplois/offre/serveuses-2-postes-restaurant-gastronomique-asiatique-louis-libreville-200-000-f-1ed8e96c-d71d-4025-b59b-6940e9ed54e8',
     'simoon-cv.com', 'annonce', null, '2026-11-21',
     'Offres publiées en octobre et novembre 2026 avec un salaire affiché.'),
    ('Tarifs de l''électricité : le Gabon parmi les plus chers',
     'https://gabonmediatime.com/energie-le-gabon-6eme-pays-africain-avec-des-tarifs-delectricite-les-plus-eleves/',
     'Gabon Media Time', 'presse', null, '2026-11-21',
     'Coût moyen de 125 FCFA le kWh (classement Sika Finance 2025).'),
    ('CanalBox : la fibre optique gratuite grâce à la campagne « Booster Août 2026 »',
     'https://gabonmediatime.com/canalbox-la-fibre-optique-gratuite-grace-a-la-campagne-booster-aout-2026/',
     'Gabon Media Time', 'presse', null, '2026-11-21', 'Forfait fibre illimité à 25 000 FCFA par mois.')
  returning id, url
),
city as (select id, name from public.cities where country_code = 'GA')
insert into public.data_points
  (indicator, value, value_min, value_max, unit, currency, country_code, city_id, status, method,
   source_id, verified_at, expires_at)
values
  ('loyer_local_commercial_mois', 300000, 200000, 500000, 'FCFA par mois', 'XAF', 'GA',
   (select id from city where name = 'Libreville'), 'estimation',
   'Relevé de 9 annonces de locaux commerciaux publiées de juillet à novembre 2026 (Centre-ville, Louis, Akébé, Alibandeng, Bas de Gué-Gué, Charbonnages, Camp de Gaulle). Valeur médiane ; les grands locaux du centre-ville dépassent 1 million.',
   (select id from src where url = 'https://gabonhome.com/bien.php?bien=8'), '2026-11-21', '2027-05-21'),
  ('loyer_local_commercial_mois', 200000, 100000, 450000, 'FCFA par mois', 'XAF', 'GA',
   (select id from city where name = 'Akanda'), 'estimation',
   'Relevé de 5 annonces de locaux commerciaux à Angondjé et Malibe (gabonhome.com, marketimmos.com), 2026. Valeur médiane.',
   (select id from src where url like '%detail=55301'), '2026-11-21', '2027-05-21'),
  ('salaire_poste_peu_qualifie_mois', 100000, 70000, 300000, 'FCFA par mois', 'XAF', 'GA',
   (select id from city where name = 'Libreville'), 'estimation',
   'Salaires affichés dans 8 offres (serveuse, coiffeuse, ménage, secrétaire, gérante de bar, livreur, chauffeur), octobre-novembre 2026. Plusieurs sont sous le minimum légal : le plan retient toujours au moins le minimum légal.',
   (select id from src where url like 'https://simoon-cv.com/%'), '2026-11-21', '2027-05-21'),
  ('electricite_prix_kwh', 125, 100, 145, 'FCFA par kWh', 'XAF', 'GA', null, 'estimation',
   'Coût moyen de 125 FCFA le kWh selon la presse (2025) ; 100 FCFA pour les entreprises selon GlobalPetrolPrices ; jusqu''à 145 FCFA selon une comparaison régionale.',
   (select id from src where url like '%6eme-pays-africain%'), '2026-11-21', '2027-05-21'),
  ('internet_box_mois', 25000, 25000, 45000, 'FCFA par mois', 'XAF', 'GA', null, 'estimation',
   'Abonnements internet fixe ou box 4G grand public de 25 000 à 45 000 FCFA par mois selon le débit (presse, 2025-2026).',
   (select id from src where url like '%canalbox%'), '2026-11-21', '2027-05-21');
