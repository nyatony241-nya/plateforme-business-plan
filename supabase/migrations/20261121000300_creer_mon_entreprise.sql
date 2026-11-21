-- =============================================================================
-- Module « Créer mon entreprise » (Gabon) : guichet ANPI, démarches par forme
-- juridique, régimes fiscaux. Relevés en ligne le 21/11/2026 ; rien n'est inventé :
-- une information absente (ex. horaires) reste vide.
-- =============================================================================

-- Contenu détaillé d'une démarche : pièces, frais, délai, avantages, inconvénients.
alter table public.procedures
  add column details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  add column sort_order integer not null default 0;

create temporary table src (key text primary key, id uuid) on commit drop;

with s as (
  insert into public.sources (title, url, publisher, source_type, published_at, accessed_at, notes) values
    ('Guichet numérique de l''investissement (GNI) — accueil, formes juridiques et tarifs',
     'https://www.gni-anpigabon.com/', 'ANPI-Gabon', 'officielle', null, '2026-11-21',
     'Portail officiel de création d''entreprise ; tarifs présentés comme « charte approximative des tarifs des formalités ».'),
    ('GNI — guide de création (pièces à fournir, tarifs)',
     'https://www.gni-anpigabon.com/gni-guide/individual', 'ANPI-Gabon', 'officielle', null, '2026-11-21', null),
    ('GNI — nous contacter', 'https://www.gni-anpigabon.com/contact-us', 'ANPI-Gabon', 'officielle', null, '2026-11-21', null),
    ('Création d''entreprise : le Gabon enregistre un record de 74 % en 2024',
     'https://agpgabon.ga/creation-dentreprise-le-gabon-enregistre-un-record-de-74-en-2024/', 'Agence gabonaise de presse (AGP)', 'presse', null, '2026-11-21',
     'Annonce une entreprise individuelle à 50 000 FCFA, contre 85 000 FCFA auparavant.'),
    ('ANPI Gabon : le guide étape par étape pour formaliser votre entreprise en 48h',
     'https://fcagabon.com/anpi-gabon-le-guide-etape-par-etape-pour-formaliser-votre-entreprise-en-48h/', 'FCA Gabon', 'autre', null, '2026-11-21',
     'Délai de 48 à 72 heures ouvrables pour une forme simple et un dossier complet.'),
    ('Livret fiscal 2026 — Gabon', 'https://www.kreston.com/wp-content/uploads/2026/02/Exco-Afrique-FEAG-Livret-Fiscal-2026-Gabon-v-diaporama-FR-V3.pdf',
     'Exco Afrique / Kreston', 'autre', '2026-02-01', '2026-11-21', 'Synthèse du Code général des impôts et de la loi de finances 2026.')
  returning id, url
)
insert into src (key, id)
select case
  when url = 'https://www.gni-anpigabon.com/' then 'gni'
  when url like '%gni-guide%' then 'guide'
  when url like '%contact-us%' then 'contact'
  when url like '%agpgabon%' then 'agp'
  when url like '%fcagabon%' then 'fca'
  else 'fiscal'
end, id from s;

-- Guichet unique : ANPI-Gabon (contacts relevés sur le portail officiel).
insert into public.institutions
  (country_code, city_id, name, acronym, role, address, phone, website, opening_hours, source_id, verified_at, expires_at)
select 'GA', (select id from public.cities where name = 'Libreville' and country_code = 'GA' limit 1),
  'Agence nationale de promotion des investissements', 'ANPI-Gabon',
  'Guichet unique de création d''entreprise ; création en ligne sur le GNI',
  '104 rue Gustave Anguile, immeuble Serena, BP 3403, Libreville',
  '+241 66 11 25 60 ; +241 61 00 81 00 (appel et WhatsApp) ; gni@investingabon.ga',
  'https://www.gni-anpigabon.com', null, (select id from src where key = 'contact'), '2026-11-21', '2027-05-21';

-- Démarches par forme juridique.
insert into public.procedures
  (country_code, title, legal_form, summary, steps, details, source_id, verified_at, expires_at, sort_order)
