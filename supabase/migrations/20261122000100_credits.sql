-- Crédits : 1 crédit = 1 business plan débloqué pour toujours.
-- Le solde est la somme des mouvements ; seules des fonctions contrôlées écrivent.

create table public.credit_packs (
  code text primary key,
  name text not null,
  credits int not null check (credits > 0),
  price_xaf int not null check (price_xaf > 0),
  chariow_product_id text,
  active boolean not null default true,
  sort_order int not null default 0
);
alter table public.credit_packs enable row level security;
create policy "packs visibles" on public.credit_packs for select to anon, authenticated using (active);

insert into public.credit_packs (code, name, credits, price_xaf, sort_order) values
  ('starter', 'Starter', 1, 5000, 1),
  ('pro', 'Pro', 3, 12000, 2),
  ('business', 'Business', 10, 35000, 3);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pack_code text not null references public.credit_packs (code),
  credits int not null check (credits > 0),
  amount_xaf int not null check (amount_xaf > 0),
  provider text not null check (provider in ('chariow', 'saspay')),
  provider_ref text unique,
  status text not null default 'en_attente' check (status in ('en_attente', 'paye', 'echoue', 'annule')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.payments enable row level security;
create policy "mes paiements" on public.payments for select to authenticated using (user_id = (select auth.uid()));
create index payments_user_idx on public.payments (user_id, created_at desc);

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  delta int not null check (delta <> 0),
  reason text not null check (reason in ('achat', 'deblocage', 'offert', 'remboursement')),
  project_id uuid references public.projects (id) on delete set null,
  payment_id uuid unique references public.payments (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
alter table public.credit_ledger enable row level security;
create policy "mes crédits" on public.credit_ledger for select to authenticated using (user_id = (select auth.uid()));
create index credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);

create table public.plan_unlocks (
  project_id uuid primary key references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  unlocked_at timestamptz not null default now()
);
alter table public.plan_unlocks enable row level security;
create policy "mes déblocages" on public.plan_unlocks for select to authenticated using (user_id = (select auth.uid()));

-- Solde de l'utilisateur connecté.
create function public.credit_balance()
returns int
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(delta), 0)::int from public.credit_ledger where user_id = (select auth.uid());
$$;

-- Débloque un plan contre 1 crédit, en une seule opération. Renvoie false si le solde est insuffisant.
create function public.unlock_plan(p_project uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_balance int;
begin
  if v_user is null then
    raise exception 'Connexion requise';
  end if;
  if not exists (select 1 from public.projects where id = p_project and owner_id = v_user) then
    raise exception 'Projet introuvable';
  end if;
  if exists (select 1 from public.plan_unlocks where project_id = p_project) then
    return true;
  end if;
  -- Un seul déblocage à la fois par utilisateur : pas de double dépense.
  perform pg_advisory_xact_lock(hashtext(v_user::text));
  if exists (select 1 from public.plan_unlocks where project_id = p_project) then
    return true;
  end if;
  select coalesce(sum(delta), 0) into v_balance from public.credit_ledger where user_id = v_user;
  if v_balance < 1 then
    return false;
  end if;
  insert into public.credit_ledger (user_id, delta, reason, project_id) values (v_user, -1, 'deblocage', p_project);
  insert into public.plan_unlocks (project_id, user_id) values (p_project, v_user);
  return true;
end;
$$;
revoke all on function public.unlock_plan(uuid) from public, anon;
grant execute on function public.unlock_plan(uuid) to authenticated;

-- Ouvre un paiement en attente pour un pack (prix et crédits copiés du pack, jamais du client).
create function public.start_payment(p_pack text, p_provider text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_pack public.credit_packs;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Connexion requise';
  end if;
  select * into v_pack from public.credit_packs where code = p_pack and active;
  if not found then
    raise exception 'Formule inconnue';
  end if;
  insert into public.payments (user_id, pack_code, credits, amount_xaf, provider)
  values (v_user, v_pack.code, v_pack.credits, v_pack.price_xaf, p_provider)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.start_payment(text, text) from public, anon;
grant execute on function public.start_payment(text, text) to authenticated;

-- Le serveur note la référence de la vente chez le prestataire, juste après l'ouverture du paiement.
create function public.attach_payment_ref(p_payment uuid, p_ref text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.payments set provider_ref = p_ref
  where id = p_payment and user_id = (select auth.uid()) and status = 'en_attente' and provider_ref is null;
$$;
revoke all on function public.attach_payment_ref(uuid, text) from public, anon;
grant execute on function public.attach_payment_ref(uuid, text) to authenticated;

-- Crédite un paiement confirmé par le prestataire. Une seule fois. Réservé au serveur (clé secrète).
create function public.credit_payment(p_payment uuid, p_ref text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pay public.payments;
begin
  select * into v_pay from public.payments where id = p_payment for update;
  if not found then
    return false;
  end if;
  if v_pay.status = 'paye' then
    return true;
  end if;
  if v_pay.provider_ref is not null and v_pay.provider_ref <> p_ref then
    return false;
  end if;
  update public.payments set status = 'paye', paid_at = now(), provider_ref = p_ref where id = p_payment;
  insert into public.credit_ledger (user_id, delta, reason, payment_id)
  values (v_pay.user_id, v_pay.credits, 'achat', v_pay.id);
  return true;
end;
$$;
revoke all on function public.credit_payment(uuid, text) from public, anon, authenticated;
grant execute on function public.credit_payment(uuid, text) to service_role;
