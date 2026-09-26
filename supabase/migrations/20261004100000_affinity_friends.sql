-- Affinity — Fase 2: Amicizie.
-- Regole: partecipa solo chi lo sceglie (consenso), ha un abbonamento attivo
-- (Base o Pro pagato/voucher, non la sola prova), ha 18 anni compiuti
-- (data di nascita nel profilo) e ha già fatto il gioco. Ogni settimana Kumi
-- presenta alcune persone compatibili (numero in system_settings); se
-- entrambe dicono sì si apre una chat solo tra loro. Blocca e segnala
-- sempre disponibili. Tutto passa da funzioni SECURITY DEFINER.

alter table public.affinity_profiles
  add column if not exists opt_friends boolean not null default false,
  add column if not exists bio text check (bio is null or char_length(bio) <= 160),
  add column if not exists languages text[] not null default '{}'
    check (languages <@ array['it', 'en', 'fr', 'es', 'pt', 'de', 'ru']::text[]),
  add column if not exists opted_in_at timestamptz;

insert into public.system_settings (key, value)
values ('affinity_intros_per_week', '3')
on conflict (key) do nothing;

create table if not exists public.affinity_intros (
  id uuid primary key default gen_random_uuid(),
  week date not null,
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  score integer not null,
  a_response text check (a_response in ('yes', 'no')),
  b_response text check (b_response in ('yes', 'no')),
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index if not exists affinity_intros_week_a_idx on public.affinity_intros(week, user_a);
create index if not exists affinity_intros_week_b_idx on public.affinity_intros(week, user_b);

create table if not exists public.affinity_blocks (
  blocker uuid not null references public.profiles(id) on delete cascade,
  blocked uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);

create table if not exists public.affinity_reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references public.profiles(id) on delete cascade,
  reported uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.affinity_messages (
  id uuid primary key default gen_random_uuid(),
  intro_id uuid not null references public.affinity_intros(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists affinity_messages_intro_idx on public.affinity_messages(intro_id, created_at);

-- Nessuna scrittura diretta dal browser: solo le funzioni qui sotto.
alter table public.affinity_intros enable row level security;
alter table public.affinity_blocks enable row level security;
alter table public.affinity_reports enable row level security;
alter table public.affinity_messages enable row level security;

-- ---------------------------------------------------------------------------
-- Requisiti: 'ok' | 'no_plan' | 'no_age' | 'underage' | 'no_map' | 'blocked'
-- ---------------------------------------------------------------------------
create or replace function public.affinity_friends_status(p_uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p.id is null or coalesce(p.is_blocked, false) then 'blocked'
    when not (p.subscription_status = 'active' and (p.subscription_expires_at is null or p.subscription_expires_at > now())) then 'no_plan'
    when p.date_of_birth is null or p.date_of_birth = '2000-01-01' then 'no_age'
    when p.date_of_birth > (current_date - interval '18 years') then 'underage'
    when a.user_id is null then 'no_map'
    else 'ok'
  end
  from public.profiles p
  left join public.affinity_profiles a on a.user_id = p.id
  where p.id = p_uid;
$$;
revoke all on function public.affinity_friends_status(uuid) from public, anon, authenticated;

create or replace function public.affinity_is_blocked(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.affinity_blocks
    where (blocker = p_a and blocked = p_b) or (blocker = p_b and blocked = p_a)
  );
$$;
revoke all on function public.affinity_is_blocked(uuid, uuid) from public, anon, authenticated;

-- Attiva/disattiva le presentazioni (con frase e lingue parlate).
create or replace function public.affinity_set_friends(p_on boolean, p_bio text, p_languages text[])
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
begin
  if v_uid is null then
    return 'blocked';
  end if;
  v_status := coalesce(public.affinity_friends_status(v_uid), 'blocked');
  if p_on and v_status <> 'ok' then
    return v_status;
  end if;
  update public.affinity_profiles
  set opt_friends = p_on,
      bio = nullif(left(trim(coalesce(p_bio, '')), 160), ''),
      languages = coalesce((
        select array_agg(l) from unnest(coalesce(p_languages, '{}')) l
        where l = any (array['it', 'en', 'fr', 'es', 'pt', 'de', 'ru'])
      ), '{}'),
      opted_in_at = case when p_on then coalesce(opted_in_at, now()) else opted_in_at end,
      updated_at = now()
  where user_id = v_uid;
  return case when found then 'ok' else 'no_map' end;
end;
$$;
revoke all on function public.affinity_set_friends(boolean, text, text[]) from public, anon;
grant execute on function public.affinity_set_friends(boolean, text, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Presentazioni della settimana (create al primo accesso della settimana) +
-- match di sempre. Restituisce tutto lo stato di Affinity Amicizie.
-- ---------------------------------------------------------------------------
create or replace function public.affinity_friends_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_me public.affinity_profiles%rowtype;
  v_mp public.profiles%rowtype;
  v_week date := date_trunc('week', now())::date;
  v_limit int := greatest(coalesce(nullif(public.setting_text('affinity_intros_per_week'), '')::int, 3), 0);
  v_have int;
  v_intros jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('status', 'blocked');
  end if;
  v_status := coalesce(public.affinity_friends_status(v_uid), 'blocked');
  select * into v_me from public.affinity_profiles where user_id = v_uid;
  select * into v_mp from public.profiles where id = v_uid;

  if v_status = 'ok' and v_me.opt_friends then
    select count(*) into v_have from public.affinity_intros
    where week = v_week and v_uid in (user_a, user_b);

    if v_have < v_limit then
      insert into public.affinity_intros (week, user_a, user_b, score)
      select v_week, least(v_uid, c.user_id), greatest(v_uid, c.user_id), c.score
      from (
        select a2.user_id,
          round(100 * (1 - sqrt(
            power((v_me.map ->> 'valori')::numeric - (a2.map ->> 'valori')::numeric, 2) +
            power((v_me.map ->> 'ritmo')::numeric - (a2.map ->> 'ritmo')::numeric, 2) +
            power((v_me.map ->> 'curiosita')::numeric - (a2.map ->> 'curiosita')::numeric, 2) +
            power((v_me.map ->> 'calore')::numeric - (a2.map ->> 'calore')::numeric, 2) +
            power((v_me.map ->> 'avventura')::numeric - (a2.map ->> 'avventura')::numeric, 2)
          ) / sqrt(5)))::int as score,
          -- Prima la lingua in comune, poi paese e città (funziona anche con pochi iscritti)
          (case when a2.languages && v_me.languages then 15 else 0 end)
          + (case when p2.country_code = v_mp.country_code then 10 else 0 end)
          + (case when v_mp.city is not null and lower(trim(p2.city)) = lower(trim(v_mp.city)) then 5 else 0 end) as bonus
        from public.affinity_profiles a2
        join public.profiles p2 on p2.id = a2.user_id
        where a2.opt_friends
          and a2.user_id <> v_uid
          and public.affinity_friends_status(a2.user_id) = 'ok'
          and not public.affinity_is_blocked(v_uid, a2.user_id)
          and not exists (
            select 1 from public.affinity_intros i
            where i.user_a = least(v_uid, a2.user_id) and i.user_b = greatest(v_uid, a2.user_id)
          )
          and (select count(*) from public.affinity_intros i2 where i2.week = v_week and a2.user_id in (i2.user_a, i2.user_b)) < v_limit
      ) c
      order by c.score + c.bonus desc, md5(c.user_id::text || v_week::text)
      limit (v_limit - v_have)
      on conflict (user_a, user_b) do nothing;
    end if;
  end if;

  select coalesce(jsonb_agg(r.item order by (r.item ->> 'week') desc, (r.item ->> 'score')::int desc), '[]'::jsonb) into v_intros
  from (
    select jsonb_build_object(
      'id', i.id,
      'week', i.week,
      'other_id', o.id,
      'first_name', o.first_name,
      'city', o.city,
      'verified', o.created_at <= now() - interval '30 days',
      'archetype', oa.archetype,
      'map', oa.map,
      'bio', oa.bio,
      'score', i.score,
      'status', case
        when my.resp = 'no' then 'declined'
        when my.resp is null then 'pending'
        when their.resp = 'yes' then 'match'
        when their.resp = 'no' then 'closed'
        else 'waiting'
      end,
      'unread', (
        select count(*) from public.affinity_messages m
        where m.intro_id = i.id and m.sender_id <> v_uid and m.read_at is null
      )
    ) as item
    from public.affinity_intros i
    cross join lateral (select case when i.user_a = v_uid then i.a_response else i.b_response end as resp) my
    cross join lateral (select case when i.user_a = v_uid then i.b_response else i.a_response end as resp) their
    join public.profiles o on o.id = case when i.user_a = v_uid then i.user_b else i.user_a end
    left join public.affinity_profiles oa on oa.user_id = o.id
    where v_uid in (i.user_a, i.user_b)
      and not public.affinity_is_blocked(v_uid, o.id)
      and (i.week = v_week or (i.a_response = 'yes' and i.b_response = 'yes'))
  ) r;

  return jsonb_build_object(
    'status', v_status,
    'has_map', v_me.user_id is not null,
    'opted_in', coalesce(v_me.opt_friends, false),
    'bio', v_me.bio,
    'languages', to_jsonb(coalesce(v_me.languages, '{}')),
    'per_week', v_limit,
    'intros', v_intros
  );
end;
$$;
revoke all on function public.affinity_friends_overview() from public, anon;
grant execute on function public.affinity_friends_overview() to authenticated;

-- Risposta a una presentazione: 'match' se anche l'altra persona ha detto sì.
create or replace function public.affinity_respond(p_intro uuid, p_yes boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_intro public.affinity_intros%rowtype;
  v_resp text := case when p_yes then 'yes' else 'no' end;
begin
  select * into v_intro from public.affinity_intros where id = p_intro and v_uid in (user_a, user_b);
  if not found then
    return 'not_found';
  end if;
  if public.affinity_friends_status(v_uid) <> 'ok' then
    return 'not_eligible';
  end if;
  if v_intro.user_a = v_uid then
    update public.affinity_intros set a_response = v_resp where id = p_intro returning * into v_intro;
    return case when v_resp = 'yes' and v_intro.b_response = 'yes' then 'match' else 'ok' end;
  end if;
  update public.affinity_intros set b_response = v_resp where id = p_intro returning * into v_intro;
  return case when v_resp = 'yes' and v_intro.a_response = 'yes' then 'match' else 'ok' end;
end;
$$;
revoke all on function public.affinity_respond(uuid, boolean) from public, anon;
grant execute on function public.affinity_respond(uuid, boolean) to authenticated;

-- Blocca: la persona sparisce da presentazioni e chat, per sempre.
create or replace function public.affinity_block(p_other uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_other is null or p_other = auth.uid() then
    return false;
  end if;
  insert into public.affinity_blocks (blocker, blocked) values (auth.uid(), p_other) on conflict do nothing;
  return true;
end;
$$;
revoke all on function public.affinity_block(uuid) from public, anon;
grant execute on function public.affinity_block(uuid) to authenticated;

-- Segnala allo Staff (e blocca subito).
create or replace function public.affinity_report(p_other uuid, p_reason text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_other is null or p_other = auth.uid() or nullif(trim(coalesce(p_reason, '')), '') is null then
    return false;
  end if;
  insert into public.affinity_reports (reporter, reported, reason) values (auth.uid(), p_other, left(trim(p_reason), 500));
  insert into public.affinity_blocks (blocker, blocked) values (auth.uid(), p_other) on conflict do nothing;
  return true;
end;
$$;
revoke all on function public.affinity_report(uuid, text) from public, anon;
grant execute on function public.affinity_report(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Chat tra match
-- ---------------------------------------------------------------------------
create or replace function public.affinity_is_match(p_intro uuid, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.affinity_intros i
    where i.id = p_intro and p_uid in (i.user_a, i.user_b)
      and i.a_response = 'yes' and i.b_response = 'yes'
      and not public.affinity_is_blocked(i.user_a, i.user_b)
  );
$$;
revoke all on function public.affinity_is_match(uuid, uuid) from public, anon, authenticated;

create or replace function public.affinity_chat(p_intro uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.affinity_is_match(p_intro, v_uid) then
    return null;
  end if;
  update public.affinity_messages set read_at = now()
  where intro_id = p_intro and sender_id <> v_uid and read_at is null;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', m.id, 'mine', m.sender_id = v_uid, 'body', m.body, 'created_at', m.created_at) order by m.created_at)
    from (select * from public.affinity_messages where intro_id = p_intro order by created_at desc limit 200) m
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.affinity_chat(uuid) from public, anon;
grant execute on function public.affinity_chat(uuid) to authenticated;

-- Invio messaggio: solo tra match; profili nuovi (< 30 giorni) max 20
-- messaggi al giorno, gli altri 200 (contro spam e truffe).
create or replace function public.affinity_send(p_intro uuid, p_body text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_new boolean;
  v_sent int;
  v_max int;
begin
  if not public.affinity_is_match(p_intro, v_uid) then
    return 'not_match';
  end if;
  if public.affinity_friends_status(v_uid) <> 'ok' then
    return 'not_eligible';
  end if;
  if nullif(trim(coalesce(p_body, '')), '') is null then
    return 'empty';
  end if;
  select created_at > now() - interval '30 days' into v_new from public.profiles where id = v_uid;
  v_max := case when coalesce(v_new, true) then 20 else 200 end;
  select count(*) into v_sent from public.affinity_messages
  where sender_id = v_uid and created_at > now() - interval '1 day';
  if v_sent >= v_max then
    return 'rate_limited';
  end if;
  insert into public.affinity_messages (intro_id, sender_id, body) values (p_intro, v_uid, left(trim(p_body), 1000));
  return 'ok';
end;
$$;
revoke all on function public.affinity_send(uuid, text) from public, anon;
grant execute on function public.affinity_send(uuid, text) to authenticated;