values
  ('GA', 'Créer une entreprise individuelle', 'EI',
   'Une seule personne, pas de statuts ni de capital. Le patrimoine de l''entreprise et celui de l''entrepreneur ne font qu''un : la responsabilité est illimitée.',
   '[
     {"titre": "Vérifier le nom commercial", "detail": "Sur le portail GNI, vérifiez que le nom choisi est disponible."},
     {"titre": "Créer son compte GNI", "detail": "Inscription sur www.gni-anpigabon.com, depuis un téléphone ou un ordinateur."},
     {"titre": "Remplir le formulaire et joindre les pièces", "detail": "Formulaire en ligne et pièces numérisées (liste ci-dessous)."},
     {"titre": "Payer et soumettre la demande", "detail": "Paiement en ligne à la soumission du dossier."},
     {"titre": "Recevoir les documents de l''entreprise", "detail": "L''ANPI traite le dossier avec les administrations partenaires (greffe, impôts, CNSS…)."}
   ]'::jsonb,
   jsonb_build_object(
     'avantages', jsonb_build_array('Formalités rapides', 'Pas de statuts à rédiger', 'Pas de capital minimum', 'Frais de création plus bas', 'Gestion souple', 'Régime fiscal forfaitaire'),
     'inconvenients', jsonb_build_array('Responsabilité illimitée (patrimoine personnel engagé)', 'Crédibilité plus faible auprès des banques et fournisseurs', 'Accès au crédit plus difficile', 'Adaptée aux petites activités'),
     'pieces', jsonb_build_array(
       'Copie de la pièce d''identité (passeport, carte nationale d''identité ou récépissé)',
       'Copie de l''agrément technique pour les activités réglementées (santé, éducation…), le cas échéant',
       'Copie du contrat d''abonnement SEEG ou de la dernière quittance',
       'Certificat de résidence',
       'Copie de l''acte de mariage, selon le régime',
       'Attestation de propriété ou de location légalisée à la mairie'),
     'frais', jsonb_build_array(
       jsonb_build_object('libelle', 'Création', 'gabonais', 85000, 'non_gabonais', 135000, 'statut', 'estimation',
         'note', 'Tarifs du portail officiel, présentés comme une « charte approximative » ; l''AGP annonçait 50 000 FCFA pour les Gabonais en 2024. Le montant exact s''affiche au moment du paiement.',
         'source', 'guide'),
       jsonb_build_object('libelle', 'Modification', 'gabonais', 50000, 'non_gabonais', 50000, 'statut', 'estimation',
         'note', 'Plus 25 000 FCFA de nom commercial (OGAPI) si besoin.', 'source', 'guide')),
     'delai', jsonb_build_object('texte', '48 à 72 heures ouvrables si le dossier est complet', 'statut', 'estimation', 'source', 'fca')
   ),
   (select id from src where key = 'guide'), '2026-11-21', '2027-05-21', 1),

  ('GA', 'Créer une société (SARL, SARLU, SAS, SASU…)', 'SOCIETE',
   'Une personne morale distincte : la responsabilité est limitée aux apports. Statuts obligatoires, capital libre pour la SARL et la SAS (10 millions FCFA minimum pour une SA). La SARLU et la SASU n''ont qu''un associé.',
   '[
     {"titre": "Vérifier le nom commercial", "detail": "Sur le portail GNI, vérifiez que le nom choisi est disponible."},
     {"titre": "Rédiger les statuts", "detail": "Acte sous seing privé possible (sans notaire) ; l''aide d''un professionnel du droit est conseillée."},
     {"titre": "Créer son compte GNI et remplir le formulaire", "detail": "Formulaire en ligne et pièces numérisées."},
     {"titre": "Payer et soumettre la demande", "detail": "Paiement en ligne à la soumission du dossier."},
     {"titre": "Recevoir les documents de la société", "detail": "L''ANPI traite le dossier avec les administrations partenaires (greffe, impôts, CNSS…)."}
   ]'::jsonb,
   jsonb_build_object(
     'avantages', jsonb_build_array('Crédibilité auprès des banques et partenaires', 'Pas de capital minimum (SARL, SAS)', 'Responsabilité limitée aux apports', 'Statuts sans notaire possibles'),
     'inconvenients', jsonb_build_array('Fonctionnement plus lourd (décisions des associés)', 'Parts moins faciles à céder', 'Formalités plus longues', 'Statuts à rédiger avec soin'),
     'pieces', jsonb_build_array(
       'Copie de la pièce d''identité (passeport, carte nationale d''identité ou récépissé)',
       'Copie de l''agrément technique pour les activités réglementées (santé, éducation…), le cas échéant',
       'Statuts et pièces demandées par le formulaire en ligne'),
     'frais', jsonb_build_array(
       jsonb_build_object('libelle', 'Création', 'gabonais', 220000, 'non_gabonais', 370000, 'statut', 'estimation',
         'note', 'Tarifs du portail officiel, présentés comme une « charte approximative ». Le montant exact s''affiche au moment du paiement.',
         'source', 'guide'),
       jsonb_build_object('libelle', 'Modification', 'gabonais', 70000, 'non_gabonais', 70000, 'statut', 'estimation', 'note', null, 'source', 'guide')),
     'delai', jsonb_build_object('texte', 'Quelques jours ouvrables si le dossier est complet', 'statut', 'estimation', 'source', 'fca')
   ),
   (select id from src where key = 'guide'), '2026-11-21', '2027-05-21', 2);

-- Régimes fiscaux et taxes utiles après la création (synthèse d'un cabinet : estimation).
insert into public.tax_parameters
  (country_code, code, label, value, unit, valid_from, source_id, verified_at, status, note)
select 'GA', p.code, p.label, p.value, p.unit, '2026-01-01', (select id from src where key = 'fiscal'), '2026-11-21', 'estimation', p.note
from (values
  ('isl_seuil_ca', 'Impôt synthétique libératoire : chiffre d''affaires annuel inférieur à', 30000000::numeric, 'xaf', 'Art. 13-h LF 2014. Barème non publié dans la source.'),
  ('regime_reel_seuil_ca', 'Régime réel : chiffre d''affaires annuel supérieur à', 60000000, 'xaf', 'Art. 138 CGI ; régime simplifié entre 30 et 60 millions (art. 137).'),
  ('tva_taux', 'TVA, taux normal', 0.18, 'pourcentage', 'Art. 221 CGI.'),
  ('tva_seuil_ca', 'TVA due au-delà d''un chiffre d''affaires annuel de', 60000000, 'xaf', 'Seuil général (500 millions pour l''exploitation forestière).'),
  ('patente_taux', 'Patente (contribution des patentes)', 0.001, 'pourcentage', 'Art. 265 CGI : 0,1 % du chiffre d''affaires, minimum 150 000 FCFA, maximum 10 millions FCFA.'),
  ('patente_minimum', 'Patente, minimum annuel', 150000, 'xaf', 'Art. 265 CGI.')
) as p(code, label, value, unit, note);
