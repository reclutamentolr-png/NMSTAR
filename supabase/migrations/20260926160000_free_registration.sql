-- Registrazione libera (senza codice invito) + "ringraziamento attività".
--
-- - Iscrizione e posizionamento in matrice avvengono sul server, in
--   complete_registration() (prima li faceva il browser: poteva mettersi
--   dove voleva, scaricava l'intera matrice e due iscrizioni simultanee
--   potevano prendere lo stesso posto).
-- - Il codice invito diventa facoltativo. Chi si iscrive senza invito ha
--   come sponsor l'account KUMANI (system_settings.house_account_id) e
--   viene posizionato nella SUA struttura: le matrici dei singoli restano
--   costruite solo dagli inviti veri.
-- - A chi si iscrive senza invito viene abbinato un Kumano attivo
--   (stessa città → stesso paese → chiunque, rotazione equa): riceve un
--   "ringraziamento attività" (activity_thanks_points, default 3 Punti
--   Rete) SOLO quando l'iscritto paga davvero il primo abbonamento.
-- - Gli iscritti senza invito non generano il bonus spillover di posto.

alter table public.profiles
  add column if not exists signup_source text not null default 'invite'
    check (signup_source in ('invite', 'direct')),
  add column if not exists activity_thanks_to uuid references public.profiles(id) on delete set null,
  add column if not exists activity_thanks_paid_at timestamptz;

create index if not exists idx_profiles_activity_thanks_to on public.profiles(activity_thanks_to)
  where activity_thanks_to is not null;

insert into public.system_settings (key, value) values ('activity_thanks_points', '3')
on conflict (key) do nothing;

