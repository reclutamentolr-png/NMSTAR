-- Kumano del Giorno in home page (landing pubblica): i 4 guardrail.
--
-- 1. Moderazione obbligatoria: una storia entra in rotazione (dashboard,
--    /spotlight e home) solo dopo l'approvazione admin. Ogni modifica al
--    contenuto la rimette in coda (pending), così un utente non può farsi
--    approvare un testo innocuo e poi cambiarlo.
-- 2. Consenso dedicato per la home (show_on_home + data del consenso):
--    la vetrina massima è un opt-in separato da quello della community.
-- 3. Cold start: get_home_kumano() non restituisce nulla finché il pool
--    home (approvate + opt-in home) è sotto la soglia — la landing mostra
--    allora la storia di fallback curata.
-- 4. Lingua originale della storia (story_locale) per il chip in card.

alter table public.spotlight_profiles
  add column if not exists moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  add column if not exists show_on_home boolean not null default false,
  add column if not exists home_consent_at timestamptz,
  add column if not exists story_locale text;

-- Nota: i profili creati prima di questa migrazione ricevono il default
-- 'pending' — non sono mai stati revisionati, entrano in coda come gli altri.

create index if not exists idx_spot_home_pool
  on public.spotlight_profiles(is_opted_in, show_on_home, moderation_status);

-- Lo stato di moderazione lo decide solo l'admin (service role). Dal client
-- l'utente può aggiornare la propria riga via RLS, quindi il blocco va
-- fatto qui e non nella server action: un insert nasce sempre pending, un
-- update che tocca il contenuto torna pending, qualsiasi altro update
-- (es. solo opt-in/opt-out) conserva lo stato precedente.
create or replace function public.spotlight_profiles_guard_moderation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.moderation_status := 'pending';
  elsif new.display_name is distinct from old.display_name
     or new.story is distinct from old.story
     or new.city is distinct from old.city
     or new.country is distinct from old.country
     or new.profession is distinct from old.profession then
    new.moderation_status := 'pending';
  else
    new.moderation_status := old.moderation_status;
  end if;

  return new;
end;
$$;

drop trigger if exists spotlight_profiles_guard_moderation on public.spotlight_profiles;
create trigger spotlight_profiles_guard_moderation
  before insert or update on public.spotlight_profiles
  for each row execute function public.spotlight_profiles_guard_moderation();

-- Pubblico = opted-in E approvato (vale anche per l'archivio /spotlight,
-- che legge spotlight_days → spotlight_profiles tramite questa policy).
drop policy if exists spotlight_profiles_select_public on public.spotlight_profiles;
create policy spotlight_profiles_select_public on public.spotlight_profiles
  for select using (is_opted_in = true and moderation_status = 'approved');

-- Rotazione giornaliera: solo storie approvate. In più, se il Kumano già
-- fissato per oggi revoca il consenso (o viene rifiutato) in giornata, la
-- sua riga di oggi viene rimossa e si riseleziona: prima la funzione
-- (security definer, quindi fuori da RLS) continuava a restituirlo fino a
-- mezzanotte.
create or replace function public.get_todays_kumano()
returns public.spotlight_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_result public.spotlight_profiles;
begin
  select d.profile_id into v_profile_id
  from public.spotlight_days d
  join public.spotlight_profiles p on p.id = d.profile_id
  where d.day = current_date
    and p.is_opted_in = true
    and p.moderation_status = 'approved';

  if v_profile_id is null then
    delete from public.spotlight_days where day = current_date;

    select p.id into v_profile_id
    from public.spotlight_profiles p
    where p.is_opted_in = true
      and p.moderation_status = 'approved'
      and not exists (
        select 1 from public.spotlight_days d
        where d.profile_id = p.id and d.day > current_date - interval '90 days'
      )
    order by md5(p.id::text || current_date::text)
    limit 1;

    if v_profile_id is null then
      select p.id into v_profile_id
      from public.spotlight_profiles p
      left join public.spotlight_days d on d.profile_id = p.id
      where p.is_opted_in = true
        and p.moderation_status = 'approved'
      group by p.id
      order by max(d.day) asc nulls first
      limit 1;
    end if;

    if v_profile_id is not null then
      insert into public.spotlight_days (day, profile_id) values (current_date, v_profile_id)
      on conflict (day) do nothing;
      select profile_id into v_profile_id from public.spotlight_days where day = current_date;
    end if;
  end if;

  if v_profile_id is null then
    return null;
  end if;

  select * into v_result from public.spotlight_profiles where id = v_profile_id;
  return v_result;
end;
$$;

grant execute on function public.get_todays_kumano() to anon, authenticated;

-- Kumano per la home: se il Kumano del Giorno ha dato il consenso home è
-- lui (stessa persona su dashboard, /spotlight e landing); altrimenti una
-- scelta deterministica del giorno (md5 id+data) tra le sole storie
-- approvate con consenso home. Nessuna riga se il pool home è sotto
-- p_min_pool (cold start). Restituisce solo i campi pubblici della card —
-- niente user_id verso la landing.
create or replace function public.get_home_kumano(p_min_pool integer default 10)
returns table (
  display_name text,
  city text,
  country text,
  profession text,
  story text,
  story_locale text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pool integer;
  v_today public.spotlight_profiles;
begin
  select count(*) into v_pool
  from public.spotlight_profiles p
  where p.is_opted_in = true and p.show_on_home = true and p.moderation_status = 'approved';

  if v_pool < greatest(p_min_pool, 1) then
    return;
  end if;

  v_today := public.get_todays_kumano();
  if v_today.id is not null and v_today.show_on_home = true then
    return query select v_today.display_name, v_today.city, v_today.country, v_today.profession, v_today.story, v_today.story_locale;
    return;
  end if;

  return query
  select p.display_name, p.city, p.country, p.profession, p.story, p.story_locale
  from public.spotlight_profiles p
  where p.is_opted_in = true and p.show_on_home = true and p.moderation_status = 'approved'
  order by md5(p.id::text || current_date::text)
  limit 1;
end;
$$;

grant execute on function public.get_home_kumano(integer) to anon, authenticated;
