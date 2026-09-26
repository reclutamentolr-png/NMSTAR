-- Gestione KU: nuovi usi dei KU Points (profiles.daily_points), ognuno
-- attivabile/disattivabile dal pannello admin ("Gestione KU") senza
-- scrivere altro codice. Tutti partono DISATTIVATI.
--
--   showcase          Vetrina annunci pagabile in KU
--   unlocks           Sblocchi extra negli strumenti (catalogo ku_unlocks)
--   badges            Badge di costanza (su ku_earned_total)
--   renewal_discount  Sconto sul rinnovo dell'abbonamento Stripe
--   donation          Donazione solidale (KUMANI dona in euro, a budget)
--   conversion        Conversione KU → Punti Rete con tetto mensile
--
-- Ogni spesa passa da una funzione SECURITY DEFINER che verifica che la
-- funzione sia attiva, scala i KU in modo atomico e la registra in
-- ku_transactions (tetti mensili/annuali e statistiche admin).

-- ============================================================
-- Tabelle
-- ============================================================

create table if not exists public.ku_features (
  key text primary key check (key in ('showcase', 'unlocks', 'badges', 'renewal_discount', 'donation', 'conversion')),
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.ku_features (key, config) values
  ('showcase', '{"cost_7d": 40, "cost_15d": 70}'),
  ('unlocks', '{}'),
  ('badges', '{"levels": [{"key": "costante", "threshold": 500}, {"key": "pilastro", "threshold": 2000}]}'),
  ('renewal_discount', '{"cost_ku": 300, "discount_eur": 5, "max_per_year": 1}'),
  ('donation', '{"association": "", "description": "", "ku_per_euro": 100, "monthly_budget_eur": 100, "min_ku": 10}'),
  ('conversion', '{"ku_per_point": 20, "max_points_per_month": 5}')
on conflict (key) do nothing;

-- Catalogo degli sblocchi: ogni voce corrisponde a qualcosa di già
-- implementato nel codice (la chiave lo identifica). Dall'admin si
-- cambiano costo e disponibilità.
create table if not exists public.ku_unlocks (
  key text primary key,
  tool text not null,
  cost_ku integer not null check (cost_ku > 0),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.ku_unlocks (key, tool, cost_ku) values
  ('linkinbio_premium_themes', 'link-in-bio', 150)
on conflict (key) do nothing;

create table if not exists public.ku_unlock_purchases (
  user_id uuid not null references public.profiles(id) on delete cascade,
  unlock_key text not null references public.ku_unlocks(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, unlock_key)
);

create table if not exists public.ku_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('showcase', 'unlock', 'renewal_discount', 'donation', 'conversion')),
  ku_amount integer not null check (ku_amount > 0),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_ku_tx_user_kind on public.ku_transactions(user_id, kind, created_at);
create index if not exists idx_ku_tx_kind_created on public.ku_transactions(kind, created_at);

alter table public.ku_features enable row level security;
alter table public.ku_unlocks enable row level security;
alter table public.ku_unlock_purchases enable row level security;
alter table public.ku_transactions enable row level security;

-- Lettura: impostazioni e catalogo visibili agli utenti loggati; acquisti e
-- movimenti solo i propri. Nessuna scrittura dal browser (solo server).
create policy ku_features_read on public.ku_features for select to authenticated using (true);
create policy ku_unlocks_read on public.ku_unlocks for select to authenticated using (true);
create policy ku_unlock_purchases_own on public.ku_unlock_purchases for select to authenticated using (user_id = auth.uid());
create policy ku_transactions_own on public.ku_transactions for select to authenticated using (user_id = auth.uid());

-- ============================================================
-- KU guadagnati in totale (per i badge di costanza)
-- ============================================================

alter table public.profiles add column if not exists ku_earned_total integer not null default 0;

-- Stima iniziale per chi c'era già: saldo attuale + KU spesi in annunci
-- (10 per annuncio). Da qui in poi il totale cresce a ogni punto guadagnato.
update public.profiles p
set ku_earned_total = coalesce(p.daily_points, 0)
  + 10 * (select count(*) from public.listings l where l.user_id = p.id)
where p.ku_earned_total = 0;

create or replace function public.award_daily_login_point()
returns table (awarded boolean, new_daily_points integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Europe/Rome')::date;
  v_points int;
begin
  if auth.uid() is null then
    return;
  end if;

  update profiles
  set daily_points = coalesce(daily_points, 0) + 1,
      ku_earned_total = coalesce(ku_earned_total, 0) + 1,
      last_daily_login = v_today
  where id = auth.uid()
    and (last_daily_login is null or last_daily_login < v_today)
  returning daily_points into v_points;

  if not found then
    select coalesce(daily_points, 0) into v_points from profiles where id = auth.uid();
    return query select false, v_points;
    return;
  end if;
  return query select true, v_points;
end;
$$;

CREATE OR REPLACE FUNCTION award_tool_point(p_tool_name TEXT)
RETURNS TABLE (awarded BOOLEAN, new_balance INT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'Europe/Rome')::date;
  v_rows INT;
  v_balance INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF p_tool_name NOT IN (
    'link-in-bio', 'memolife', 'neurobalance', 'svat',
    'offermaker', 'qr-code-pro', 'life-calendar', 'findo', 'digital-receipt',
    'spendly', 'fidelity', 'kumani-cv', 'preventivi'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO daily_tool_points (user_id, tool_name, awarded_on)
  VALUES (auth.uid(), p_tool_name, v_today)
  ON CONFLICT (user_id, tool_name, awarded_on) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    SELECT daily_points INTO v_balance FROM profiles WHERE id = auth.uid();
    RETURN QUERY SELECT false, COALESCE(v_balance, 0);
    RETURN;
  END IF;

  UPDATE profiles
  SET daily_points = COALESCE(daily_points, 0) + 1,
      ku_earned_total = COALESCE(ku_earned_total, 0) + 1
  WHERE id = auth.uid()
  RETURNING daily_points INTO v_balance;

  RETURN QUERY SELECT true, v_balance;
END;
$$;

-- ============================================================
-- Helper
-- ============================================================

create or replace function public.ku_feature_config(p_key text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when enabled then config else null end from public.ku_features where key = p_key;
$$;
revoke all on function public.ku_feature_config(text) from public, anon, authenticated;

-- Scala KU in modo atomico (solo importi positivi); false se non bastano.
create or replace function public.ku_spend(p_user_id uuid, p_amount integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount is null or p_amount <= 0 then
    return false;
  end if;
  update public.profiles
  set daily_points = daily_points - p_amount
  where id = p_user_id and coalesce(daily_points, 0) >= p_amount;
  return found;
end;
$$;
revoke all on function public.ku_spend(uuid, integer) from public, anon, authenticated;

-- ============================================================
-- 1. Vetrina annunci in KU
-- ============================================================

create or replace function public.feature_listing_ku(p_listing_id uuid, p_duration_days integer)
returns table (success boolean, reason text, featured_until timestamptz, new_daily_points integer)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_config jsonb := public.ku_feature_config('showcase');
  v_owner uuid;
  v_cost int;
  v_until timestamptz;
  v_balance int;
begin
  if auth.uid() is null then
    return;
  end if;
  select coalesce(daily_points, 0) into v_balance from profiles where id = auth.uid();
  if v_config is null then
    return query select false, 'disabled', null::timestamptz, v_balance; return;
  end if;
  if p_duration_days not in (7, 15) then
    return query select false, 'invalid_duration', null::timestamptz, v_balance; return;
  end if;
  select user_id into v_owner from listings where id = p_listing_id;
  if v_owner is null or v_owner <> auth.uid() then
    return query select false, 'not_owner', null::timestamptz, v_balance; return;
  end if;

  v_cost := coalesce((v_config ->> case p_duration_days when 7 then 'cost_7d' else 'cost_15d' end)::int, 0);
  if v_cost <= 0 or not public.ku_spend(auth.uid(), v_cost) then
    return query select false, 'insufficient_points', null::timestamptz, v_balance; return;
  end if;

  -- Se è già in vetrina, i giorni si sommano a quelli rimasti.
  select greatest(coalesce(l.featured_until, now()), now()) + make_interval(days => p_duration_days)
    into v_until from listings l where l.id = p_listing_id;
  update listings set featured_until = v_until where id = p_listing_id;
  insert into ku_transactions (user_id, kind, ku_amount, details)
    values (auth.uid(), 'showcase', v_cost, jsonb_build_object('listing_id', p_listing_id, 'days', p_duration_days));

  select coalesce(daily_points, 0) into v_balance from profiles where id = auth.uid();
  return query select true, null::text, v_until, v_balance;
end;
$$;
revoke all on function public.feature_listing_ku(uuid, integer) from public, anon;
grant execute on function public.feature_listing_ku(uuid, integer) to authenticated;

-- ============================================================
-- 2. Sblocchi extra negli strumenti
-- ============================================================

create or replace function public.buy_ku_unlock(p_unlock_key text)
returns table (success boolean, reason text, new_daily_points integer)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_cost int;
  v_balance int;
begin
  if auth.uid() is null then
    return;
  end if;
  select coalesce(daily_points, 0) into v_balance from profiles where id = auth.uid();
  if public.ku_feature_config('unlocks') is null then
    return query select false, 'disabled', v_balance; return;
  end if;
  select cost_ku into v_cost from ku_unlocks where key = p_unlock_key and enabled;
  if v_cost is null then
    return query select false, 'not_found', v_balance; return;
  end if;
  if exists (select 1 from ku_unlock_purchases where user_id = auth.uid() and unlock_key = p_unlock_key) then
    return query select false, 'already_owned', v_balance; return;
  end if;
  if not public.ku_spend(auth.uid(), v_cost) then
    return query select false, 'insufficient_points', v_balance; return;
  end if;

  insert into ku_unlock_purchases (user_id, unlock_key) values (auth.uid(), p_unlock_key);
  insert into ku_transactions (user_id, kind, ku_amount, details)
    values (auth.uid(), 'unlock', v_cost, jsonb_build_object('unlock_key', p_unlock_key));
  select coalesce(daily_points, 0) into v_balance from profiles where id = auth.uid();
  return query select true, null::text, v_balance;
end;
$$;
revoke all on function public.buy_ku_unlock(text) from public, anon;
grant execute on function public.buy_ku_unlock(text) to authenticated;

-- ============================================================
-- 4. Sconto sul rinnovo: prenotazione (i KU si scalano qui, il coupon
--    Stripe lo applica la server action; se Stripe fallisce, rimborso).
-- ============================================================

create or replace function public.reserve_renewal_discount()
returns table (success boolean, reason text, transaction_id uuid, discount_eur integer)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_config jsonb := public.ku_feature_config('renewal_discount');
  v_cost int;
  v_discount int;
  v_max int;
  v_used int;
  v_id uuid;
begin
  if auth.uid() is null then
    return;
  end if;
  if v_config is null then
    return query select false, 'disabled', null::uuid, 0; return;
  end if;
  v_cost := coalesce((v_config ->> 'cost_ku')::int, 0);
  v_discount := coalesce((v_config ->> 'discount_eur')::int, 0);
  v_max := coalesce((v_config ->> 'max_per_year')::int, 1);
  if v_cost <= 0 or v_discount <= 0 then
    return query select false, 'disabled', null::uuid, 0; return;
  end if;

  -- Solo abbonamenti Stripe attivi: lo sconto va sul prossimo addebito.
  if not exists (
    select 1 from profiles
    where id = auth.uid() and subscription_status = 'active' and subscription_source = 'stripe'
      and (subscription_expires_at is null or subscription_expires_at > now())
  ) then
    return query select false, 'no_stripe_subscription', null::uuid, 0; return;
  end if;

  select count(*) into v_used from ku_transactions
  where user_id = auth.uid() and kind = 'renewal_discount'
    and created_at > now() - interval '365 days'
    and coalesce(details ->> 'status', '') <> 'failed';
  if v_used >= v_max then
    return query select false, 'limit_reached', null::uuid, 0; return;
  end if;

  if not public.ku_spend(auth.uid(), v_cost) then
    return query select false, 'insufficient_points', null::uuid, 0; return;
  end if;

  insert into ku_transactions (user_id, kind, ku_amount, details)
    values (auth.uid(), 'renewal_discount', v_cost, jsonb_build_object('status', 'pending', 'discount_eur', v_discount))
    returning id into v_id;
  return query select true, null::text, v_id, v_discount;
end;
$$;
revoke all on function public.reserve_renewal_discount() from public, anon;
grant execute on function public.reserve_renewal_discount() to authenticated;

-- ============================================================
-- 5. Donazione solidale
-- ============================================================

create or replace function public.donate_ku(p_amount integer)
returns table (success boolean, reason text, new_daily_points integer)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_config jsonb := public.ku_feature_config('donation');
  v_min int;
  v_balance int;
begin
  if auth.uid() is null then
    return;
  end if;
  select coalesce(daily_points, 0) into v_balance from profiles where id = auth.uid();
  if v_config is null then
    return query select false, 'disabled', v_balance; return;
  end if;
  v_min := greatest(coalesce((v_config ->> 'min_ku')::int, 10), 1);
  if p_amount is null or p_amount < v_min then
    return query select false, 'below_minimum', v_balance; return;
  end if;
  if not public.ku_spend(auth.uid(), p_amount) then
    return query select false, 'insufficient_points', v_balance; return;
  end if;

  insert into ku_transactions (user_id, kind, ku_amount, details)
    values (auth.uid(), 'donation', p_amount, jsonb_build_object('association', v_config ->> 'association'));
  select coalesce(daily_points, 0) into v_balance from profiles where id = auth.uid();
  return query select true, null::text, v_balance;
end;
$$;
revoke all on function public.donate_ku(integer) from public, anon;
grant execute on function public.donate_ku(integer) to authenticated;

-- ============================================================
-- 6. Conversione KU → Punti Rete (tetto mensile, mese solare italiano)
-- ============================================================

create or replace function public.convert_ku_to_network_points(p_points integer)
returns table (success boolean, reason text, new_daily_points integer, new_network_points integer)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_config jsonb := public.ku_feature_config('conversion');
  v_rate int;
  v_max int;
  v_used int;
  v_month_start timestamptz := date_trunc('month', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome';
  v_daily int;
  v_network int;
begin
  if auth.uid() is null then
    return;
  end if;
  select coalesce(daily_points, 0), coalesce(network_points, 0) into v_daily, v_network from profiles where id = auth.uid();
  if v_config is null then
    return query select false, 'disabled', v_daily, v_network; return;
  end if;
  v_rate := coalesce((v_config ->> 'ku_per_point')::int, 0);
  v_max := coalesce((v_config ->> 'max_points_per_month')::int, 0);
  if v_rate <= 0 or v_max <= 0 or p_points is null or p_points <= 0 then
    return query select false, 'invalid_amount', v_daily, v_network; return;
  end if;

  select coalesce(sum((details ->> 'points')::int), 0) into v_used from ku_transactions
  where user_id = auth.uid() and kind = 'conversion' and created_at >= v_month_start;
  if v_used + p_points > v_max then
    return query select false, 'limit_reached', v_daily, v_network; return;
  end if;

  if not public.ku_spend(auth.uid(), p_points * v_rate) then
    return query select false, 'insufficient_points', v_daily, v_network; return;
  end if;

  update profiles set network_points = coalesce(network_points, 0) + p_points where id = auth.uid()
    returning daily_points, network_points into v_daily, v_network;
  insert into ku_transactions (user_id, kind, ku_amount, details)
    values (auth.uid(), 'conversion', p_points * v_rate, jsonb_build_object('points', p_points));
  return query select true, null::text, v_daily, v_network;
end;
$$;
revoke all on function public.convert_ku_to_network_points(integer) from public, anon;
grant execute on function public.convert_ku_to_network_points(integer) to authenticated;
