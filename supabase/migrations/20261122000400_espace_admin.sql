-- Espace admin : chiffres globaux, coût de l'IA par plan, crédits offerts, prix des formules.
-- Les projets restent privés : l'admin voit des totaux et des coûts, jamais le contenu d'un plan.

create policy "admin modifie les formules" on public.credit_packs
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin lit les formules" on public.credit_packs
  for select to authenticated using (public.is_admin());
create policy "admin lit les paiements" on public.payments
  for select to authenticated using (public.is_admin());

-- Vue d'ensemble depuis une date.
create function public.admin_overview(p_since timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès réservé';
  end if;
  return jsonb_build_object(
    'comptes', (select count(*) from auth.users where created_at >= p_since),
    'comptes_total', (select count(*) from auth.users),
    'projets', (select count(*) from public.projects where created_at >= p_since),
    'apercus', (select count(distinct project_id) from public.ai_runs
                where purpose = 'redaction_business_plan' and status = 'succes' and created_at >= p_since),
    'debloques', (select count(*) from public.plan_unlocks where unlocked_at >= p_since),
    'cout_ia_usd', (select coalesce(sum(cost_usd), 0) from public.ai_runs where created_at >= p_since),
    'appels_ia', (select count(*) from public.ai_runs where created_at >= p_since),
    'echecs_ia', (select count(*) from public.ai_runs where status = 'echec' and created_at >= p_since),
    'ventes_xaf', (select coalesce(sum(amount_xaf), 0) from public.payments where status = 'paye' and paid_at >= p_since),
    'paiements', (select count(*) from public.payments where status = 'paye' and paid_at >= p_since),
    'credits_vendus', (select coalesce(sum(delta), 0) from public.credit_ledger where reason = 'achat' and created_at >= p_since),
    'credits_offerts', (select coalesce(sum(delta), 0) from public.credit_ledger where reason = 'offert' and created_at >= p_since)
  );
end;
$$;
revoke all on function public.admin_overview(timestamptz) from public, anon;
grant execute on function public.admin_overview(timestamptz) to authenticated;

-- Coût de l'IA par plan : avant paiement (perdu si le client n'achète pas) et après.
create function public.admin_plan_costs(p_since timestamptz)
returns table (
  plan text,
  secteur text,
  cree_le timestamptz,
  debloque boolean,
  avant_paiement_usd numeric,
  apres_paiement_usd numeric,
  appels int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès réservé';
  end if;
  return query
  select
    upper(left(p.id::text, 6)),
    p.sector,
    p.created_at,
    exists (select 1 from public.plan_unlocks u where u.project_id = p.id),
    coalesce(sum(r.cost_usd) filter (where r.purpose <> 'redaction_suite'), 0)::numeric,
    coalesce(sum(r.cost_usd) filter (where r.purpose = 'redaction_suite'), 0)::numeric,
    count(r.id)::int
  from public.projects p
  join public.ai_runs r on r.project_id = p.id
  where p.created_at >= p_since
  group by p.id
  order by p.created_at desc
  limit 100;
end;
$$;
revoke all on function public.admin_plan_costs(timestamptz) from public, anon;
grant execute on function public.admin_plan_costs(timestamptz) to authenticated;

-- Offrir des crédits à un compte (testeurs de la bêta, geste commercial).
create function public.admin_grant_credits(p_email text, p_amount int, p_note text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_balance int;
begin
  if not public.is_admin() then
    raise exception 'Accès réservé';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 100 then
    raise exception 'Entre 1 et 100 crédits';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'Aucun compte avec cette adresse';
  end if;
  insert into public.credit_ledger (user_id, delta, reason, note)
  values (v_user, p_amount, 'offert', left(coalesce(nullif(trim(p_note), ''), 'Crédits offerts'), 200));
  select coalesce(sum(delta), 0) into v_balance from public.credit_ledger where user_id = v_user;
  return v_balance;
end;
$$;
revoke all on function public.admin_grant_credits(text, int, text) from public, anon;
grant execute on function public.admin_grant_credits(text, int, text) to authenticated;

-- Le propriétaire de la plateforme.
update public.profiles set role = 'admin' where id = '771b2b48-7b81-47e0-aca5-01af88ab83b9';
