-- Migration: Add Life Calendar (personal deadline tracker) tables.
-- Fully private data — owner-only RLS, no public/anon access needed at all
-- (unlike offermaker_campaigns/qr_pro_codes, which serve public landing pages).

CREATE TABLE IF NOT EXISTS life_calendar_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'User',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS life_calendar_profiles_user_id_idx ON life_calendar_profiles (user_id);

CREATE TABLE IF NOT EXISTS life_calendar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES life_calendar_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'person', 'auto', 'home', 'family', 'contracts', 'warranties', 'subscriptions', 'work', 'travel', 'other'
  )),
  due_date DATE NOT NULL,
  notes TEXT,
  reminder_offsets INTEGER[] NOT NULL DEFAULT '{}',
  recurrence TEXT NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none', 'monthly', 'yearly', 'every_2_years', 'custom')),
  recurrence_custom_days INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS life_calendar_items_user_id_idx ON life_calendar_items (user_id);
CREATE INDEX IF NOT EXISTS life_calendar_items_due_date_idx ON life_calendar_items (due_date);

CREATE TABLE IF NOT EXISTS life_calendar_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES life_calendar_items(id) ON DELETE CASCADE,
  renewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  previous_due_date DATE NOT NULL,
  new_due_date DATE
);

CREATE INDEX IF NOT EXISTS life_calendar_renewals_item_id_idx ON life_calendar_renewals (item_id);

ALTER TABLE life_calendar_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_calendar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_calendar_renewals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own profiles"
  ON life_calendar_profiles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can manage own items"
  ON life_calendar_items FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can view own renewals"
  ON life_calendar_renewals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM life_calendar_items i
      WHERE i.id = life_calendar_renewals.item_id AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert own renewals"
  ON life_calendar_renewals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM life_calendar_items i
      WHERE i.id = life_calendar_renewals.item_id AND i.user_id = auth.uid()
    )
  );
