-- Migration: Add Findo (personal item-location inventory) tables + storage bucket.
-- Fully private data — owner-only RLS, no public/anon access needed at all
-- (same approach as life_calendar_*: no SECURITY DEFINER functions needed).

CREATE TABLE IF NOT EXISTS findo_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES findo_locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Home',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS findo_locations_user_id_idx ON findo_locations (user_id);
CREATE INDEX IF NOT EXISTS findo_locations_parent_id_idx ON findo_locations (parent_id);

CREATE TABLE IF NOT EXISTS findo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES findo_locations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  photo_path TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS findo_items_user_id_idx ON findo_items (user_id);
CREATE INDEX IF NOT EXISTS findo_items_location_id_idx ON findo_items (location_id);

CREATE TABLE IF NOT EXISTS findo_item_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES findo_items(id) ON DELETE CASCADE,
  moved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  previous_location_path TEXT,
  new_location_path TEXT
);

CREATE INDEX IF NOT EXISTS findo_item_moves_item_id_idx ON findo_item_moves (item_id);

ALTER TABLE findo_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE findo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE findo_item_moves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own locations"
  ON findo_locations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can manage own items"
  ON findo_items FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can view own item moves"
  ON findo_item_moves FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM findo_items i
      WHERE i.id = findo_item_moves.item_id AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert own item moves"
  ON findo_item_moves FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM findo_items i
      WHERE i.id = findo_item_moves.item_id AND i.user_id = auth.uid()
    )
  );

-- Private storage bucket for item photos (passports, keys, valuables — not public).
INSERT INTO storage.buckets (id, name, public)
VALUES ('findo-photos', 'findo-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Findo owner can upload own photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'findo-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Findo owner can view own photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'findo-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Findo owner can update own photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'findo-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Findo owner can delete own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'findo-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
