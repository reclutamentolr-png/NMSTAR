-- Foto dei premi del Catalogo caricate dal pannello admin (oltre al link
-- URL). Bucket pubblico in lettura (le foto si vedono nel Catalogo);
-- nessuna policy di scrittura: carica solo il server (service role) dopo
-- aver verificato che l'utente sia admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reward-images', 'reward-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
