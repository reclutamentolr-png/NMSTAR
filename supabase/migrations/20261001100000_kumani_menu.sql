-- KUMANI Menu — Fase 1: menù digitale del locale (strumento Pro).
-- Un menù per utente; categorie e piatti con testi per lingua (jsonb
-- {"it": "...", "en": "..."}). Il nome del piatto resta quello originale
-- (colonna name); names contiene solo eventuali traduzioni del nome.
-- La pagina pubblica /m/<token> legge tutto con get_public_menu(), che
-- risponde solo se il menù è acceso e il proprietario ha ancora il Pro.

create table if not exists public.menus (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  restaurant_name text not null check (char_length(restaurant_name) between 1 and 80),
  tagline text check (char_length(tagline) <= 140),
  token text not null unique default substr(md5(gen_random_uuid()::text), 1, 10),
  template text not null default 'elegante' check (template in ('elegante')),
  currency text not null default 'EUR' check (currency in ('EUR')),
  default_locale text not null default 'it' check (default_locale in ('it', 'en', 'fr', 'es', 'pt', 'de', 'ru')),
  languages text[] not null default '{it}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus(id) on delete cascade,
  position integer not null default 0,
  names jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists menu_categories_menu_idx on public.menu_categories(menu_id, position);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus(id) on delete cascade,
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  position integer not null default 0,
  name text not null check (char_length(name) between 1 and 120),
  names jsonb not null default '{}'::jsonb,
  descriptions jsonb not null default '{}'::jsonb,
  price numeric(10, 2) check (price is null or price >= 0),
  diet_tags text[] not null default '{}',
  -- Allergeni UE (Reg. 1169/2011): usati dalla Fase 2.
  allergens text[] not null default '{}',
  available boolean not null default true,
  is_daily_special boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists menu_items_category_idx on public.menu_items(category_id, position);
create index if not exists menu_items_menu_idx on public.menu_items(menu_id);

-- Solo il proprietario legge e modifica i propri dati.
alter table public.menus enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;

create policy menus_owner_all on public.menus
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy menu_categories_owner_all on public.menu_categories
  for all to authenticated
  using (exists (select 1 from public.menus m where m.id = menu_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from public.menus m where m.id = menu_id and m.owner_id = auth.uid()));

create policy menu_items_owner_all on public.menu_items
  for all to authenticated
  using (exists (select 1 from public.menus m where m.id = menu_id and m.owner_id = auth.uid()))
  with check (
    exists (select 1 from public.menus m where m.id = menu_id and m.owner_id = auth.uid())
    and exists (select 1 from public.menu_categories c where c.id = category_id and c.menu_id = menu_items.menu_id)
  );

-- Il token del link pubblico lo genera il database: dal browser si
-- scrivono solo le colonne di contenuto.
revoke insert, update on public.menus from anon, authenticated;
grant insert (owner_id, restaurant_name, tagline, default_locale, languages) on public.menus to authenticated;
grant update (restaurant_name, tagline, default_locale, languages, is_active, updated_at) on public.menus to authenticated;

-- Menù pubblico (QR al tavolo): leggibile da chiunque, solo se acceso e
-- se il proprietario può ancora usare lo strumento (piano Pro attivo).
create or replace function public.get_public_menu(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'restaurant_name', m.restaurant_name,
    'tagline', m.tagline,
    'template', m.template,
    'currency', m.currency,
    'default_locale', m.default_locale,
    'languages', to_jsonb(m.languages),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'names', c.names,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', i.id,
            'name', i.name,
            'names', i.names,
            'descriptions', i.descriptions,
            'price', i.price,
            'diet_tags', to_jsonb(i.diet_tags),
            'available', i.available,
            'is_daily_special', i.is_daily_special
          ) order by i.position, i.created_at)
          from public.menu_items i where i.category_id = c.id
        ), '[]'::jsonb)
      ) order by c.position, c.created_at)
      from public.menu_categories c where c.menu_id = m.id
    ), '[]'::jsonb)
  )
  from public.menus m
  where m.token = lower(trim(p_token))
    and m.is_active
    and exists (select 1 from public.tool_access(m.owner_id, 'menu') ta where ta.allowed);
$$;
revoke all on function public.get_public_menu(text) from public;
grant execute on function public.get_public_menu(text) to anon, authenticated;

-- Strumento nel Marketplace: piano Pro.
insert into public.marketplace_settings (tool_name, is_enabled, required_plan)
values ('menu', true, 'pro')
on conflict (tool_name) do nothing;

-- KU giornaliero come gli altri strumenti (stessa funzione, + 'menu').
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
    'spendly', 'fidelity', 'kumani-cv', 'preventivi', 'menu'
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
