-- Sicurezza: chiusura di falle sui profili e sulle funzioni dei punti.
--
-- Prima di questa migrazione:
--  1. "Users can update own profile" permetteva a ogni utente loggato di
--     modificare QUALSIASI colonna della propria riga (is_admin,
--     network_points, subscription_status, sponsor_id, ...): chiunque poteva
--     diventare admin o regalarsi abbonamento e punti.
--  2. "Profiles are viewable by everyone" rendeva leggibili a chiunque, anche
--     senza login, email, telefono, indirizzo e data di nascita di tutti.
--  3. refund_points(p_amount) accreditava qualsiasi importo a chi la chiamava;
--     spend_network_points / spend_daily_points accettavano importi negativi
--     (spendere -1000 = guadagnare 1000).
--  4. register_user_with_matrix (non più usata) e get_user_downline erano
--     eseguibili anche da visitatori anonimi.

-- ============================================================
-- 1. Colonne privilegiate: scrivibili solo dal server
-- ============================================================

-- Dal browser (ruoli authenticated/anon via API) un utente può cambiare solo
-- i propri dati anagrafici e di contatto. Tutto il resto (admin, punti,
-- abbonamento, sponsor, codice invito, contatori bonus...) resta com'era.
-- Server action con service role e funzioni SECURITY DEFINER (owner
-- postgres) non sono toccate: current_user non è authenticated/anon.
-- Whitelist, non blacklist: una colonna aggiunta in futuro è protetta di
-- default finché non viene aggiunta qui esplicitamente.
create or replace function public.profiles_guard_privileged_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_allowed text[] := array[
    'first_name', 'last_name', 'username', 'phone', 'country_code', 'date_of_birth',
    'gender', 'city', 'address', 'postal_code', 'province', 'occupation',
    'last_seen', 'qualifications_seen', 'updated_at'
  ];
  v_changes jsonb;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Creazione del proprio profilo alla registrazione: valori privilegiati
    -- sempre ai default, email = quella dell'account che fa la richiesta
    -- (la policy di INSERT impone già id = auth.uid()).
    new.email := coalesce(auth.email(), new.email);
    new.is_admin := false;
    new.is_blocked := false;
    new.is_verified := false;
    new.is_active := true;
    new.network_points := 0;
    new.daily_points := 0;
    new.last_daily_login := null;
    new.total_listings := 0;
    new.rank_bonuses_claimed := '{}';
    new.qualifications_seen := '{}';
    new.subscription_status := 'free';
    new.subscription_expires_at := null;
    new.subscription_source := null;
    new.matrix_bonus_direct_slots_paid := 0;
    new.matrix_bonus_spillover_slots_paid := 0;
    new.sponsor_overflow_bonus_paid := 0;
    return new;
  end if;

  -- UPDATE: si parte dalla riga vecchia e si applicano solo le colonne ammesse.
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_changes
  from jsonb_each(to_jsonb(new))
  where key = any(v_allowed);

  new := jsonb_populate_record(old, v_changes);
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged_columns on public.profiles;
create trigger profiles_guard_privileged_columns
  before insert or update on public.profiles
  for each row execute function public.profiles_guard_privileged_columns();

-- ============================================================
-- 2. Lettura: niente accesso anonimo, niente dati personali degli altri
-- ============================================================

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists profiles_select_authenticated on public.profiles;
-- Gli utenti loggati vedono le righe degli altri (nomi in matrice, sponsor,
-- classifica, bacheca...) ma solo le colonne concesse qui sotto.
create policy profiles_select_authenticated on public.profiles
  for select to authenticated using (true);

revoke all on public.profiles from anon;

-- Colonne leggibili dal browser/sessione utente: tutte TRANNE i dati
-- personali (email, phone, address, postal_code, date_of_birth, gender,
-- city, province). Il proprio profilo completo si legge con get_my_profile().
revoke select on public.profiles from authenticated;
grant select (
  id, username, first_name, last_name, country_code, referral_code, sponsor_id,
  is_verified, is_active, subscription_status, created_at, updated_at, is_blocked,
  occupation, last_seen, daily_points, last_daily_login, total_listings,
  qualifications_seen, subscription_expires_at, is_admin, network_points,
  rank_bonuses_claimed, subscription_source, matrix_bonus_direct_slots_paid,
  matrix_bonus_spillover_slots_paid, sponsor_overflow_bonus_paid
) on public.profiles to authenticated;

-- Il proprio profilo completo (dati personali inclusi).
create or replace function public.get_my_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;
revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

