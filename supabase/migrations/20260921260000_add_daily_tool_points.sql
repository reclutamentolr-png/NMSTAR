-- Ledger enforcing "at most one point per user per tool per day" at the
-- database level. The landing page promises points from actually using
-- the Marketplace tools, but until now the only point-awarding code was
-- a per-login bonus unrelated to tool usage. This closes that gap while
-- keeping the anti-abuse guarantee at the DB layer (UNIQUE constraint),
-- not as an app-side check-then-write that could race or be bypassed —
-- same pattern as redeem_wallet_coupon.

CREATE TABLE IF NOT EXISTS daily_tool_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  awarded_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tool_name, awarded_on)
);

CREATE INDEX IF NOT EXISTS daily_tool_points_user_id_idx ON daily_tool_points (user_id);

ALTER TABLE daily_tool_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own tool points"
  ON daily_tool_points FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Awards +1 profiles.daily_points the first time p_tool_name is used today
-- by the caller. A second same-day call for the same tool hits the unique
-- constraint (ON CONFLICT DO NOTHING) and returns awarded = false without
-- incrementing anything — this is the actual anti-abuse gate, enforced by
-- Postgres, not by app-level logic that could race or be bypassed. Only a
-- whitelisted set of tool names is accepted, so the RPC can't be used to
-- mint points under an arbitrary/typo'd tool_name.
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
    'offermaker', 'qr-code-pro', 'life-calendar', 'findo', 'digital-receipt'
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
