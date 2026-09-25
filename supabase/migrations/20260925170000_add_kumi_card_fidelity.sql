-- KUMANI Fidelity (Kumi Card) — fase 1.
--
-- Tessera timbri digitale per i commercianti abbonati. Il cliente non si
-- registra: la sua tessera è un token segreto (link /f/[token]) ricordato
-- dal suo browser. Il timbro NON lo può mettere il cliente da solo:
--   A) "Dai timbro" in modalità cassa genera un QR usa e getta (1 uso,
--      ~60s); il cliente lo inquadra e riceve il timbro;
--   B) in alternativa il negozio inquadra il QR personale della tessera
--      del cliente (member_code).
-- La consegna del premio segue gli stessi due percorsi.
--
-- Tutte le scritture passano da server action con service role; le
-- funzioni qui sotto sono eseguibili solo dal service role e fanno le
-- operazioni in modo atomico (lock di riga), così un QR non può essere
-- usato due volte nemmeno con richieste simultanee.

create table if not exists public.fidelity_cards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  business_name text not null check (char_length(business_name) between 1 and 80),
  prize text not null check (char_length(prize) between 1 and 120),
  stamps_needed integer not null default 10 check (stamps_needed between 2 and 30),
  min_hours_between_stamps integer not null default 24 check (min_hours_between_stamps between 0 and 168),
  -- "salt:hash" scrypt, calcolato lato server: il PIN in chiaro non è mai salvato.
  pin_hash text not null,
  pin_failed_attempts integer not null default 0,
  pin_locked_until timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fidelity_members (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.fidelity_cards(id) on delete cascade,
  -- Segreto: chi ha il token vede la tessera (è il link del cliente).
  token text not null unique,
  -- Pubblico: il QR/codice che il cliente mostra in cassa (percorso B).
  -- Da solo non permette di timbrare: serve la modalità cassa del negozio.
  member_code text not null unique,
  stamps_count integer not null default 0 check (stamps_count >= 0),
  total_stamps integer not null default 0,
  rewards_redeemed integer not null default 0,
  last_stamp_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.fidelity_events (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.fidelity_cards(id) on delete cascade,
  member_id uuid not null references public.fidelity_members(id) on delete cascade,
  kind text not null check (kind in ('stamp', 'redeem')),
  quantity integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.fidelity_claims (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.fidelity_cards(id) on delete cascade,
  code text not null unique,
  kind text not null check (kind in ('stamp', 'redeem')),
  quantity integer not null default 1 check (quantity between 1 and 5),
  expires_at timestamptz not null,
  used_at timestamptz,
  -- Ultimo esito negativo (es. too_soon): la cassa lo mostra invece di
  -- restare in attesa fino alla scadenza del QR.
  last_status text,
  member_id uuid references public.fidelity_members(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Dispositivi cassa sbloccati con il PIN (es. tablet dei dipendenti senza
-- account): il cookie contiene un segreto, qui solo il suo hash.
create table if not exists public.fidelity_cassa_sessions (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.fidelity_cards(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_fid_members_card on public.fidelity_members(card_id);
create index if not exists idx_fid_events_card_created on public.fidelity_events(card_id, created_at);
create index if not exists idx_fid_claims_card on public.fidelity_claims(card_id);
create index if not exists idx_fid_sessions_card on public.fidelity_cassa_sessions(card_id);

alter table public.fidelity_cards enable row level security;
alter table public.fidelity_members enable row level security;
alter table public.fidelity_events enable row level security;
alter table public.fidelity_claims enable row level security;
alter table public.fidelity_cassa_sessions enable row level security;

-- Il commerciante legge solo i propri dati. Nessuna policy di scrittura:
-- tutto passa dalle server action (service role). Claims e sessioni cassa
-- non hanno policy: non sono mai leggibili da un client.
create policy fidelity_cards_owner_select on public.fidelity_cards
  for select using (auth.uid() = owner_id);
create policy fidelity_members_owner_select on public.fidelity_members
  for select using (exists (select 1 from public.fidelity_cards c where c.id = card_id and c.owner_id = auth.uid()));
create policy fidelity_events_owner_select on public.fidelity_events
  for select using (exists (select 1 from public.fidelity_cards c where c.id = card_id and c.owner_id = auth.uid()));

-- Stessa regola di isActiveSubscription() in src/lib/subscriptionGate.ts.
create or replace function public.user_has_active_subscription(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles pr
    where pr.id = p_user_id
      and pr.subscription_status = 'active'
      and (pr.subscription_expires_at is null or pr.subscription_expires_at > now())
  );
$$;

-- Applica un timbro o la consegna del premio a una tessera cliente.
-- Stati: ok · redeemed · too_soon · full · not_full · inactive · not_found
create or replace function public.fidelity_apply(p_card_id uuid, p_member_id uuid, p_kind text, p_quantity integer)
returns table (status text, stamps_count integer, stamps_needed integer, next_stamp_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_card public.fidelity_cards;
  v_member public.fidelity_members;
  v_new integer;
begin
  select * into v_card from public.fidelity_cards where id = p_card_id;
  if v_card.id is null then
    return query select 'not_found'::text, 0, 0, null::timestamptz; return;
  end if;
  -- Tessera disattivata o abbonamento del negozio scaduto: niente timbri.
  if not v_card.is_active or not public.user_has_active_subscription(v_card.owner_id) then
    return query select 'inactive'::text, 0, v_card.stamps_needed, null::timestamptz; return;
  end if;

  select * into v_member from public.fidelity_members m
  where m.id = p_member_id and m.card_id = p_card_id
  for update;
  if v_member.id is null then
    return query select 'not_found'::text, 0, v_card.stamps_needed, null::timestamptz; return;
  end if;

  if p_kind = 'stamp' then
    if v_member.stamps_count >= v_card.stamps_needed then
      return query select 'full'::text, v_member.stamps_count, v_card.stamps_needed, null::timestamptz; return;
    end if;
    if v_card.min_hours_between_stamps > 0 and v_member.last_stamp_at is not null
       and v_member.last_stamp_at > now() - make_interval(hours => v_card.min_hours_between_stamps) then
      return query select 'too_soon'::text, v_member.stamps_count, v_card.stamps_needed,
        v_member.last_stamp_at + make_interval(hours => v_card.min_hours_between_stamps);
      return;
    end if;

    v_new := least(v_member.stamps_count + greatest(p_quantity, 1), v_card.stamps_needed);
    update public.fidelity_members
      set stamps_count = v_new,
          total_stamps = total_stamps + (v_new - v_member.stamps_count),
          last_stamp_at = now()
      where id = v_member.id;
    insert into public.fidelity_events (card_id, member_id, kind, quantity)
      values (p_card_id, v_member.id, 'stamp', v_new - v_member.stamps_count);
    return query select 'ok'::text, v_new, v_card.stamps_needed, null::timestamptz; return;
  end if;

  -- p_kind = 'redeem'
  if v_member.stamps_count < v_card.stamps_needed then
    return query select 'not_full'::text, v_member.stamps_count, v_card.stamps_needed, null::timestamptz; return;
  end if;
  update public.fidelity_members
    set stamps_count = stamps_count - v_card.stamps_needed,
        rewards_redeemed = rewards_redeemed + 1
    where id = v_member.id;
  insert into public.fidelity_events (card_id, member_id, kind, quantity)
    values (p_card_id, v_member.id, 'redeem', 1);
  return query select 'redeemed'::text, v_member.stamps_count - v_card.stamps_needed, v_card.stamps_needed, null::timestamptz;
end;
$$;

-- Il cliente ha inquadrato un QR usa e getta. p_tokens = le tessere già
-- ricordate dal suo browser (per ritrovare quella di questo negozio);
-- p_new_token/p_new_member_code servono solo se è il primo timbro e la
-- tessera va creata. Il QR viene consumato solo se l'operazione riesce
-- (un "too_soon" non lo brucia: scade da solo).
-- Stati extra: invalid · used · expired · no_card
create or replace function public.fidelity_use_claim(
  p_code text,
  p_tokens text[],
  p_new_token text,
  p_new_member_code text
)
returns table (status text, member_token text, kind text, stamps_count integer, stamps_needed integer, next_stamp_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_claim public.fidelity_claims;
  v_member_id uuid;
  v_token text;
  v_res record;
begin
  select * into v_claim from public.fidelity_claims c where c.code = p_code for update;
  if v_claim.id is null then
    return query select 'invalid'::text, null::text, null::text, 0, 0, null::timestamptz; return;
  end if;
  if v_claim.used_at is not null then
    return query select 'used'::text, null::text, v_claim.kind, 0, 0, null::timestamptz; return;
  end if;
  if v_claim.expires_at < now() then
    return query select 'expired'::text, null::text, v_claim.kind, 0, 0, null::timestamptz; return;
  end if;

  select m.id, m.token into v_member_id, v_token
  from public.fidelity_members m
  where m.card_id = v_claim.card_id and m.token = any(coalesce(p_tokens, '{}'))
  order by m.created_at
  limit 1;

  if v_member_id is null then
    if v_claim.kind = 'redeem' then
      update public.fidelity_claims set last_status = 'no_card' where id = v_claim.id;
      return query select 'no_card'::text, null::text, v_claim.kind, 0, 0, null::timestamptz; return;
    end if;
    insert into public.fidelity_members (card_id, token, member_code)
      values (v_claim.card_id, p_new_token, p_new_member_code)
      returning id, token into v_member_id, v_token;
  end if;

  select * into v_res from public.fidelity_apply(v_claim.card_id, v_member_id, v_claim.kind, v_claim.quantity);

  if v_res.status in ('ok', 'redeemed') then
    update public.fidelity_claims set used_at = now(), member_id = v_member_id, last_status = v_res.status where id = v_claim.id;
  else
    update public.fidelity_claims set last_status = v_res.status, member_id = v_member_id where id = v_claim.id;
  end if;

  return query select v_res.status, v_token, v_claim.kind, v_res.stamps_count, v_res.stamps_needed, v_res.next_stamp_at;
end;
$$;

revoke all on function public.fidelity_apply(uuid, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.fidelity_use_claim(text, text[], text, text) from public, anon, authenticated;
grant execute on function public.fidelity_apply(uuid, uuid, text, integer) to service_role;
grant execute on function public.fidelity_use_claim(text, text[], text, text) to service_role;
grant execute on function public.user_has_active_subscription(uuid) to authenticated, service_role;

-- Punto KU giornaliero anche per la Kumi Card (uso quotidiano in cassa):
-- stessa funzione di 20260924130000_add_spendly.sql con 'fidelity' in lista.
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
    'spendly', 'fidelity'
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

  UPDATE profiles SET daily_points = COALESCE(daily_points, 0) + 1
  WHERE id = auth.uid()
  RETURNING daily_points INTO v_balance;

  RETURN QUERY SELECT true, v_balance;
END;
$$;
