-- Piani Base / Pro.
--
-- - Ogni utente ha un piano: nessuno, Base (49 €/anno) o Pro (149 €/anno,
--   include tutto il Base). La prova Pro (pro_trial_ends_at) dà il Pro
--   finché non scade.
-- - Ogni strumento ha il piano richiesto (marketplace_settings.required_plan:
--   free/base/pro), deciso dall'admin in Admin → Marketplace: vale anche per
--   gli strumenti futuri senza toccare il codice (prima l'elenco degli
--   strumenti a pagamento era scritto nel codice, in due punti).
-- - can_use_tool() è l'unico controllo d'accesso: lo usano middleware,
--   pagine e server action.

alter table public.profiles
  add column if not exists subscription_plan text check (subscription_plan in ('base', 'pro')),
  add column if not exists pro_trial_ends_at timestamptz;

-- Chi ha già un abbonamento attivo è sul piano Base.
update public.profiles set subscription_plan = 'base'
where subscription_plan is null and subscription_status = 'active';

-- Non sono dati personali: leggibili come le altre colonne dell'abbonamento.
grant select (subscription_plan, pro_trial_ends_at) on public.profiles to authenticated;

alter table public.marketplace_settings
  add column if not exists required_plan text not null default 'base'
    check (required_plan in ('free', 'base', 'pro'));

-- Tutti gli strumenti con il piano di partenza (quelli già presenti
-- mantengono acceso/spento).
insert into public.marketplace_settings (tool_name, is_enabled, required_plan) values
  ('fidelity', true, 'pro'),
  ('preventivi', true, 'pro'),
  ('digital-receipt', true, 'pro'),
  ('offermaker', true, 'pro'),
  ('qr-code-pro', true, 'pro'),
  ('link-in-bio', true, 'base'),
  ('memolife', true, 'base'),
  ('neurobalance', true, 'base'),
  ('svat', true, 'base'),
  ('life-calendar', true, 'base'),
  ('findo', true, 'base'),
  ('aureya', true, 'base'),
  ('kumani-cv', true, 'base'),
  ('spendly', true, 'base'),
  ('qr-generator', true, 'free'),
  ('whatsapp-messages', true, 'free'),
  ('mandala', true, 'free')
on conflict (tool_name) do update set required_plan = excluded.required_plan;

-- Piano effettivo di un utente: 'pro' | 'base' | 'none'.
create or replace function public.plan_of(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p.pro_trial_ends_at is not null and p.pro_trial_ends_at > now() then 'pro'
    when p.subscription_status = 'active'
      and (p.subscription_expires_at is null or p.subscription_expires_at > now())
      then coalesce(p.subscription_plan, 'base')
    else 'none'
  end
  from public.profiles p
  where p.id = p_user_id;
$$;
revoke all on function public.plan_of(uuid) from public, anon, authenticated;

-- Il mio piano (per pagine e schede del Marketplace).
create or replace function public.my_plan()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.plan_of(auth.uid()), 'none');
$$;
revoke all on function public.my_plan() from public, anon;
grant execute on function public.my_plan() to authenticated;

-- Accesso di un utente a uno strumento. known = lo strumento è censito tra
-- quelli del Marketplace (il middleware controlla solo quelli). Uno
-- strumento non censito richiede il piano Base (es. gestione del Kumano
-- del Giorno).
create or replace function public.tool_access(p_user_id uuid, p_tool text)
returns table (allowed boolean, required_plan text, known boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_enabled boolean;
  v_required text;
  v_known boolean;
  v_plan text := coalesce(public.plan_of(p_user_id), 'none');
begin
  select s.is_enabled, s.required_plan into v_enabled, v_required
  from public.marketplace_settings s where s.tool_name = p_tool;
  v_known := found;
  v_enabled := coalesce(v_enabled, true);
  v_required := coalesce(v_required, 'base');

  return query select
    v_enabled and (
      v_required = 'free'
      or (v_required = 'base' and v_plan in ('base', 'pro'))
      or (v_required = 'pro' and v_plan = 'pro')
    ),
    v_required,
    v_known;
end;
$$;
revoke all on function public.tool_access(uuid, text) from public, anon, authenticated;

-- Posso usare questo strumento? (utente della sessione)
create or replace function public.can_use_tool(p_tool text)
returns table (allowed boolean, required_plan text, known boolean)
language sql
stable
security definer
set search_path = public
as $$
  select * from public.tool_access(auth.uid(), p_tool);
$$;
revoke all on function public.can_use_tool(text) from public, anon;
grant execute on function public.can_use_tool(text) to authenticated;

-- Usata solo da fidelity_apply(): il negozio può dare timbri solo se il suo
-- piano copre la Kumi Card (Pro di partenza, modificabile dall'admin).
create or replace function public.user_has_active_subscription(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select allowed from public.tool_access(p_user_id, 'fidelity')), false);
$$;

insert into public.system_settings (key, value) values ('pro_price_eur', '149')
on conflict (key) do nothing;
