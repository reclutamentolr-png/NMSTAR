-- Iscrizione senza codice invito: si può fare solo se l'account KUMANI
-- (house account) è configurato. Il modulo di registrazione lo controlla
-- PRIMA di creare l'accesso, così non restano utenti senza profilo.
create or replace function public.direct_signup_available()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id::text = public.setting_text('house_account_id')
  );
$$;
revoke all on function public.direct_signup_available() from public;
grant execute on function public.direct_signup_available() to anon, authenticated;
