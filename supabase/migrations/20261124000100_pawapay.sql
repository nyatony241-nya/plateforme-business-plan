-- Paiement mobile money par pawaPay (choisi par Tony le 24/11/2026).
alter table public.payments drop constraint payments_provider_check;
alter table public.payments add constraint payments_provider_check check (provider in ('pawapay', 'chariow', 'saspay'));

-- Un paiement déclaré échoué ou annulé n'est jamais crédité.
create or replace function public.credit_payment(p_payment uuid, p_ref text)
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
  if v_pay.status <> 'en_attente' then
    return false;
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
