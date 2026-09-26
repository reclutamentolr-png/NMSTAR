-- KUMANI Menu — Fase 2: allergeni nel menù pubblico, link recensioni e
-- collegamento con la Kumi Card del locale.

alter table public.menus
  add column if not exists review_url text check (review_url is null or review_url ~* '^https?://');
grant update (review_url) on public.menus to authenticated;

-- Allergeni ammessi: i 14 del Reg. UE 1169/2011 (Allegato II).
alter table public.menu_items drop constraint if exists menu_items_allergens_valid;
alter table public.menu_items add constraint menu_items_allergens_valid check (
  allergens <@ array['gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soy', 'milk', 'nuts',
                     'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs']::text[]
);

-- Menù pubblico, ora con allergeni, link recensioni (quello del menù o, se
-- vuoto, quello della Kumi Card) e premio della Kumi Card se attiva.
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
