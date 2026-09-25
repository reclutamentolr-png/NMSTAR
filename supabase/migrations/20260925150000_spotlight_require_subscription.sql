-- Kumano del Giorno riservato agli abbonati attivi.
--
-- Il vincolo sta nella rotazione (non solo nel form): chi scrive la storia
-- da abbonato e poi lascia scadere l'abbonamento esce da solo da
-- dashboard, /spotlight, archivio e home; al rinnovo rientra senza dover
-- riscrivere né far riapprovare la storia (il trigger di moderazione
-- rimette pending solo se cambia il contenuto).

-- Stessa regola di isActiveSubscription() in src/lib/subscriptionGate.ts:
-- status 'active' e, se c'è una scadenza, non ancora passata. Security
-- definer perché la usa anche la policy pubblica (anon non legge profiles).
create or replace function public.spotlight_owner_has_active_subscription(p_user_id uuid)
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

grant execute on function public.spotlight_owner_has_active_subscription(uuid) to anon, authenticated;

-- Archivio /spotlight e letture pubbliche: anche qui solo abbonati attivi.
drop policy if exists spotlight_profiles_select_public on public.spotlight_profiles;
create policy spotlight_profiles_select_public on public.spotlight_profiles
  for select using (
    is_opted_in = true
    and moderation_status = 'approved'
    and public.spotlight_owner_has_active_subscription(user_id)
  );

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
  select d.profile_id into v_profile_id
  from public.spotlight_days d
  join public.spotlight_profiles p on p.id = d.profile_id
  where d.day = current_date
    and p.is_opted_in = true
    and p.moderation_status = 'approved'
    and public.spotlight_owner_has_active_subscription(p.user_id);

  if v_profile_id is null then
    delete from public.spotlight_days where day = current_date;

    select p.id into v_profile_id
    from public.spotlight_profiles p
    where p.is_opted_in = true
      and p.moderation_status = 'approved'
      and public.spotlight_owner_has_active_subscription(p.user_id)
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
        and p.moderation_status = 'approved'
        and public.spotlight_owner_has_active_subscription(p.user_id)
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

create or replace function public.get_home_kumano(p_min_pool integer default 10)
returns table (
  display_name text,
  city text,
  country text,
  profession text,
  story text,
  story_locale text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pool integer;
  v_today public.spotlight_profiles;
begin
  select count(*) into v_pool
  from public.spotlight_profiles p
  where p.is_opted_in = true and p.show_on_home = true and p.moderation_status = 'approved'
    and public.spotlight_owner_has_active_subscription(p.user_id);

  if v_pool < greatest(p_min_pool, 1) then
    return;
  end if;

  v_today := public.get_todays_kumano();
  if v_today.id is not null and v_today.show_on_home = true then
    return query select v_today.display_name, v_today.city, v_today.country, v_today.profession, v_today.story, v_today.story_locale;
    return;
  end if;

  return query
  select p.display_name, p.city, p.country, p.profession, p.story, p.story_locale
  from public.spotlight_profiles p
  where p.is_opted_in = true and p.show_on_home = true and p.moderation_status = 'approved'
    and public.spotlight_owner_has_active_subscription(p.user_id)
  order by md5(p.id::text || current_date::text)
  limit 1;
end;
$$;

grant execute on function public.get_home_kumano(integer) to anon, authenticated;
