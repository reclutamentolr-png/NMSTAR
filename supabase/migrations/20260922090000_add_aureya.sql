-- Aureya: wellness self-check service with two screening tests (acoustic
-- hearing threshold, visual field perception). Each completed test writes
-- one immutable row so results can be compared over time — no UPDATE
-- policy on purpose, a test result is a historical record, not an editable
-- document. Owner can still DELETE their own rows (health-adjacent data).
-- Does not award daily_tool_points: this service is intentionally excluded
-- from award_tool_point()'s whitelist, per product decision.

CREATE TABLE IF NOT EXISTS aureya_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL CHECK (test_type IN ('acoustic', 'visual')),
  result JSONB NOT NULL,
  score NUMERIC,
  device_confirmation TEXT CHECK (device_confirmation IN ('headphones', 'speaker')),
  tested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aureya_test_results_user_id_idx ON aureya_test_results (user_id);
CREATE INDEX IF NOT EXISTS aureya_test_results_user_type_idx ON aureya_test_results (user_id, test_type, tested_at DESC);

ALTER TABLE aureya_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own test results"
  ON aureya_test_results FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Owner can insert own test results"
  ON aureya_test_results FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Owner can delete own test results"
  ON aureya_test_results FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);
