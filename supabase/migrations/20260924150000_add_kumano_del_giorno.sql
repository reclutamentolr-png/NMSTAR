-- Kumano del Giorno: vetrina community, un profilo "in vetrina" al giorno,
-- selezione deterministica senza cron (si "accende" alla prima visita della
-- giornata via get_todays_kumano()). Opt-in esplicito, niente dati di
-- contatto pubblici, niente indirizzi.

create table if not exists public.spotlight_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  city text,
  country text,
  profession text,
  story text not null check (char_length(story) <= 400),
  favorite_tools text[] not null default '{}',
  is_opted_in boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- Registro dei giorni: chi è stato in vetrina (evita ripetizioni ravvicinate).
create table if not exists public.spotlight_days (
  day date primary key,
  profile_id uuid not null references public.spotlight_profiles(id) on delete cascade
);

create index if not exists idx_spot_optin on public.spotlight_profiles(is_opted_in);
create index if not exists idx_spot_days_profile on public.spotlight_days(profile_id);

alter table public.spotlight_profiles enable row level security;
alter table public.spotlight_days enable row level security;

-- Il profilo è pubblico solo se opted-in (la card è pensata per essere
-- vista da chiunque); il proprietario vede/gestisce sempre il proprio,
-- anche da disattivato.
create policy spotlight_profiles_select_public on public.spotlight_profiles
  for select using (is_opted_in = true);
create policy spotlight_profiles_select_own on public.spotlight_profiles
  for select using (auth.uid() = user_id);
create policy spotlight_profiles_insert_own on public.spotlight_profiles
  for insert with check (auth.uid() = user_id);
create policy spotlight_profiles_update_own on public.spotlight_profiles
  for update using (auth.uid() = user_id);
create policy spotlight_profiles_delete_own on public.spotlight_profiles
  for delete using (auth.uid() = user_id);

-- Il registro dei giorni è di sola lettura pubblica; la scrittura avviene
-- solo tramite get_todays_kumano() (security definer), mai da un client.
create policy spotlight_days_select_public on public.spotlight_days
  for select using (true);

-- Restituisce il Kumano di oggi, selezionandolo (e fissandolo per il resto
-- della giornata) se non è già stato scelto — nessun cron: la prima
-- visita della giornata innesca la selezione. Selezione deterministica
-- (hash del giorno+profilo: stesso risultato per chiunque chieda "oggi"),
-- esclude chi è stato in vetrina negli ultimi 90 giorni; se il pool si
-- esaurisce, ricicla il meno recente.
create or replace function public.get_todays_kumano()
returns public.spotlight_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_result public.spotlight_profiles;
begin
  select profile_id into v_profile_id from public.spotlight_days where day = current_date;

  if v_profile_id is null then
    select p.id into v_profile_id
    from public.spotlight_profiles p
    where p.is_opted_in = true
      and not exists (
        select 1 from public.spotlight_days d
        where d.profile_id = p.id and d.day > current_date - interval '90 days'
      )
    order by md5(p.id::text || current_date::text)
    limit 1;

    if v_profile_id is null then
      select p.id into v_profile_id
      from public.spotlight_profiles p
      left join public.spotlight_days d on d.profile_id = p.id
      where p.is_opted_in = true
      group by p.id
      order by max(d.day) asc nulls first
      limit 1;
    end if;

    if v_profile_id is not null then
      insert into public.spotlight_days (day, profile_id) values (current_date, v_profile_id)
      on conflict (day) do nothing;
      select profile_id into v_profile_id from public.spotlight_days where day = current_date;
    end if;
  end if;

  if v_profile_id is null then
    return null;
  end if;

  select * into v_result from public.spotlight_profiles where id = v_profile_id;
  return v_result;
end;
$$;

grant execute on function public.get_todays_kumano() to anon, authenticated;
