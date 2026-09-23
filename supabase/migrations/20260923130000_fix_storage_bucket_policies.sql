-- Fixes a real-world bug discovered while testing logo uploads for Preventivi:
-- Supabase's Storage service treats a bucket created via a raw SQL
-- `INSERT INTO storage.buckets` (as the two earlier migrations did for
-- `quote-logos` and `receipt-photos`) as broken for authenticated writes —
-- every upload came back "new row violates row-level security policy" even
-- though the policies themselves were correct and verified directly via SQL.
-- Buckets created through the Storage Admin API/Dashboard don't have this
-- problem. Both old buckets were empty (never successfully used), so they
-- were deleted and recreated through the API as `quote-logos-v2` and
-- `receipt-photos-v2` — this migration only codifies the resulting RLS
-- policies for those buckets; IT DOES NOT (and cannot, via plain SQL)
-- (re)create the buckets themselves.
--
-- IMPORTANT for anyone replaying migrations on a fresh project: the buckets
-- `quote-logos-v2` and `receipt-photos-v2` (both public) must already exist
-- — create them via Supabase Dashboard → Storage → New bucket (or
-- `supabase.storage.admin.createBucket()`), never via `INSERT INTO
-- storage.buckets`, or uploads will fail with the same RLS error.
--
-- Second real cause found in the same investigation: the original 3-policy
-- set (INSERT/UPDATE/DELETE only, no SELECT) breaks `.upload(path, file,
-- { upsert: true })` specifically — Storage's upsert path needs to see the
-- existing row via a SELECT policy to resolve the conflict, even though
-- public-bucket *downloads* never need one (those go through a separate
-- public-serving path, not owner-scoped RLS). Every owner-scoped bucket
-- policy set from now on needs all 4: SELECT, INSERT, UPDATE, DELETE.

drop policy if exists "Quote owner can upload own logo" on storage.objects;
drop policy if exists "Quote owner can update own logo" on storage.objects;
drop policy if exists "Quote owner can delete own logo" on storage.objects;
drop policy if exists "Receipt owner can upload own photos" on storage.objects;
drop policy if exists "Receipt owner can update own photos" on storage.objects;
drop policy if exists "Receipt owner can delete own photos" on storage.objects;

create policy "Quote owner can view own logo v2"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'quote-logos-v2' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Quote owner can upload own logo v2"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'quote-logos-v2' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Quote owner can update own logo v2"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'quote-logos-v2' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Quote owner can delete own logo v2"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'quote-logos-v2' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Receipt owner can view own photos v2"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'receipt-photos-v2' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Receipt owner can upload own photos v2"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'receipt-photos-v2' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Receipt owner can update own photos v2"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'receipt-photos-v2' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Receipt owner can delete own photos v2"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'receipt-photos-v2' and (storage.foldername(name))[1] = auth.uid()::text);
