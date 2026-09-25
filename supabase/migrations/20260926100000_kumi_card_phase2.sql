-- KUMANI Fidelity (Kumi Card) — fase 2.
--
-- 1. Recupero tessera: email del cliente verificata con codice (Brevo),
--    facoltativa; con la stessa email si ritrovano le tessere su un altro
--    telefono.
-- 2. Scadenza timbri facoltativa (giorni senza timbri): azzeramento pigro
--    dentro fidelity_apply, nessun cron. Le tessere complete non scadono.
-- 3. "Ti manca poco": consenso marketing separato, telefono facoltativo
--    per WhatsApp, promemoria email (manuali e automatici giornalieri).
-- 4. Statistiche: nessuno schema nuovo, derivate da fidelity_events.
-- 5. Timbro bonus recensione: link recensione del negozio, un solo bonus
--    per tessera, dato dalla cassa dopo aver visto la recensione.

alter table public.fidelity_cards
  add column if not exists stamps_expire_days integer check (stamps_expire_days is null or stamps_expire_days between 30 and 730),
  add column if not exists review_url text check (review_url is null or review_url ~* '^https?://'),
  add column if not exists auto_reminders boolean not null default false,
  add column if not exists reminder_threshold integer not null default 2 check (reminder_threshold between 1 and 5);

alter table public.fidelity_members
  add column if not exists locale text,
  add column if not exists customer_name text check (customer_name is null or char_length(customer_name) <= 60),
  add column if not exists contact_email text,
  add column if not exists email_verified_at timestamptz,
  add column if not exists contact_phone text check (contact_phone is null or contact_phone ~ '^\+?[0-9]{6,15}$'),
  add column if not exists marketing_consent boolean not null default false,
  add column if not exists marketing_consent_at timestamptz,
  add column if not exists review_bonus_at timestamptz,
  add column if not exists last_reminder_at timestamptz;

create index if not exists idx_fid_members_email on public.fidelity_members (lower(contact_email)) where email_verified_at is not null;

alter table public.fidelity_events drop constraint if exists fidelity_events_kind_check;
alter table public.fidelity_events add constraint fidelity_events_kind_check
  check (kind in ('stamp', 'redeem', 'review_bonus', 'expire'));

alter table public.fidelity_claims drop constraint if exists fidelity_claims_kind_check;
alter table public.fidelity_claims add constraint fidelity_claims_kind_check
  check (kind in ('stamp', 'redeem', 'review'));

-- Codici di verifica email (collegamento email alla tessera e recupero).
-- Solo hash del codice; nessuna policy: accessibile solo dal service role.
create table if not exists public.fidelity_email_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  purpose text not null check (purpose in ('verify', 'recover')),
  member_id uuid references public.fidelity_members(id) on delete cascade,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_fid_email_codes_email on public.fidelity_email_codes (lower(email), created_at);
alter table public.fidelity_email_codes enable row level security;

-- fidelity_apply con scadenza timbri e timbro bonus recensione.
-- Stati extra: review_done · review_disabled
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
  if not v_card.is_active or not public.user_has_active_subscription(v_card.owner_id) then
    return query select 'inactive'::text, 0, v_card.stamps_needed, null::timestamptz; return;
  end if;

  select * into v_member from public.fidelity_members m
  where m.id = p_member_id and m.card_id = p_card_id
  for update;
  if v_member.id is null then
    return query select 'not_found'::text, 0, v_card.stamps_needed, null::timestamptz; return;
  end if;

  -- Scadenza pigra: troppo tempo senza timbri → si riparte da zero (le
  -- tessere già complete non scadono: il premio guadagnato resta).
  if v_card.stamps_expire_days is not null
     and v_member.stamps_count > 0
     and v_member.stamps_count < v_card.stamps_needed
     and v_member.last_stamp_at is not null
     and v_member.last_stamp_at < now() - make_interval(days => v_card.stamps_expire_days) then
    insert into public.fidelity_events (card_id, member_id, kind, quantity)
      values (p_card_id, v_member.id, 'expire', v_member.stamps_count);
    update public.fidelity_members set stamps_count = 0 where id = v_member.id;
    v_member.stamps_count := 0;
  end if;

  if p_kind = 'review' then
    if v_card.review_url is null then
      return query select 'review_disabled'::text, v_member.stamps_count, v_card.stamps_needed, null::timestamptz; return;
    end if;
    if v_member.review_bonus_at is not null then
      return query select 'review_done'::text, v_member.stamps_count, v_card.stamps_needed, null::timestamptz; return;
    end if;
    if v_member.stamps_count >= v_card.stamps_needed then
      return query select 'full'::text, v_member.stamps_count, v_card.stamps_needed, null::timestamptz; return;
    end if;
    -- Il bonus non conta come visita: niente regola delle ore minime e
    -- last_stamp_at invariato (non blocca il timbro dell'acquisto).
    update public.fidelity_members
      set stamps_count = stamps_count + 1,
          total_stamps = total_stamps + 1,
          review_bonus_at = now()
      where id = v_member.id;
    insert into public.fidelity_events (card_id, member_id, kind, quantity)
      values (p_card_id, v_member.id, 'review_bonus', 1);
    return query select 'ok'::text, v_member.stamps_count + 1, v_card.stamps_needed, null::timestamptz; return;
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

-- fidelity_use_claim: ora salva anche la lingua del cliente sulle tessere
-- nuove (per le email nella sua lingua) e accetta il QR "bonus recensione",
-- che come il timbro può creare la tessera al primo contatto.
drop function if exists public.fidelity_use_claim(text, text[], text, text);
create or replace function public.fidelity_use_claim(
  p_code text,
  p_tokens text[],
  p_new_token text,
  p_new_member_code text,
  p_locale text
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
    insert into public.fidelity_members (card_id, token, member_code, locale)
      values (v_claim.card_id, p_new_token, p_new_member_code, p_locale)
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
revoke all on function public.fidelity_use_claim(text, text[], text, text, text) from public, anon, authenticated;
grant execute on function public.fidelity_apply(uuid, uuid, text, integer) to service_role;
grant execute on function public.fidelity_use_claim(text, text[], text, text, text) to service_role;
