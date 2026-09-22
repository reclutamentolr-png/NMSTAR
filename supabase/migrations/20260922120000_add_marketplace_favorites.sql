-- Per-user marketplace tool favorites (the star toggle on tool cards).
-- One row per (user, tool) — owner-only RLS, no UPDATE policy needed since
-- favoriting is add/remove, never edited in place.

CREATE TABLE IF NOT EXISTS marketplace_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tool_name)
);

CREATE INDEX IF NOT EXISTS marketplace_favorites_user_id_idx ON marketplace_favorites (user_id);

ALTER TABLE marketplace_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own favorites"
  ON marketplace_favorites FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Owner can insert own favorites"
  ON marketplace_favorites FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Owner can delete own favorites"
  ON marketplace_favorites FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);
