-- Coupon di attivazione venduti ai negozianti (lotti di voucher).
--
-- Un lotto = N codici voucher (subscription_vouchers, stesso formato KVA-…,
-- un anno di abbonamento, usa e getta) venduti a un'attività, che li regala
-- ai propri clienti. Il cliente può inserire il codice direttamente nella
-- registrazione (o via QR del cartoncino: /register?voucher=CODICE).
-- L'unicità d'uso resta garantita da redeem_subscription_voucher().

create table if not exists public.voucher_batches (
  id uuid primary key default gen_random_uuid(),
  business_name text not null check (char_length(business_name) between 1 and 120),
  quantity integer not null check (quantity between 1 and 500),
  price_eur numeric(10, 2) check (price_eur is null or price_eur >= 0),
  invoice_ref text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.voucher_batches enable row level security;
-- Nessuna policy: lotti visibili e gestibili solo dal server (admin).

alter table public.subscription_vouchers
  add column if not exists batch_id uuid references public.voucher_batches(id) on delete set null;
create index if not exists subscription_vouchers_batch_idx on public.subscription_vouchers (batch_id);

-- Verifica anticipata nel modulo di registrazione (prima che l'account
-- esista): dice solo se il codice è utilizzabile, senza esporre altro.
create or replace function public.voucher_code_is_valid(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscription_vouchers
    where code = upper(trim(p_code)) and status = 'active'
  );
$$;
revoke all on function public.voucher_code_is_valid(text) from public;
grant execute on function public.voucher_code_is_valid(text) to anon, authenticated;
