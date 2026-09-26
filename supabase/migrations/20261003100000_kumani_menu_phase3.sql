-- KUMANI Menu — Fase 3: altri stili, foto dei piatti, traduzione AI.

-- 1. Stili del menù pubblico
alter table public.menus drop constraint if exists menus_template_check;
alter table public.menus add constraint menus_template_check
  check (template in ('elegante', 'trattoria', 'bistro', 'marina'));
grant update (template) on public.menus to authenticated;

-- 2. Foto dei piatti: bucket pubblico, caricamento solo dal server (service
-- role) dopo il controllo del piano. Percorso <owner_id>/<file>.
alter table public.menu_items add column if not exists photo_path text
  check (photo_path is null or photo_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]+$');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-photos', 'menu-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- 3. Traduzioni AI: contatore giornaliero per utente (costo sotto
-- controllo). Solo server: nessuna policy.
create table if not exists public.menu_ai_usage (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  used_on date not null,
  runs integer not null default 0,
  primary key (owner_id, used_on)
);
alter table public.menu_ai_usage enable row level security;

insert into public.system_settings (key, value)
values ('menu_ai_daily_runs', '5')
on conflict (key) do nothing;

-- 4. Menù pubblico con stile e foto.
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
    'review_url', coalesce(m.review_url, fc.review_url),
    'fidelity', case when fc.id is not null
      then jsonb_build_object('prize', fc.prize, 'stamps_needed', fc.stamps_needed) end,
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
            'allergens', to_jsonb(i.allergens),
            'photo_path', i.photo_path,
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
  left join public.fidelity_cards fc on fc.owner_id = m.owner_id and fc.is_active
  where m.token = lower(trim(p_token))
    and m.is_active
    and exists (select 1 from public.tool_access(m.owner_id, 'menu') ta where ta.allowed);
$$;
revoke all on function public.get_public_menu(text) from public;
grant execute on function public.get_public_menu(text) to anon, authenticated;
