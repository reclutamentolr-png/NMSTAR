-- Fase 3 piani Base/Pro:
--   1. prova Pro gratuita (15 giorni, una sola volta per account);
--   2. extra Pro sul ringraziamento a chi invita (invitato diretto che paga Pro);
--   3. coupon per negozianti Base o Pro.

-- ---------------------------------------------------------------------------
-- 1. Prova Pro
-- ---------------------------------------------------------------------------
insert into public.system_settings (key, value)
values ('pro_trial_days', '15')
on conflict (key) do nothing;

-- Avvia la prova Pro per l'utente collegato. Una sola volta per account
-- (pro_trial_ends_at resta valorizzato anche dopo la scadenza) e non per chi
-- è già Pro. La colonna non è modificabile dal browser: solo da qui.
create or replace function public.start_pro_trial()
returns table (status text, trial_ends_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_used timestamptz;
  v_days int;
  v_end timestamptz;
begin
  if v_uid is null then
    return query select 'not_authenticated'::text, null::timestamptz;
    return;
  end if;

  select p.pro_trial_ends_at into v_used from public.profiles p where p.id = v_uid;
  if not found then
    return query select 'not_authenticated'::text, null::timestamptz;
    return;
  end if;
  if public.plan_of(v_uid) = 'pro' then
    return query select 'already_pro'::text, v_used;
    return;
  end if;
  if v_used is not null then
    return query select 'already_used'::text, v_used;
    return;
  end if;

  v_days := coalesce(nullif(public.setting_text('pro_trial_days'), '')::int, 15);
  v_end := now() + make_interval(days => greatest(v_days, 1));

  update public.profiles p set pro_trial_ends_at = v_end
  where p.id = v_uid and p.pro_trial_ends_at is null;
  if not found then
    return query select 'already_used'::text, v_used;
    return;
  end if;

  return query select 'ok'::text, v_end;
end;
$$;
revoke all on function public.start_pro_trial() from public, anon;
grant execute on function public.start_pro_trial() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Extra Pro per chi invita
-- ---------------------------------------------------------------------------
-- Si aggiunge al normale Bonus Struttura (10 punti) quando un invitato
-- diretto paga il piano Pro con carta: 10 + 20 = circa 30 punti, in
-- proporzione al prezzo (149 € contro 49 €). Pagato una sola volta per
-- invitato (la tabella registra chi è già stato pagato).
insert into public.system_settings (key, value)
values ('pro_invite_extra_points', '20')
on conflict (key) do nothing;

create table if not exists public.pro_invite_bonus_paid (
  child_id uuid primary key references public.profiles(id) on delete cascade,
  sponsor_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null,
  paid_at timestamptz not null default now()
);
create index if not exists pro_invite_bonus_paid_sponsor_idx on public.pro_invite_bonus_paid(sponsor_id);
alter table public.pro_invite_bonus_paid enable row level security;
-- Nessuna policy: si legge e si scrive solo dalle funzioni qui sotto.

create or replace function public.claim_pro_invite_bonus()
returns table (awarded integer, new_network_points integer)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_rate int;
  v_new int;
  v_balance int;
begin
  if v_uid is null then
    return;
  end if;

  v_rate := coalesce(nullif(public.setting_text('pro_invite_extra_points'), '')::int, 20);
  if v_rate <= 0 then
    return query select 0, coalesce((select network_points from profiles where id = v_uid), 0);
    return;
  end if;

  with inserted as (
    insert into public.pro_invite_bonus_paid (child_id, sponsor_id, points)
    select p.id, v_uid, v_rate
    from public.profiles p
    where p.sponsor_id = v_uid
      and p.subscription_status = 'active'
      and p.subscription_source = 'stripe'
      and p.subscription_plan = 'pro'
      and (p.subscription_expires_at is null or p.subscription_expires_at > now())
    on conflict (child_id) do nothing
    returning 1
  )
  select count(*) into v_new from inserted;

  if v_new = 0 then
    return query select 0, coalesce((select network_points from profiles where id = v_uid), 0);
    return;
  end if;

  update public.profiles
  set network_points = coalesce(network_points, 0) + v_new * v_rate
  where id = v_uid
  returning network_points into v_balance;

  return query select v_new * v_rate, v_balance;
end;
$$;
revoke all on function public.claim_pro_invite_bonus() from public, anon;
grant execute on function public.claim_pro_invite_bonus() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Coupon per negozianti Base o Pro
-- ---------------------------------------------------------------------------
alter table public.voucher_batches
  add column if not exists plan text not null default 'base' check (plan in ('base', 'pro'));

-- Come prima, più il piano: i coupon di un lotto Pro attivano il Pro; quelli
-- Base (e i coupon della community, senza lotto) attivano il Base, senza mai
-- declassare chi ha già un Pro attivo. Codice letto senza spazi e in
-- maiuscolo, come in voucher_code_is_valid.
create or replace function public.redeem_subscription_voucher(p_code text)
returns table (success boolean, reason text, new_expires_at timestamptz)
security definer
set search_path = public
language plpgsql
as $$
declare
  v_id uuid;
  v_created_by uuid;
  v_status text;
  v_plan text;
  v_expires timestamptz;
begin
  if auth.uid() is null then
    return;
  end if;

  select v.id, v.created_by, v.status, coalesce(b.plan, 'base')
  into v_id, v_created_by, v_status, v_plan
  from subscription_vouchers v
  left join voucher_batches b on b.id = v.batch_id
  where v.code = upper(trim(p_code));

  if v_id is null then
    return query select false, 'not_found', null::timestamptz;
    return;
  end if;

  if v_created_by = auth.uid() then
    return query select false, 'self_redemption', null::timestamptz;
    return;
  end if;

  if v_status <> 'active' then
    return query select false, 'already_used', null::timestamptz;
    return;
  end if;

  update subscription_vouchers
  set status = 'redeemed', redeemed_by = auth.uid(), redeemed_at = now()
  where id = v_id and status = 'active';

  if not found then
    return query select false, 'already_used', null::timestamptz;
    return;
  end if;

  v_expires := now() + interval '1 year';

  update profiles p
  set subscription_status = 'active',
      subscription_expires_at = v_expires,
      subscription_source = 'voucher',
      subscription_plan = case
        when v_plan = 'pro' then 'pro'
        when p.subscription_plan = 'pro' and p.subscription_status = 'active'
          and (p.subscription_expires_at is null or p.subscription_expires_at > now()) then 'pro'
        else 'base'
      end
  where p.id = auth.uid();

  return query select true, null::text, v_expires;
end;
$$;

grant execute on function public.redeem_subscription_voucher(text) to authenticated;
