-- 4 formules (demande de Tony, 25/11/2026) : 1, 3, 5 ou 10 business plans.
-- Plus on achète de plans, moins chaque plan coûte ; marge ≥ 90 % dans tous les cas.
update public.credit_packs set name = '1 business plan', credits = 1, price_xaf = 4900, active = true, sort_order = 1
where code = 'starter';
update public.credit_packs set name = '3 business plans', credits = 3, price_xaf = 12900, active = true, sort_order = 2
where code = 'pro';
insert into public.credit_packs (code, name, credits, price_xaf, active, sort_order)
values ('pack5', '5 business plans', 5, 19900, true, 3)
on conflict (code) do update set name = excluded.name, credits = excluded.credits, price_xaf = excluded.price_xaf,
  active = true, sort_order = excluded.sort_order;
update public.credit_packs set name = '10 business plans', credits = 10, price_xaf = 34900, active = true, sort_order = 4
where code = 'business';
