-- Veritas — "Chi sta mentendo?" (Fase 1: modalità amici).
-- Stanza con codice, da 3 a 8 giocatori, anche ospiti senza account. Ogni
-- giocatore ha un codice segreto (solo nel suo browser; qui ne salviamo
-- l'impronta sha256) che le funzioni verificano a ogni azione.
-- Turno: tutti rispondono alla stessa domanda, uno in segreto inventa, poi
-- ognuno vota chi mente. Le fasi avanzano da sole (tempo scaduto o tutti
-- hanno risposto/votato) alla lettura dello stato. Tutto passa da funzioni
-- SECURITY DEFINER: le tabelle non sono leggibili direttamente.

create table if not exists public.veritas_questions (
  id serial primary key,
  texts jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.veritas_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  locale text not null default 'it' check (locale in ('it', 'en', 'fr', 'es', 'pt', 'de', 'ru')),
  host_player_id uuid,
  host_user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'lobby' check (status in ('lobby', 'writing', 'voting', 'reveal', 'finished')),
  round integer not null default 0,
  total_rounds integer not null default 5 check (total_rounds between 1 and 10),
  question_id integer references public.veritas_questions(id),
  liar_player_id uuid,
  used_questions integer[] not null default '{}',
  phase_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.veritas_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.veritas_rooms(id) on delete cascade,
  token_hash text not null,
  nickname text not null check (char_length(nickname) between 1 and 24),
  user_id uuid references public.profiles(id) on delete set null,
  score integer not null default 0,
  joined_at timestamptz not null default now()
);
create index if not exists veritas_players_room_idx on public.veritas_players(room_id);

create table if not exists public.veritas_answers (
  room_id uuid not null references public.veritas_rooms(id) on delete cascade,
  round integer not null,
  player_id uuid not null references public.veritas_players(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now(),
  primary key (room_id, round, player_id)
);

create table if not exists public.veritas_votes (
  room_id uuid not null references public.veritas_rooms(id) on delete cascade,
  round integer not null,
  voter_id uuid not null references public.veritas_players(id) on delete cascade,
  target_id uuid not null references public.veritas_players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, round, voter_id)
);

alter table public.veritas_questions enable row level security;
alter table public.veritas_rooms enable row level security;
alter table public.veritas_players enable row level security;
alter table public.veritas_answers enable row level security;
alter table public.veritas_votes enable row level security;

-- Tempi delle fasi (secondi)
insert into public.system_settings (key, value) values
  ('veritas_write_seconds', '90'),
  ('veritas_vote_seconds', '45'),
  ('veritas_reveal_seconds', '15')
on conflict (key) do nothing;

-- Strumento nel Marketplace: gratuito.
insert into public.marketplace_settings (tool_name, is_enabled, required_plan)
values ('veritas', true, 'free')
on conflict (tool_name) do nothing;

-- ---------------------------------------------------------------------------
-- Utilità interne
-- ---------------------------------------------------------------------------
create or replace function public.veritas_hash(p_token text)
returns text
language sql
immutable
as $$
  select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
$$;

-- Giocatore dal codice segreto (null se non valido).
create or replace function public.veritas_player(p_room uuid, p_token text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.veritas_players
  where room_id = p_room and token_hash = public.veritas_hash(p_token);
$$;
revoke all on function public.veritas_player(uuid, text) from public, anon, authenticated;

create or replace function public.veritas_seconds(p_key text, p_default int)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select greatest(coalesce(nullif(public.setting_text(p_key), '')::int, p_default), 5);
$$;
revoke all on function public.veritas_seconds(text, int) from public, anon, authenticated;

-- Segnale "c'è una novità" sul canale pubblico della stanza (nessun dato).
create or replace function public.veritas_signal(p_room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform realtime.send(jsonb_build_object('at', now()), 'update', 'veritas:' || p_room::text, false);
exception when others then
  null;
end;
$$;
revoke all on function public.veritas_signal(uuid) from public, anon, authenticated;

-- Nickname unico nella stanza ("Luca", "Luca 2", ...).
create or replace function public.veritas_unique_nickname(p_room uuid, p_nickname text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text := left(regexp_replace(trim(coalesce(p_nickname, '')), '\s+', ' ', 'g'), 20);
  v_name text;
  v_n int := 1;
begin
  if v_base = '' then
    v_base := 'Kumano';
  end if;
  v_name := v_base;
  while exists (select 1 from public.veritas_players where room_id = p_room and lower(nickname) = lower(v_name)) loop
    v_n := v_n + 1;
    v_name := v_base || ' ' || v_n;
  end loop;
  return v_name;
end;
$$;
revoke all on function public.veritas_unique_nickname(uuid, text) from public, anon, authenticated;

-- Nuovo turno: domanda non ancora usata nella stanza e bugiardo a caso.
create or replace function public.veritas_start_round(p_room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.veritas_rooms%rowtype;
  v_question int;
  v_liar uuid;
begin
  select * into v_room from public.veritas_rooms where id = p_room for update;
  select id into v_question from public.veritas_questions
  where active and not (id = any (v_room.used_questions))
  order by random() limit 1;
  if v_question is null then
    select id into v_question from public.veritas_questions where active order by random() limit 1;
  end if;
  select id into v_liar from public.veritas_players where room_id = p_room order by random() limit 1;
  update public.veritas_rooms
  set status = 'writing',
      round = v_room.round + 1,
      question_id = v_question,
      liar_player_id = v_liar,
      used_questions = array_append(v_room.used_questions, v_question),
      phase_ends_at = now() + make_interval(secs => public.veritas_seconds('veritas_write_seconds', 90)),
      updated_at = now()
  where id = p_room;
end;
$$;
revoke all on function public.veritas_start_round(uuid) from public, anon, authenticated;

-- Punti del turno: chi vota il bugiardo +1; il bugiardo +1 per ogni
-- persona che ha ingannato. Il voto del bugiardo non conta.
create or replace function public.veritas_score_round(p_room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.veritas_rooms%rowtype;
  v_fooled int;
begin
  select * into v_room from public.veritas_rooms where id = p_room;
  update public.veritas_players p set score = score + 1
  where p.room_id = p_room
    and p.id <> v_room.liar_player_id
    and exists (
      select 1 from public.veritas_votes v
      where v.room_id = p_room and v.round = v_room.round and v.voter_id = p.id and v.target_id = v_room.liar_player_id
    );
  select count(*) into v_fooled from public.veritas_votes v
  where v.room_id = p_room and v.round = v_room.round
    and v.voter_id <> v_room.liar_player_id and v.target_id <> v_room.liar_player_id;
  update public.veritas_players set score = score + v_fooled where id = v_room.liar_player_id;
end;
$$;
revoke all on function public.veritas_score_round(uuid) from public, anon, authenticated;

-- Fa avanzare le fasi quando il tempo è scaduto o hanno risposto/votato tutti.
create or replace function public.veritas_advance(p_room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.veritas_rooms%rowtype;
  v_players int;
  v_answers int;
  v_votes int;
  v_liar_answered boolean;
begin
  select * into v_room from public.veritas_rooms where id = p_room for update;
  if not found then
    return;
  end if;
  select count(*) into v_players from public.veritas_players where room_id = p_room;

  if v_room.status = 'writing' then
    select count(*) into v_answers from public.veritas_answers where room_id = p_room and round = v_room.round;
    if v_answers >= v_players or now() >= v_room.phase_ends_at then
      v_liar_answered := exists (
        select 1 from public.veritas_answers where room_id = p_room and round = v_room.round and player_id = v_room.liar_player_id
      );
      if v_answers < 2 or not v_liar_answered then
        -- Turno non valido (bugiardo o troppi assenti): si mostra e si prosegue senza punti.
        update public.veritas_rooms
        set status = 'reveal', phase_ends_at = now() + make_interval(secs => public.veritas_seconds('veritas_reveal_seconds', 15)), updated_at = now()
        where id = p_room;
      else
        update public.veritas_rooms
        set status = 'voting', phase_ends_at = now() + make_interval(secs => public.veritas_seconds('veritas_vote_seconds', 45)), updated_at = now()
        where id = p_room;
      end if;
      perform public.veritas_signal(p_room);
    end if;
  elsif v_room.status = 'voting' then
    select count(*) into v_answers from public.veritas_answers where room_id = p_room and round = v_room.round;
    select count(*) into v_votes from public.veritas_votes where room_id = p_room and round = v_room.round;
    -- Votano tutti quelli che hanno risposto
    if v_votes >= v_answers or now() >= v_room.phase_ends_at then
      perform public.veritas_score_round(p_room);
      update public.veritas_rooms
      set status = 'reveal', phase_ends_at = now() + make_interval(secs => public.veritas_seconds('veritas_reveal_seconds', 15)), updated_at = now()
      where id = p_room;
      perform public.veritas_signal(p_room);
    end if;
  elsif v_room.status = 'reveal' and now() >= v_room.phase_ends_at then
    if v_room.round >= v_room.total_rounds then
      update public.veritas_rooms set status = 'finished', phase_ends_at = null, updated_at = now() where id = p_room;
    else
      perform public.veritas_start_round(p_room);
    end if;
    perform public.veritas_signal(p_room);
  end if;
end;
$$;
revoke all on function public.veritas_advance(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Funzioni per il gioco (anche ospiti: anon)
-- ---------------------------------------------------------------------------
create or replace function public.veritas_create_room(p_nickname text, p_locale text, p_rounds int default 5)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_room uuid;
  v_player uuid;
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  loop
    v_code := substr(translate(upper(encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'base64')), '+/=0O1IL', ''), 1, 6);
    exit when char_length(v_code) = 6 and not exists (select 1 from public.veritas_rooms where code = v_code);
  end loop;
  insert into public.veritas_rooms (code, locale, host_user_id, total_rounds)
  values (
    v_code,
    case when p_locale in ('it', 'en', 'fr', 'es', 'pt', 'de', 'ru') then p_locale else 'it' end,
    auth.uid(),
    least(greatest(coalesce(p_rounds, 5), 1), 10)
  )
  returning id into v_room;
  insert into public.veritas_players (room_id, token_hash, nickname, user_id)
  values (v_room, public.veritas_hash(v_token), public.veritas_unique_nickname(v_room, p_nickname), auth.uid())
  returning id into v_player;
  update public.veritas_rooms set host_player_id = v_player where id = v_room;
  return jsonb_build_object('code', v_code, 'room_id', v_room, 'player_id', v_player, 'token', v_token);
end;
$$;
revoke all on function public.veritas_create_room(text, text, int) from public;
grant execute on function public.veritas_create_room(text, text, int) to authenticated;

create or replace function public.veritas_join(p_code text, p_nickname text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.veritas_rooms%rowtype;
  v_player uuid;
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  select * into v_room from public.veritas_rooms where code = upper(trim(p_code)) for update;
  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;
  if v_room.status <> 'lobby' then
    return jsonb_build_object('error', 'started');
  end if;
  if (select count(*) from public.veritas_players where room_id = v_room.id) >= 8 then
    return jsonb_build_object('error', 'full');
  end if;
  insert into public.veritas_players (room_id, token_hash, nickname, user_id)
  values (v_room.id, public.veritas_hash(v_token), public.veritas_unique_nickname(v_room.id, p_nickname), auth.uid())
  returning id into v_player;
  perform public.veritas_signal(v_room.id);
  return jsonb_build_object('room_id', v_room.id, 'player_id', v_player, 'token', v_token);
end;
$$;
revoke all on function public.veritas_join(text, text) from public;
grant execute on function public.veritas_join(text, text) to anon, authenticated;

-- Stato della partita per il giocatore (avanza le fasi se serve).
create or replace function public.veritas_state(p_room uuid, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.veritas_player(p_room, p_token);
  v_room public.veritas_rooms%rowtype;
  v_referral text;
begin
  if v_me is null then
    return jsonb_build_object('error', 'not_player');
  end if;
  perform public.veritas_advance(p_room);
  select * into v_room from public.veritas_rooms where id = p_room;
  select referral_code into v_referral from public.profiles where id = v_room.host_user_id;

  return jsonb_build_object(
    'room_id', v_room.id,
    'code', v_room.code,
    'locale', v_room.locale,
    'status', v_room.status,
    'round', v_room.round,
    'total_rounds', v_room.total_rounds,
    'phase_ends_at', v_room.phase_ends_at,
    'server_now', now(),
    'me', v_me,
    'is_host', v_room.host_player_id = v_me,
    'host_referral', v_referral,
    'question', (select coalesce(q.texts ->> v_room.locale, q.texts ->> 'it') from public.veritas_questions q where q.id = v_room.question_id),
    'i_am_liar', v_room.status in ('writing', 'voting') and v_room.liar_player_id = v_me,
    'my_answer', (select body from public.veritas_answers where room_id = p_room and round = v_room.round and player_id = v_me),
    'my_vote_slot', (
      select s.slot from (
        select a.player_id, row_number() over (order by md5(a.player_id::text || v_room.id::text || v_room.round::text)) as slot
        from public.veritas_answers a where a.room_id = p_room and a.round = v_room.round
      ) s
      join public.veritas_votes v on v.room_id = p_room and v.round = v_room.round and v.voter_id = v_me and v.target_id = s.player_id
    ),
    'players', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id,
        'nickname', p.nickname,
        'score', p.score,
        'is_host', p.id = v_room.host_player_id,
        'answered', exists (select 1 from public.veritas_answers a where a.room_id = p_room and a.round = v_room.round and a.player_id = p.id),
        'voted', exists (select 1 from public.veritas_votes v where v.room_id = p_room and v.round = v_room.round and v.voter_id = p.id)
      ) order by p.score desc, p.joined_at), '[]'::jsonb)
      from public.veritas_players p where p.room_id = p_room
    ),
    -- Risposte anonime (in ordine mescolato) durante il voto; con autore
    -- e bugiardo solo nella rivelazione.
    'answers', case when v_room.status in ('voting', 'reveal') then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'slot', s.slot,
        'body', s.body,
        'mine', s.player_id = v_me,
        'author', case when v_room.status = 'reveal' then (select nickname from public.veritas_players where id = s.player_id) end,
        'is_liar', case when v_room.status = 'reveal' then s.player_id = v_room.liar_player_id end,
        'votes', case when v_room.status = 'reveal' then (
          select count(*) from public.veritas_votes v where v.room_id = p_room and v.round = v_room.round and v.target_id = s.player_id
        ) end
      ) order by s.slot), '[]'::jsonb)
      from (
        select a.player_id, a.body, row_number() over (order by md5(a.player_id::text || v_room.id::text || v_room.round::text)) as slot
        from public.veritas_answers a where a.room_id = p_room and a.round = v_room.round
      ) s
    ) else '[]'::jsonb end,
    'liar_nickname', case when v_room.status = 'reveal' then (select nickname from public.veritas_players where id = v_room.liar_player_id) end
  );
end;
$$;
revoke all on function public.veritas_state(uuid, text) from public;
grant execute on function public.veritas_state(uuid, text) to anon, authenticated;

create or replace function public.veritas_start(p_room uuid, p_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.veritas_player(p_room, p_token);
  v_room public.veritas_rooms%rowtype;
begin
  select * into v_room from public.veritas_rooms where id = p_room for update;
  if v_me is null or v_room.host_player_id <> v_me then
    return 'not_host';
  end if;
  if v_room.status not in ('lobby', 'finished') then
    return 'already_started';
  end if;
  if (select count(*) from public.veritas_players where room_id = p_room) < 3 then
    return 'need_players';
  end if;
  -- Nuova partita nella stessa stanza: punteggi e turni azzerati.
  update public.veritas_players set score = 0 where room_id = p_room;
  update public.veritas_rooms set round = 0 where id = p_room;
  perform public.veritas_start_round(p_room);
  perform public.veritas_signal(p_room);
  return 'ok';
end;
$$;
revoke all on function public.veritas_start(uuid, text) from public;
grant execute on function public.veritas_start(uuid, text) to anon, authenticated;

create or replace function public.veritas_answer(p_room uuid, p_token text, p_body text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.veritas_player(p_room, p_token);
  v_room public.veritas_rooms%rowtype;
begin
  if v_me is null then
    return 'not_player';
  end if;
  select * into v_room from public.veritas_rooms where id = p_room;
  if v_room.status <> 'writing' or now() > v_room.phase_ends_at + interval '3 seconds' then
    return 'closed';
  end if;
  if nullif(trim(coalesce(p_body, '')), '') is null then
    return 'empty';
  end if;
  insert into public.veritas_answers (room_id, round, player_id, body)
  values (p_room, v_room.round, v_me, left(trim(p_body), 280))
  on conflict (room_id, round, player_id) do update set body = excluded.body, created_at = now();
  perform public.veritas_signal(p_room);
  perform public.veritas_advance(p_room);
  return 'ok';
end;
$$;
revoke all on function public.veritas_answer(uuid, text, text) from public;
grant execute on function public.veritas_answer(uuid, text, text) to anon, authenticated;

create or replace function public.veritas_vote(p_room uuid, p_token text, p_slot int)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.veritas_player(p_room, p_token);
  v_room public.veritas_rooms%rowtype;
  v_target uuid;
begin
  if v_me is null then
    return 'not_player';
  end if;
  select * into v_room from public.veritas_rooms where id = p_room;
  if v_room.status <> 'voting' or now() > v_room.phase_ends_at + interval '3 seconds' then
    return 'closed';
  end if;
  if not exists (select 1 from public.veritas_answers where room_id = p_room and round = v_room.round and player_id = v_me) then
    return 'no_answer';
  end if;
  select s.player_id into v_target from (
    select a.player_id, row_number() over (order by md5(a.player_id::text || v_room.id::text || v_room.round::text)) as slot
    from public.veritas_answers a where a.room_id = p_room and a.round = v_room.round
  ) s where s.slot = p_slot;
  if v_target is null or v_target = v_me then
    return 'invalid';
  end if;
  insert into public.veritas_votes (room_id, round, voter_id, target_id)
  values (p_room, v_room.round, v_me, v_target)
  on conflict (room_id, round, voter_id) do update set target_id = excluded.target_id, created_at = now();
  perform public.veritas_signal(p_room);
  perform public.veritas_advance(p_room);
  return 'ok';
end;
$$;
revoke all on function public.veritas_vote(uuid, text, int) from public;
grant execute on function public.veritas_vote(uuid, text, int) to anon, authenticated;

-- Dal codice della stanza al suo id (per la pagina /veritas/<codice>).
create or replace function public.veritas_room_by_code(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'room_id', r.id,
    'status', r.status,
    'players', (select count(*) from public.veritas_players p where p.room_id = r.id),
    'host_nickname', (select nickname from public.veritas_players p where p.id = r.host_player_id),
    'host_referral', (select referral_code from public.profiles pr where pr.id = r.host_user_id)
  )
  from public.veritas_rooms r where r.code = upper(trim(p_code));
$$;
revoke all on function public.veritas_room_by_code(text) from public;
grant execute on function public.veritas_room_by_code(text) to anon, authenticated;

-- KU giornaliero come gli altri strumenti (+ 'veritas').
create or replace function award_tool_point(p_tool_name text)
returns table (awarded boolean, new_balance int)
security definer
set search_path = public
language plpgsql
as $$
declare
  v_today date := (now() at time zone 'Europe/Rome')::date;
  v_rows int;
  v_balance int;
begin
  if auth.uid() is null then
    return;
  end if;

  if p_tool_name not in (
    'link-in-bio', 'memolife', 'neurobalance', 'svat',
    'offermaker', 'qr-code-pro', 'life-calendar', 'findo', 'digital-receipt',
    'spendly', 'fidelity', 'kumani-cv', 'preventivi', 'menu', 'veritas'
  ) then
    return;
  end if;

  insert into daily_tool_points (user_id, tool_name, awarded_on)
  values (auth.uid(), p_tool_name, v_today)
  on conflict (user_id, tool_name, awarded_on) do nothing;

  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    select daily_points into v_balance from profiles where id = auth.uid();
    return query select false, coalesce(v_balance, 0);
    return;
  end if;

  update profiles
  set daily_points = coalesce(daily_points, 0) + 1,
      ku_earned_total = coalesce(ku_earned_total, 0) + 1
  where id = auth.uid()
  returning daily_points into v_balance;

  return query select true, v_balance;
end;
$$;

-- Domande iniziali (40, in 7 lingue; leggere e adatte a tutti). Solo se la
-- tabella è ancora vuota, così rieseguire la migrazione non le duplica.
insert into public.veritas_questions (texts)
select v.texts from (values
  ('{"it": "Qual è la cosa più strana che hai mai mangiato?", "en": "What is the strangest thing you have ever eaten?", "fr": "Quelle est la chose la plus étrange que tu aies jamais mangée ?", "es": "¿Qué es lo más raro que has comido nunca?", "pt": "Qual é a coisa mais estranha que já comeste?", "de": "Was ist das Seltsamste, das du je gegessen hast?", "ru": "Какую самую странную еду вы когда-либо пробовали?"}'::jsonb),
  ('{"it": "Qual è il posto più insolito in cui ti sei addormentato/a?", "en": "What is the most unusual place you have fallen asleep?", "fr": "Quel est l''endroit le plus insolite où tu t''es endormi(e) ?", "es": "¿Cuál es el sitio más raro donde te has quedado dormido/a?", "pt": "Qual é o sítio mais invulgar onde já adormeceste?", "de": "Was ist der ungewöhnlichste Ort, an dem du eingeschlafen bist?", "ru": "В каком самом необычном месте вы засыпали?"}'::jsonb),
  ('{"it": "Qual è la bugia più innocente che hai detto da bambino/a?", "en": "What is the most innocent lie you told as a child?", "fr": "Quel est le mensonge le plus innocent que tu aies dit enfant ?", "es": "¿Cuál es la mentira más inocente que dijiste de pequeño/a?", "pt": "Qual é a mentira mais inocente que disseste em criança?", "de": "Was war die harmloseste Lüge, die du als Kind erzählt hast?", "ru": "Какую самую невинную ложь вы сказали в детстве?"}'::jsonb),
  ('{"it": "Qual è il regalo più strano che hai ricevuto?", "en": "What is the strangest gift you have ever received?", "fr": "Quel est le cadeau le plus étrange que tu aies reçu ?", "es": "¿Cuál es el regalo más raro que has recibido?", "pt": "Qual é o presente mais estranho que já recebeste?", "de": "Was ist das seltsamste Geschenk, das du je bekommen hast?", "ru": "Какой самый странный подарок вы получали?"}'::jsonb),
  ('{"it": "Qual è la cosa più coraggiosa che hai fatto?", "en": "What is the bravest thing you have ever done?", "fr": "Quelle est la chose la plus courageuse que tu aies faite ?", "es": "¿Qué es lo más valiente que has hecho?", "pt": "Qual é a coisa mais corajosa que já fizeste?", "de": "Was ist das Mutigste, das du je getan hast?", "ru": "Какой самый смелый поступок вы совершали?"}'::jsonb),
  ('{"it": "Qual è stato il tuo primo lavoretto?", "en": "What was your first little job?", "fr": "Quel a été ton premier petit boulot ?", "es": "¿Cuál fue tu primer trabajillo?", "pt": "Qual foi o teu primeiro biscate?", "de": "Was war dein erster Nebenjob?", "ru": "Какой была ваша первая подработка?"}'::jsonb),
  ('{"it": "Qual è la figuraccia più divertente che ricordi?", "en": "What is the funniest embarrassing moment you remember?", "fr": "Quel est le moment gênant le plus drôle dont tu te souviens ?", "es": "¿Cuál es el momento más ridículo y divertido que recuerdas?", "pt": "Qual é a situação embaraçosa mais divertida de que te lembras?", "de": "Was ist der lustigste peinliche Moment, an den du dich erinnerst?", "ru": "Какой самый смешной конфуз вы помните?"}'::jsonb),
  ('{"it": "Qual è l''hobby più insolito che hai provato?", "en": "What is the most unusual hobby you have tried?", "fr": "Quel est le loisir le plus insolite que tu aies essayé ?", "es": "¿Cuál es la afición más rara que has probado?", "pt": "Qual é o passatempo mais invulgar que já experimentaste?", "de": "Was ist das ungewöhnlichste Hobby, das du ausprobiert hast?", "ru": "Какое самое необычное хобби вы пробовали?"}'::jsonb),
  ('{"it": "Qual è il viaggio più avventuroso che hai fatto?", "en": "What is the most adventurous trip you have taken?", "fr": "Quel est le voyage le plus aventureux que tu aies fait ?", "es": "¿Cuál es el viaje más aventurero que has hecho?", "pt": "Qual é a viagem mais aventureira que já fizeste?", "de": "Was war deine abenteuerlichste Reise?", "ru": "Какое путешествие было самым приключенческим?"}'::jsonb),
  ('{"it": "Qual è la cosa più strana che hai collezionato?", "en": "What is the strangest thing you have collected?", "fr": "Quelle est la chose la plus étrange que tu aies collectionnée ?", "es": "¿Qué es lo más raro que has coleccionado?", "pt": "Qual é a coisa mais estranha que já colecionaste?", "de": "Was ist das Seltsamste, das du je gesammelt hast?", "ru": "Что самое странное вы коллекционировали?"}'::jsonb),
  ('{"it": "Quale talento nascosto hai?", "en": "What hidden talent do you have?", "fr": "Quel talent caché as-tu ?", "es": "¿Qué talento oculto tienes?", "pt": "Que talento escondido tens?", "de": "Welches verborgene Talent hast du?", "ru": "Какой у вас скрытый талант?"}'::jsonb),
  ('{"it": "Qual è il soprannome più buffo che ti hanno dato?", "en": "What is the funniest nickname you have been given?", "fr": "Quel est le surnom le plus drôle qu''on t''ait donné ?", "es": "¿Cuál es el apodo más gracioso que te han puesto?", "pt": "Qual é a alcunha mais engraçada que já te deram?", "de": "Was ist der lustigste Spitzname, den du je hattest?", "ru": "Какое самое смешное прозвище у вас было?"}'::jsonb),
  ('{"it": "Qual è stato il tuo animale domestico più particolare?", "en": "What was your most unusual pet?", "fr": "Quel a été ton animal de compagnie le plus original ?", "es": "¿Cuál ha sido tu mascota más peculiar?", "pt": "Qual foi o teu animal de estimação mais peculiar?", "de": "Was war dein ungewöhnlichstes Haustier?", "ru": "Какой питомец у вас был самым необычным?"}'::jsonb),
  ('{"it": "Qual è la cosa più spontanea che hai fatto?", "en": "What is the most spontaneous thing you have done?", "fr": "Quelle est la chose la plus spontanée que tu aies faite ?", "es": "¿Qué es lo más espontáneo que has hecho?", "pt": "Qual é a coisa mais espontânea que já fizeste?", "de": "Was ist das Spontanste, das du je gemacht hast?", "ru": "Какой самый спонтанный поступок вы совершали?"}'::jsonb),
  ('{"it": "Qual è il film che hai visto più volte?", "en": "Which film have you watched the most times?", "fr": "Quel film as-tu vu le plus de fois ?", "es": "¿Qué película has visto más veces?", "pt": "Qual é o filme que viste mais vezes?", "de": "Welchen Film hast du am häufigsten gesehen?", "ru": "Какой фильм вы смотрели больше всего раз?"}'::jsonb),
  ('{"it": "Qual è la cosa più strana che hai trovato per strada?", "en": "What is the strangest thing you have found in the street?", "fr": "Quelle est la chose la plus étrange que tu aies trouvée dans la rue ?", "es": "¿Qué es lo más raro que has encontrado en la calle?", "pt": "Qual é a coisa mais estranha que já encontraste na rua?", "de": "Was ist das Seltsamste, das du auf der Straße gefunden hast?", "ru": "Что самое странное вы находили на улице?"}'::jsonb),
  ('{"it": "Qual è il piatto che cucini meglio?", "en": "What is the dish you cook best?", "fr": "Quel est le plat que tu cuisines le mieux ?", "es": "¿Cuál es el plato que mejor cocinas?", "pt": "Qual é o prato que cozinhas melhor?", "de": "Welches Gericht kochst du am besten?", "ru": "Какое блюдо вы готовите лучше всего?"}'::jsonb),
  ('{"it": "Quale persona famosa hai incontrato?", "en": "Which famous person have you met?", "fr": "Quelle personne célèbre as-tu rencontrée ?", "es": "¿A qué persona famosa has conocido?", "pt": "Que pessoa famosa já conheceste?", "de": "Welche berühmte Person hast du getroffen?", "ru": "С какой знаменитостью вы встречались?"}'::jsonb),
  ('{"it": "Qual è la tua paura più buffa?", "en": "What is your silliest fear?", "fr": "Quelle est ta peur la plus drôle ?", "es": "¿Cuál es tu miedo más gracioso?", "pt": "Qual é o teu medo mais engraçado?", "de": "Was ist deine lustigste Angst?", "ru": "Какой ваш самый забавный страх?"}'::jsonb),
  ('{"it": "Qual è la cosa più insolita che hai comprato online?", "en": "What is the most unusual thing you have bought online?", "fr": "Quelle est la chose la plus insolite que tu aies achetée en ligne ?", "es": "¿Qué es lo más raro que has comprado por internet?", "pt": "Qual é a coisa mais invulgar que compraste online?", "de": "Was ist das Ungewöhnlichste, das du online gekauft hast?", "ru": "Что самое необычное вы покупали в интернете?"}'::jsonb),
  ('{"it": "Qual è stato il tuo primo concerto?", "en": "What was your first concert?", "fr": "Quel a été ton premier concert ?", "es": "¿Cuál fue tu primer concierto?", "pt": "Qual foi o teu primeiro concerto?", "de": "Was war dein erstes Konzert?", "ru": "Каким был ваш первый концерт?"}'::jsonb),
  ('{"it": "Qual è la tradizione di famiglia più particolare?", "en": "What is your most unusual family tradition?", "fr": "Quelle est ta tradition familiale la plus originale ?", "es": "¿Cuál es la tradición familiar más peculiar que tenéis?", "pt": "Qual é a tradição de família mais peculiar?", "de": "Was ist eure ungewöhnlichste Familientradition?", "ru": "Какая семейная традиция у вас самая необычная?"}'::jsonb),
  ('{"it": "Qual è la cosa più strana che hai fatto per vincere una scommessa?", "en": "What is the strangest thing you have done to win a bet?", "fr": "Quelle est la chose la plus étrange que tu aies faite pour gagner un pari ?", "es": "¿Qué es lo más raro que has hecho para ganar una apuesta?", "pt": "Qual é a coisa mais estranha que fizeste para ganhar uma aposta?", "de": "Was ist das Seltsamste, das du für eine Wette getan hast?", "ru": "Что самое странное вы делали, чтобы выиграть спор?"}'::jsonb),
  ('{"it": "Che lavoro sognavi di fare da bambino/a?", "en": "What job did you dream of doing as a child?", "fr": "Quel métier rêvais-tu de faire enfant ?", "es": "¿En qué soñabas trabajar de pequeño/a?", "pt": "Que profissão sonhavas ter em criança?", "de": "Welchen Beruf wolltest du als Kind ergreifen?", "ru": "Кем вы мечтали стать в детстве?"}'::jsonb),
  ('{"it": "Qual è il posto più bello in cui hai visto un tramonto?", "en": "Where is the most beautiful place you have watched a sunset?", "fr": "Quel est le plus bel endroit où tu as vu un coucher de soleil ?", "es": "¿Cuál es el sitio más bonito donde has visto una puesta de sol?", "pt": "Qual é o sítio mais bonito onde viste um pôr do sol?", "de": "Wo hast du den schönsten Sonnenuntergang gesehen?", "ru": "Где вы видели самый красивый закат?"}'::jsonb),
  ('{"it": "Qual era la regola più strana a casa tua da piccolo/a?", "en": "What was the strangest rule at home when you were little?", "fr": "Quelle était la règle la plus étrange chez toi quand tu étais petit(e) ?", "es": "¿Cuál era la norma más rara en tu casa de pequeño/a?", "pt": "Qual era a regra mais estranha em casa quando eras pequeno/a?", "de": "Was war die seltsamste Regel bei dir zu Hause als Kind?", "ru": "Какое самое странное правило было у вас дома в детстве?"}'::jsonb),
  ('{"it": "Qual è lo sport più insolito che hai praticato?", "en": "What is the most unusual sport you have played?", "fr": "Quel est le sport le plus insolite que tu aies pratiqué ?", "es": "¿Cuál es el deporte más raro que has practicado?", "pt": "Qual é o desporto mais invulgar que já praticaste?", "de": "Was ist die ungewöhnlichste Sportart, die du betrieben hast?", "ru": "Каким самым необычным спортом вы занимались?"}'::jsonb),
  ('{"it": "Qual è la notte più lunga che hai passato senza dormire?", "en": "What is the longest night you have spent without sleeping?", "fr": "Quelle est la plus longue nuit que tu aies passée sans dormir ?", "es": "¿Cuál es la noche más larga que has pasado sin dormir?", "pt": "Qual foi a noite mais longa que passaste sem dormir?", "de": "Was war die längste Nacht, die du ohne Schlaf verbracht hast?", "ru": "Какая самая долгая бессонная ночь у вас была?"}'::jsonb),
  ('{"it": "Qual è il complimento più strano che hai ricevuto?", "en": "What is the strangest compliment you have received?", "fr": "Quel est le compliment le plus étrange que tu aies reçu ?", "es": "¿Cuál es el cumplido más raro que has recibido?", "pt": "Qual é o elogio mais estranho que já recebeste?", "de": "Was ist das seltsamste Kompliment, das du bekommen hast?", "ru": "Какой самый странный комплимент вы получали?"}'::jsonb),
  ('{"it": "Qual è stato il tuo travestimento di Carnevale più riuscito?", "en": "What was your best fancy-dress costume?", "fr": "Quel a été ton meilleur déguisement ?", "es": "¿Cuál fue tu mejor disfraz de Carnaval?", "pt": "Qual foi a tua melhor máscara de Carnaval?", "de": "Was war dein gelungenstes Faschingskostüm?", "ru": "Какой ваш карнавальный костюм был самым удачным?"}'::jsonb),
  ('{"it": "Qual è la cosa più strana che hai fatto in vacanza?", "en": "What is the strangest thing you have done on holiday?", "fr": "Quelle est la chose la plus étrange que tu aies faite en vacances ?", "es": "¿Qué es lo más raro que has hecho en vacaciones?", "pt": "Qual é a coisa mais estranha que fizeste nas férias?", "de": "Was ist das Seltsamste, das du im Urlaub gemacht hast?", "ru": "Что самое странное вы делали в отпуске?"}'::jsonb),
  ('{"it": "Qual è l''oggetto più vecchio che conservi ancora?", "en": "What is the oldest object you still keep?", "fr": "Quel est l''objet le plus ancien que tu gardes encore ?", "es": "¿Cuál es el objeto más antiguo que aún conservas?", "pt": "Qual é o objeto mais antigo que ainda guardas?", "de": "Was ist der älteste Gegenstand, den du noch aufbewahrst?", "ru": "Какая самая старая вещь, которую вы до сих пор храните?"}'::jsonb),
  ('{"it": "Qual è la canzone che canti sotto la doccia?", "en": "Which song do you sing in the shower?", "fr": "Quelle chanson chantes-tu sous la douche ?", "es": "¿Qué canción cantas en la ducha?", "pt": "Que canção cantas no duche?", "de": "Welches Lied singst du unter der Dusche?", "ru": "Какую песню вы поёте в душе?"}'::jsonb),
  ('{"it": "Qual è la cosa più difficile che hai imparato da solo/a?", "en": "What is the hardest thing you have taught yourself?", "fr": "Quelle est la chose la plus difficile que tu aies apprise seul(e) ?", "es": "¿Qué es lo más difícil que has aprendido por tu cuenta?", "pt": "Qual é a coisa mais difícil que aprendeste sozinho/a?", "de": "Was ist das Schwierigste, das du dir selbst beigebracht hast?", "ru": "Чему самому сложному вы научились сами?"}'::jsonb),
  ('{"it": "Qual è l''incontro più incredibile che hai fatto per caso?", "en": "What is the most incredible chance encounter you have had?", "fr": "Quelle est la rencontre la plus incroyable que tu aies faite par hasard ?", "es": "¿Cuál es el encuentro casual más increíble que has tenido?", "pt": "Qual foi o encontro por acaso mais incrível que tiveste?", "de": "Was war deine unglaublichste zufällige Begegnung?", "ru": "Какая случайная встреча была самой невероятной?"}'::jsonb),
  ('{"it": "Qual è stato il tuo peggior taglio di capelli?", "en": "What was your worst haircut?", "fr": "Quelle a été ta pire coupe de cheveux ?", "es": "¿Cuál ha sido tu peor corte de pelo?", "pt": "Qual foi o teu pior corte de cabelo?", "de": "Was war dein schlimmster Haarschnitt?", "ru": "Какая у вас была самая неудачная стрижка?"}'::jsonb),
  ('{"it": "Qual è la cosa più strana che hai fatto per un amico?", "en": "What is the strangest thing you have done for a friend?", "fr": "Quelle est la chose la plus étrange que tu aies faite pour un ami ?", "es": "¿Qué es lo más raro que has hecho por un amigo?", "pt": "Qual é a coisa mais estranha que fizeste por um amigo?", "de": "Was ist das Seltsamste, das du für einen Freund getan hast?", "ru": "Что самое странное вы делали ради друга?"}'::jsonb),
  ('{"it": "Qual è il cibo che proprio non riesci a mangiare?", "en": "What food can you just not eat?", "fr": "Quel aliment n''arrives-tu vraiment pas à manger ?", "es": "¿Qué comida no puedes comer de ninguna manera?", "pt": "Que comida não consegues mesmo comer?", "de": "Welches Essen kannst du einfach nicht essen?", "ru": "Какую еду вы совсем не можете есть?"}'::jsonb),
  ('{"it": "Qual è la cosa più bella che hai creato con le tue mani?", "en": "What is the most beautiful thing you have made with your hands?", "fr": "Quelle est la plus belle chose que tu aies créée de tes mains ?", "es": "¿Qué es lo más bonito que has creado con tus manos?", "pt": "Qual é a coisa mais bonita que criaste com as tuas mãos?", "de": "Was ist das Schönste, das du mit deinen Händen gemacht hast?", "ru": "Что самое красивое вы сделали своими руками?"}'::jsonb),
  ('{"it": "Di quale record personale vai più fiero/a?", "en": "Which personal record are you proudest of?", "fr": "De quel record personnel es-tu le plus fier (la plus fière) ?", "es": "¿De qué récord personal estás más orgulloso/a?", "pt": "De que recorde pessoal tens mais orgulho?", "de": "Auf welchen persönlichen Rekord bist du am stolzesten?", "ru": "Каким личным рекордом вы гордитесь больше всего?"}'::jsonb)
) as v(texts)
where not exists (select 1 from public.veritas_questions);
