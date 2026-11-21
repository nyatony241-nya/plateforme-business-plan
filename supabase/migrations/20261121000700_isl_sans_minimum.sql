-- Petites entreprises (ISL) : ni impôt minimum forfaitaire ni minimum de perception
-- (loi de finances 2025, art. 24). Le barème du droit fixe ISL n'étant pas publié,
-- le moteur retient 30 % du bénéfice, une hypothèse prudente.
insert into public.sources (title, url, publisher, source_type, published_at, accessed_at, notes)
values ('Loi de finances 2025 (texte officiel), article 24 du CGI',
        'https://directinfosgabon.com/wp-content/uploads/2025/03/Loi-de-Finances-2025-OFFICIEL.pdf',
        'République gabonaise', 'officielle', '2025-01-01', '2026-11-21',
        '« Les contribuables soumis à l''impôt synthétique libératoire sont exonérés de l''impôt minimum forfaitaire et du minimum de perception. »');

update public.tax_parameters
set note = 'Sous ce seuil : régime de l''impôt synthétique libératoire, sans minimum d''impôt (LF 2025, art. 24). Barème du droit fixe non publié : le plan retient 30 % du bénéfice, par prudence. Confirmé le 21/11/2026.'
where country_code = 'GA' and code = 'isl_seuil_ca';
