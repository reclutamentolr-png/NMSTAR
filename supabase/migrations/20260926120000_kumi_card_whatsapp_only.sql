-- Kumi Card: niente servizi esterni (Brevo rimosso).
--
-- - Il recupero della tessera non passa più dall'email: il cliente si
--   salva/manda il link della tessera (WhatsApp, condivisione, copia).
-- - I promemoria "ti manca poco" sono solo messaggi WhatsApp inviati dal
--   commerciante ai clienti che hanno raggiunto una certa percentuale dei
--   timbri (default 80%), con il consenso del cliente. Nessun invio
--   automatico.

drop table if exists public.fidelity_email_codes;

alter table public.fidelity_members
  drop column if exists contact_email,
  drop column if exists email_verified_at;

-- Ultimo contatto WhatsApp dal negozio (per non scrivere troppo spesso).
alter table public.fidelity_members rename column last_reminder_at to last_contacted_at;

alter table public.fidelity_cards
  drop column if exists auto_reminders,
  drop column if exists reminder_threshold,
  add column if not exists close_to_prize_percent integer not null default 80
    check (close_to_prize_percent between 50 and 95);
