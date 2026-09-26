-- Affinity: aggiornamenti in tempo reale senza ricaricare la pagina.
-- Quando arriva un messaggio o cambia una presentazione, il database manda
-- un segnale leggero (Supabase Realtime Broadcast) sul canale privato
-- "affinity:<id utente>" delle persone coinvolte. Il segnale non contiene
-- dati: la pagina, ricevuto il segnale, rilegge con le funzioni protette.

-- Ognuno può ascoltare solo il proprio canale.
drop policy if exists affinity_own_channel on realtime.messages;
create policy affinity_own_channel on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() = 'affinity:' || auth.uid()::text
  );

create or replace function public.affinity_signal(p_user uuid, p_event text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform realtime.send(jsonb_build_object('at', now()), p_event, 'affinity:' || p_user::text, true);
exception when others then
  -- Un segnale perso non deve mai bloccare il salvataggio: la pagina ha
  -- comunque un controllo di riserva.
  null;
end;
$$;
revoke all on function public.affinity_signal(uuid, text) from public, anon, authenticated;

-- Nuovo messaggio: segnale a entrambi (anche a chi scrive, per gli altri
-- suoi dispositivi aperti).
create or replace function public.affinity_messages_signal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a uuid;
  v_b uuid;
begin
  select user_a, user_b into v_a, v_b from public.affinity_intros where id = new.intro_id;
  perform public.affinity_signal(v_a, 'message');
  perform public.affinity_signal(v_b, 'message');
  return new;
end;
$$;
drop trigger if exists affinity_messages_signal on public.affinity_messages;
create trigger affinity_messages_signal after insert on public.affinity_messages
  for each row execute function public.affinity_messages_signal();

-- Nuova presentazione o nuova risposta: segnale a entrambi.
create or replace function public.affinity_intros_signal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.affinity_signal(new.user_a, 'intro');
  perform public.affinity_signal(new.user_b, 'intro');
  return new;
end;
$$;
drop trigger if exists affinity_intros_signal on public.affinity_intros;
create trigger affinity_intros_signal
  after insert or update of a_response, b_response on public.affinity_intros
  for each row execute function public.affinity_intros_signal();

-- Novità per il pallino in dashboard: messaggi non letti dai match e
-- presentazioni di questa settimana ancora senza risposta.
create or replace function public.affinity_badge()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'unread_messages', (
      select count(*) from public.affinity_messages m
      join public.affinity_intros i on i.id = m.intro_id
      where auth.uid() in (i.user_a, i.user_b)
        and m.sender_id <> auth.uid()
        and m.read_at is null
        and i.a_response = 'yes' and i.b_response = 'yes'
        and not public.affinity_is_blocked(i.user_a, i.user_b)
    ),
    'pending_intros', (
      select count(*) from public.affinity_intros i
      where i.week = date_trunc('week', now())::date
        and ((i.user_a = auth.uid() and i.a_response is null) or (i.user_b = auth.uid() and i.b_response is null))
        and not public.affinity_is_blocked(i.user_a, i.user_b)
    )
  );
$$;
revoke all on function public.affinity_badge() from public, anon;
grant execute on function public.affinity_badge() to authenticated;
