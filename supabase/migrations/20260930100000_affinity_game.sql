-- Affinity — Fase 1: il gioco.
-- Si salva solo la Mappa di Affinità (5 valori da 0 a 1) e l'archetipo,
-- mai le singole risposte. La mappa si cancella in un clic (delete della
-- riga) e sparisce anche con l'account (on delete cascade).

create table if not exists public.affinity_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  map jsonb not null,
  archetype text not null check (archetype in ('faro', 'marea', 'bosco', 'brace', 'vento')),
  -- Codice del link "Gioca in Duo" (/affinity/duo/<codice>): chi lo apre
  -- vede solo nome, archetipo e mappa di chi l'ha condiviso.
  duo_code text not null unique default substr(md5(gen_random_uuid()::text), 1, 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint affinity_map_valid check (
    jsonb_typeof(map) = 'object'
    and (map ->> 'valori')::numeric between 0 and 1
    and (map ->> 'ritmo')::numeric between 0 and 1
    and (map ->> 'curiosita')::numeric between 0 and 1
    and (map ->> 'calore')::numeric between 0 and 1
    and (map ->> 'avventura')::numeric between 0 and 1
  )
);

alter table public.affinity_profiles enable row level security;

create policy affinity_profiles_owner_select on public.affinity_profiles
  for select to authenticated using (user_id = auth.uid());
create policy affinity_profiles_owner_insert on public.affinity_profiles
  for insert to authenticated with check (user_id = auth.uid());
create policy affinity_profiles_owner_update on public.affinity_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy affinity_profiles_owner_delete on public.affinity_profiles
  for delete to authenticated using (user_id = auth.uid());

-- Dal browser si scrivono solo mappa e archetipo (il codice Duo lo genera
-- il database).
revoke insert, update on public.affinity_profiles from anon, authenticated;
grant insert (user_id, map, archetype) on public.affinity_profiles to authenticated;
grant update (map, archetype, updated_at) on public.affinity_profiles to authenticated;
grant select, delete on public.affinity_profiles to authenticated;

-- Link Duo: dati minimi di chi ha condiviso, leggibili anche senza account.
create or replace function public.get_affinity_duo(p_code text)
returns table (first_name text, archetype text, map jsonb, referral_code text)
language sql
stable
security definer
set search_path = public
as $$
  select p.first_name, a.archetype, a.map, p.referral_code
  from public.affinity_profiles a
  join public.profiles p on p.id = a.user_id
  where a.duo_code = lower(trim(p_code));
$$;
revoke all on function public.get_affinity_duo(text) from public;
grant execute on function public.get_affinity_duo(text) to anon, authenticated;

-- Strumento nel Marketplace: gratuito per tutti gli iscritti (l'admin può
-- cambiarlo da Admin → Marketplace).
insert into public.marketplace_settings (tool_name, is_enabled, required_plan)
values ('affinity', true, 'free')
on conflict (tool_name) do nothing;