-- I valori in system_settings vengono salvati dal pannello admin come JSON
-- (una stringa diventa "\"...\""): helper che toglie le virgolette.
create or replace function public.setting_text(p_key text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(trim(both '"' from value), '') from public.system_settings where key = p_key;
$$;
revoke all on function public.setting_text(text) from public, anon, authenticated;

-- Kumano attivo da abbinare a chi si iscrive senza invito.
-- Attivo = abbonamento valido, visto sulla piattaforma negli ultimi 7
-- giorni, non bloccato, già in matrice. Priorità: stessa città, poi stesso
-- paese, poi chiunque; a parità, chi ha ricevuto meno abbinamenti negli
-- ultimi 30 giorni (rotazione equa), con un tetto di 5 al mese a persona.
create or replace function public.pick_activity_kumano(p_city text, p_country text, p_exclude uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  with house as (
    select public.setting_text('house_account_id') as id
  ),
  candidates as (
    select
      p.id,
      case
        when nullif(trim(p_city), '') is not null and lower(trim(p.city)) = lower(trim(p_city)) then 1
        when p.country_code = p_country then 2
        else 3
      end as tier,
      (select count(*) from public.profiles x
        where x.activity_thanks_to = p.id and x.created_at > now() - interval '30 days') as recent
    from public.profiles p
    join public.matrix_nodes n on n.user_id = p.id
    where p.id <> p_exclude
      and p.id::text is distinct from (select id from house)
      and coalesce(p.is_blocked, false) = false
      and coalesce(p.is_active, true) = true
      and p.subscription_status = 'active'
      and (p.subscription_expires_at is null or p.subscription_expires_at > now())
      and p.last_seen > now() - interval '7 days'
  )
  select id from candidates
  where recent < 5
  order by tier, recent, random()
  limit 1;
$$;
revoke all on function public.pick_activity_kumano(text, text, uuid) from public, anon, authenticated;

-- Codice invito nel formato storico PAESE-0000000-X, univoco.
create or replace function public.new_referral_code(p_country text)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_code text;
begin
  loop
    v_code := upper(coalesce(nullif(left(p_country, 2), ''), 'IT')) || '-'
      || lpad((floor(random() * 10000000))::int::text, 7, '0') || '-'
      || chr(65 + floor(random() * 26)::int);
    exit when not exists (select 1 from public.profiles where referral_code = v_code);
  end loop;
  return v_code;
end;
$$;
revoke all on function public.new_referral_code(text) from public, anon, authenticated;

-- Posiziona un utente nella matrice sotto la struttura di p_sponsor_id.
-- Stessa regola usata finora dal browser: se lo sponsor ha un posto libero
-- (1-5) va lì, altrimenti si scende nel ramo con meno persone in totale (a
-- parità, il più a sinistra) finché non si trova un posto libero.
create or replace function public.place_in_matrix(p_user_id uuid, p_sponsor_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_node public.matrix_nodes;
  v_child record;
  v_best_id uuid;
  v_best_size int;
  v_size int;
  v_pos int;
  v_new_id uuid;
begin
  select id into v_new_id from public.matrix_nodes where user_id = p_user_id;
  if v_new_id is not null then
    return v_new_id;
  end if;

  -- Un solo posizionamento alla volta: niente posti contesi.
  perform pg_advisory_xact_lock(hashtext('kumani_matrix_placement'));

  select * into v_node from public.matrix_nodes where user_id = p_sponsor_id;
  if v_node.id is null then
    return null;
  end if;

  loop
    exit when (select count(*) from public.matrix_nodes where parent_id = v_node.id) < 5;
    v_best_id := null;
    v_best_size := null;
    for v_child in
      select id, path from public.matrix_nodes where parent_id = v_node.id order by "position"
    loop
      select count(*) into v_size from public.matrix_nodes where path <@ v_child.path;
      if v_best_size is null or v_size < v_best_size then
        v_best_id := v_child.id;
        v_best_size := v_size;
      end if;
    end loop;
    select * into v_node from public.matrix_nodes where id = v_best_id;
  end loop;

  select min(p) into v_pos
  from generate_series(1, 5) p
  where p not in (select "position" from public.matrix_nodes where parent_id = v_node.id);

  insert into public.matrix_nodes (user_id, parent_id, path, level, "position", depth)
  values (
    p_user_id,
    v_node.id,
    v_node.path || text2ltree(v_pos::text),
    v_node.level + 1,
    v_pos,
    nlevel(v_node.path)
  )
  returning id into v_new_id;
  return v_new_id;
end;
$$;
revoke all on function public.place_in_matrix(uuid, uuid) from public, anon, authenticated;

-- Completa la registrazione dell'utente autenticato (email già verificata):
-- crea profilo e posto in matrice. Idempotente (una seconda chiamata dopo
-- un errore a metà non duplica nulla).
-- Esiti: ok · invalid_referral · direct_unavailable · not_authenticated · error
create or replace function public.complete_registration(
  p_first_name text,
  p_last_name text,
  p_country text,
  p_city text,
  p_referral_code text
)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_code text := upper(trim(coalesce(p_referral_code, '')));
  v_sponsor uuid;
  v_source text;
  v_house uuid;
  v_thanks_to uuid;
  v_house_node uuid;
begin
  if v_uid is null then
    return 'not_authenticated';
  end if;

  -- Profilo già creato: si completa solo il posto in matrice, se manca.
  select sponsor_id into v_sponsor from public.profiles where id = v_uid;
  if found then
    if not exists (select 1 from public.matrix_nodes where user_id = v_uid) and v_sponsor is not null then
      perform public.place_in_matrix(v_uid, v_sponsor);
    end if;
    return 'ok';
  end if;

  begin
    v_house := public.setting_text('house_account_id')::uuid;
  exception when others then
    v_house := null;
  end;

  if v_code <> '' then
    select id into v_sponsor from public.profiles
    where referral_code = v_code and coalesce(is_active, true) = true;
    if v_sponsor is null then
      return 'invalid_referral';
    end if;
    v_source := 'invite';
  else
    if v_house is null or not exists (select 1 from public.profiles where id = v_house) then
      return 'direct_unavailable';
    end if;
    v_sponsor := v_house;
    v_source := 'direct';
    v_thanks_to := public.pick_activity_kumano(p_city, p_country, v_uid);
  end if;

  select email into v_email from auth.users where id = v_uid;

  insert into public.profiles (
    id, email, username, first_name, last_name, country_code, city,
    referral_code, subscription_status, date_of_birth, sponsor_id,
    signup_source, activity_thanks_to
  ) values (
    v_uid,
    v_email,
    split_part(coalesce(v_email, 'kumano'), '@', 1) || '_' || floor(random() * 10000)::int,
    left(trim(p_first_name), 80),
    left(trim(p_last_name), 80),
    upper(left(trim(p_country), 2)),
    nullif(left(trim(coalesce(p_city, '')), 80), ''),
    public.new_referral_code(p_country),
    'free',
    '2000-01-01',
    v_sponsor,
    v_source,
    v_thanks_to
  );

  -- L'account KUMANI senza un posto in matrice diventa una radice propria.
  if v_source = 'direct' and not exists (select 1 from public.matrix_nodes where user_id = v_house) then
    insert into public.matrix_nodes (user_id, parent_id, path, level, "position", depth)
    values (v_house, null, text2ltree('root.' || replace(v_house::text, '-', '_')), 1, 1, 0)
    returning id into v_house_node;
  end if;

  if public.place_in_matrix(v_uid, v_sponsor) is null then
    -- Sponsor senza posto in matrice (dato storico incompleto): si va nella
    -- struttura dell'account KUMANI, se configurato.
    if v_house is not null and v_house <> v_sponsor then
      perform public.place_in_matrix(v_uid, v_house);
    end if;
  end if;

  return 'ok';
end;
$$;
revoke all on function public.complete_registration(text, text, text, text, text) from public, anon;
grant execute on function public.complete_registration(text, text, text, text, text) to authenticated;

-- Profilo e matrice ora si creano solo dal server: dal browser niente più
-- inserimenti diretti (prima ci si poteva posizionare dove si voleva).
drop policy if exists users_insert_own_profile on public.profiles;
drop policy if exists users_insert_own_matrix_node on public.matrix_nodes;

-- Ringraziamento attività: al Kumano abbinato, per ogni iscritto senza
-- invito che ha pagato davvero (Stripe) e non è ancora stato ringraziato.
-- Stesso schema idempotente degli altri claim_* (chiamato al caricamento
-- della dashboard).
create or replace function public.claim_activity_thanks()
returns table (awarded integer, new_network_points integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rate int;
  v_count int;
  v_balance int;
begin
  if auth.uid() is null then
    return;
  end if;

  v_rate := coalesce(nullif(public.setting_text('activity_thanks_points'), '')::int, 3);

  with paid as (
    update public.profiles p
    set activity_thanks_paid_at = now()
    where p.activity_thanks_to = auth.uid()
      and p.activity_thanks_paid_at is null
      and p.subscription_status = 'active'
      and p.subscription_source = 'stripe'
      and (p.subscription_expires_at is null or p.subscription_expires_at > now())
    returning p.id
  )
  select count(*) into v_count from paid;

  if v_count = 0 or v_rate <= 0 then
    select coalesce(network_points, 0) into v_balance from public.profiles where id = auth.uid();
    return query select 0, v_balance;
    return;
  end if;

  update public.profiles
  set network_points = coalesce(network_points, 0) + v_count * v_rate
  where id = auth.uid()
  returning network_points into v_balance;

  return query select v_count * v_rate, v_balance;
end;
$$;
revoke all on function public.claim_activity_thanks() from public, anon;
grant execute on function public.claim_activity_thanks() to authenticated;

-- Bonus di posto in matrice: chi si iscrive senza invito non conta come
-- "spillover" per nessuno (sta nella struttura dell'account KUMANI).
create or replace function public.claim_matrix_slot_bonus()
returns table (success boolean, awarded integer, direct_slots_paid integer, spillover_slots_paid integer, new_network_points integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_my_node_id uuid;
  v_active_direct int;
  v_active_spillover int;
  v_already_direct int;
  v_already_spillover int;
  v_new_direct int;
  v_new_spillover int;
  v_rate_direct int;
  v_rate_spillover int;
  v_awarded int;
  v_balance int;
begin
  if auth.uid() is null then
    return;
  end if;

  select id into v_my_node_id from matrix_nodes where user_id = auth.uid();
  if v_my_node_id is null then
    return query select false, 0, 0, 0, coalesce((select network_points from profiles where id = auth.uid()), 0);
    return;
  end if;

  select
    count(*) filter (where p.sponsor_id = auth.uid()),
    count(*) filter (where p.sponsor_id is distinct from auth.uid() and p.signup_source <> 'direct')
  into v_active_direct, v_active_spillover
  from matrix_nodes child
  join profiles p on p.id = child.user_id
  where child.parent_id = v_my_node_id
    and p.subscription_status = 'active'
    and p.subscription_source = 'stripe'
    and (p.subscription_expires_at is null or p.subscription_expires_at > now());

  select coalesce(matrix_bonus_direct_slots_paid, 0), coalesce(matrix_bonus_spillover_slots_paid, 0)
  into v_already_direct, v_already_spillover
  from profiles where id = auth.uid();

  v_new_direct := greatest(v_active_direct - v_already_direct, 0);
  v_new_spillover := greatest(v_active_spillover - v_already_spillover, 0);

  if v_new_direct = 0 and v_new_spillover = 0 then
    select coalesce(network_points, 0) into v_balance from profiles where id = auth.uid();
    return query select false, 0, v_already_direct, v_already_spillover, v_balance;
    return;
  end if;

  select coalesce(nullif(value, '')::int, 5) into v_rate_direct
  from system_settings where key = 'matrix_slot_bonus_points';
  v_rate_direct := coalesce(v_rate_direct, 5);

  select coalesce(nullif(value, '')::int, 5) into v_rate_spillover
  from system_settings where key = 'matrix_spillover_bonus_points';
  v_rate_spillover := coalesce(v_rate_spillover, 5);

  v_awarded := v_new_direct * v_rate_direct + v_new_spillover * v_rate_spillover;

  update profiles
  set
    network_points = coalesce(network_points, 0) + v_awarded,
    matrix_bonus_direct_slots_paid = greatest(v_active_direct, v_already_direct),
    matrix_bonus_spillover_slots_paid = greatest(v_active_spillover, v_already_spillover)
  where id = auth.uid()
    and coalesce(matrix_bonus_direct_slots_paid, 0) = v_already_direct
    and coalesce(matrix_bonus_spillover_slots_paid, 0) = v_already_spillover
  returning network_points into v_balance;

  if not found then
    select coalesce(network_points, 0) into v_balance from profiles where id = auth.uid();
    return query select false, 0, v_already_direct, v_already_spillover, v_balance;
    return;
  end if;

  return query select true, v_awarded, greatest(v_active_direct, v_already_direct), greatest(v_active_spillover, v_already_spillover), v_balance;
end;
$$;
grant execute on function public.claim_matrix_slot_bonus() to authenticated;
