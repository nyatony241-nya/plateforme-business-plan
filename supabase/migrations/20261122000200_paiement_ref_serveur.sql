-- La référence de vente est notée par le serveur seul (clé secrète), jamais par le navigateur.
create or replace function public.attach_payment_ref(p_payment uuid, p_ref text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.payments set provider_ref = p_ref
  where id = p_payment and status = 'en_attente' and provider_ref is null;
$$;
revoke all on function public.attach_payment_ref(uuid, text) from public, anon, authenticated;
grant execute on function public.attach_payment_ref(uuid, text) to service_role;