-- I propri invitati diretti, telefono incluso (serve al promemoria WhatsApp
-- "Non ancora KUMANI"): il telefono degli altri utenti resta non leggibile.
create or replace function public.get_my_direct_sponsored()
returns table (
  id uuid,
  first_name text,
  last_name text,
  referral_code text,
  phone text,
  created_at timestamptz,
  subscription_status text,
  subscription_expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.first_name::text, p.last_name::text, p.referral_code::text, p.phone::text,
         p.created_at, p.subscription_status::text, p.subscription_expires_at
  from public.profiles p
  where p.sponsor_id = auth.uid()
  order by p.created_at;
$$;
revoke all on function public.get_my_direct_sponsored() from public, anon;
grant execute on function public.get_my_direct_sponsored() to authenticated;

-- ============================================================
-- 3. Funzioni dei punti
-- ============================================================

-- Importo sempre positivo: prima "spendere -1000" accreditava 1000 punti.
create or replace function public.spend_daily_points(p_amount integer)
returns table (success boolean, new_daily_points integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_daily int;
begin
  if auth.uid() is null then
    return;
  end if;
  if p_amount is null or p_amount <= 0 then
    select coalesce(daily_points, 0) into v_daily from profiles where id = auth.uid();
    return query select false, v_daily;
    return;
  end if;

  update profiles
  set daily_points = daily_points - p_amount
  where id = auth.uid() and coalesce(daily_points, 0) >= p_amount
  returning daily_points into v_daily;

  if not found then
    select coalesce(daily_points, 0) into v_daily from profiles where id = auth.uid();
    return query select false, v_daily;
    return;
  end if;
  return query select true, v_daily;
end;
$$;

create or replace function public.spend_network_points(p_amount integer)
returns table (success boolean, new_network_points integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_network int;
begin
  if auth.uid() is null then
    return;
  end if;
  if p_amount is null or p_amount <= 0 then
    select coalesce(network_points, 0) into v_network from profiles where id = auth.uid();
    return query select false, v_network;
    return;
  end if;

  update profiles
  set network_points = network_points - p_amount
  where id = auth.uid() and coalesce(network_points, 0) >= p_amount
  returning network_points into v_network;

  if not found then
    select coalesce(network_points, 0) into v_network from profiles where id = auth.uid();
    return query select false, v_network;
    return;
  end if;
  return query select true, v_network;
end;
$$;

-- refund_points accreditava qualsiasi importo a chiunque la chiamasse: ora
-- solo il server (rimborso annuncio non pubblicato) tramite la funzione
-- sotto, con utente e importo decisi lato server.
revoke all on function public.refund_points(integer) from public, anon, authenticated;

create or replace function public.add_daily_points_for(p_user_id uuid, p_amount integer)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set daily_points = coalesce(daily_points, 0) + p_amount
  where id = p_user_id and p_amount > 0
  returning daily_points;
$$;
revoke all on function public.add_daily_points_for(uuid, integer) from public, anon, authenticated;
grant execute on function public.add_daily_points_for(uuid, integer) to service_role;

-- Punto giornaliero di accesso, atomico: al massimo uno al giorno (ora di
-- Roma), senza più scrivere daily_points dal profilo dell'utente.
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
revoke all on function public.award_daily_login_point() from public, anon;
grant execute on function public.award_daily_login_point() to authenticated;

-- ============================================================
-- 4. Funzioni non destinate ai visitatori anonimi
-- ============================================================

-- Vecchia registrazione non più usata dall'app: creava profili arbitrari.
revoke all on function public.register_user_with_matrix(uuid, text, text, text, text, date, text, character, text, text, text, text)
  from public, anon, authenticated;

revoke all on function public.get_user_downline(uuid, integer) from public, anon;
grant execute on function public.get_user_downline(uuid, integer) to authenticated;

-- ============================================================
-- 5. Bacheca (listings): niente annunci o vetrina gratis dal browser
-- ============================================================

-- La creazione passa dalla server action (dopo aver scalato i punti) con
-- service role: dal browser non si può più inserire un annuncio saltando
-- il costo.
drop policy if exists "Utenti possono creare annunci" on public.listings;

-- Dal browser: la vetrina (featured_until) si ottiene solo pagando con
-- feature_listing(); la scadenza al massimo 30 giorni da oggi (la
-- ripubblicazione gratuita resta, ma non si può allungare a piacere).
create or replace function public.listings_guard_user_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    new.featured_until := old.featured_until;
    new.user_id := old.user_id;
  else
    new.featured_until := null;
  end if;
  if new.expires_at is null or new.expires_at > now() + interval '30 days 1 hour' then
    new.expires_at := now() + interval '30 days';
  end if;
  return new;
end;
$$;

drop trigger if exists listings_guard_user_changes on public.listings;
create trigger listings_guard_user_changes
  before insert or update on public.listings
  for each row execute function public.listings_guard_user_changes();
