-- Migration: Add "KUMANI CV" — the living CV builder. Owner-only RLS on the
-- table, public (anon) read through a single narrow SECURITY DEFINER
-- function, same principle as get_digital_receipt_by_code.
--
-- IMPORTANT (bug discovered building Preventivi, verified empirically):
-- Supabase Storage buckets created via a raw SQL `INSERT INTO
-- storage.buckets` never work for authenticated uploads, even with correct
-- RLS policies — the Storage service silently rejects every write with
-- "new row violates row-level security policy". The `cv-photos` bucket is
-- therefore created separately via the Storage Admin API
-- (`supabase.storage.admin.createBucket()`), NOT by this migration. This
-- migration only adds the bucket's RLS policies, which is safe to run
-- before or after the bucket itself exists. Also note: an owner-scoped
-- bucket used with `{ upsert: true }` needs a SELECT policy too, not just
-- INSERT/UPDATE/DELETE — omitting it breaks the upsert conflict-detection
-- path with the same RLS error, even though public downloads never need it.

CREATE TABLE IF NOT EXISTS cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  template TEXT NOT NULL DEFAULT 'minimal' CHECK (template IN ('minimal', 'classic', 'sidebar')),
  content_language TEXT NOT NULL DEFAULT 'it',
  full_name TEXT NOT NULL,
  role_title TEXT,
  summary TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  photo_path TEXT,
  links JSONB NOT NULL DEFAULT '[]',
  experiences JSONB NOT NULL DEFAULT '[]',
  education JSONB NOT NULL DEFAULT '[]',
  skills JSONB NOT NULL DEFAULT '[]',
  languages JSONB NOT NULL DEFAULT '[]',
  certifications JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cvs_user_id_idx ON cvs (user_id);
CREATE INDEX IF NOT EXISTS cvs_code_idx ON cvs (code);

ALTER TABLE cvs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own CVs"
  ON cvs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public-safe read for the anonymous "living CV" page. Never exposes user_id.
CREATE OR REPLACE FUNCTION get_cv_by_code(p_code TEXT)
RETURNS TABLE (
  code TEXT,
  title TEXT,
  template TEXT,
  content_language TEXT,
  full_name TEXT,
  role_title TEXT,
  summary TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  photo_path TEXT,
  links JSONB,
  experiences JSONB,
  education JSONB,
  skills JSONB,
  languages JSONB,
  certifications JSONB,
  updated_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT
    code, title, template, content_language, full_name, role_title, summary,
    email, phone, location, photo_path, links, experiences, education,
    skills, languages, certifications, updated_at
  FROM cvs
  WHERE code = p_code
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_cv_by_code(TEXT) TO anon, authenticated;

CREATE POLICY "CV owner can view own photo"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'cv-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "CV owner can upload own photo"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'cv-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "CV owner can update own photo"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'cv-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "CV owner can delete own photo"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'cv-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
