-- Migration: Add Spendly (personal income/expense tracker, "Organizzazione
-- Personale" category) tables. Fully private data — owner-only RLS, same
-- approach as findo_*/life_calendar_* (no SECURITY DEFINER functions
-- needed, every table just checks auth.uid() = user_id).

CREATE TABLE IF NOT EXISTS spendly_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  income_type TEXT NOT NULL DEFAULT 'fissa' CHECK (income_type IN ('fissa', 'variabile')),
  category TEXT NOT NULL DEFAULT 'altro' CHECK (category IN ('stipendio', 'bonus', 'freelance', 'vendite', 'altro')),
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  payment_day INT CHECK (payment_day BETWEEN 1 AND 31),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS spendly_income_user_year_idx ON spendly_income (user_id, year);

CREATE TABLE IF NOT EXISTS spendly_fixed_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  frequency TEXT NOT NULL DEFAULT 'mensile' CHECK (frequency IN ('mensile', 'bimestrale', 'trimestrale', 'semestrale', 'annuale')),
  category TEXT NOT NULL DEFAULT 'altro' CHECK (category IN ('mutuo_affitto', 'bollette', 'abbonamenti', 'assicurazioni', 'finanziamenti', 'ricariche', 'altro')),
  year INT NOT NULL,
  start_month INT NOT NULL DEFAULT 1 CHECK (start_month BETWEEN 1 AND 12),
  billing_day INT CHECK (billing_day BETWEEN 1 AND 31),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS spendly_fixed_expenses_user_year_idx ON spendly_fixed_expenses (user_id, year);

CREATE TABLE IF NOT EXISTS spendly_variable_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  expense_date DATE NOT NULL,
  category TEXT NOT NULL DEFAULT 'altro' CHECK (category IN ('spesa_alimentari', 'svago_ristoranti', 'trasporti', 'salute', 'casa', 'shopping', 'altro')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS spendly_variable_expenses_user_date_idx ON spendly_variable_expenses (user_id, expense_date);

ALTER TABLE spendly_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE spendly_fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE spendly_variable_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own income"
  ON spendly_income FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can manage own fixed expenses"
  ON spendly_fixed_expenses FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can manage own variable expenses"
  ON spendly_variable_expenses FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add 'spendly' to award_tool_point()'s tool_name whitelist (same function
-- as 20260921260000_add_daily_tool_points.sql, just extending the IN list —
-- CREATE OR REPLACE keeps the same signature/return shape so no DROP is
-- needed here, unlike the direct/spillover split in
-- 20260922200000_split_matrix_spillover_bonus.sql). Logging expenses is a
-- daily-use action, unlike Aureya's periodic test results, so unlike Aureya
-- this one is intentionally included.
CREATE OR REPLACE FUNCTION award_tool_point(p_tool_name TEXT)
RETURNS TABLE (awarded BOOLEAN, new_balance INT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'Europe/Rome')::date;
  v_rows INT;
  v_balance INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF p_tool_name NOT IN (
    'link-in-bio', 'memolife', 'neurobalance', 'svat',
    'offermaker', 'qr-code-pro', 'life-calendar', 'findo', 'digital-receipt',
    'spendly'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO daily_tool_points (user_id, tool_name, awarded_on)
  VALUES (auth.uid(), p_tool_name, v_today)
  ON CONFLICT (user_id, tool_name, awarded_on) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    SELECT daily_points INTO v_balance FROM profiles WHERE id = auth.uid();
    RETURN QUERY SELECT false, COALESCE(v_balance, 0);
    RETURN;
  END IF;

  UPDATE profiles SET daily_points = COALESCE(daily_points, 0) + 1
  WHERE id = auth.uid()
  RETURNING daily_points INTO v_balance;

  RETURN QUERY SELECT true, v_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION award_tool_point(TEXT) TO authenticated;
