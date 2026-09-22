-- Migration: two corrections to the points system from
-- 20260922140000_add_network_points.sql:
--
-- 1. Voucher creation must spend ONLY network_points, never daily_points.
--    daily_points stays reserved exclusively for community listings —
--    the two currencies are NOT interchangeable after all (the "combined
--    balance" design in the previous migration was wrong). spend_points()
--    is replaced by two single-bucket functions: spend_daily_points() for
--    listings, spend_network_points() for vouchers and (below) rewards.
--
-- 2. Rank bonus amounts are no longer a flat 49 for every tier:
--    rising_star=49 (still exactly one voucher), shining_star=294,
--    diamond_star=900 — large enough at the higher tiers to redeem from
--    the new reward catalog below.

DROP FUNCTION IF EXISTS spend_points(INT);

CREATE OR REPLACE FUNCTION spend_daily_points(p_amount INT)
RETURNS TABLE (success BOOLEAN, new_daily_points INT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_daily INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  UPDATE profiles
  SET daily_points = daily_points - p_amount
  WHERE id = auth.uid() AND COALESCE(daily_points, 0) >= p_amount
  RETURNING daily_points INTO v_daily;

  IF NOT FOUND THEN
    SELECT COALESCE(daily_points, 0) INTO v_daily FROM profiles WHERE id = auth.uid();
    RETURN QUERY SELECT false, v_daily;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_daily;
END;
$$;

GRANT EXECUTE ON FUNCTION spend_daily_points(INT) TO authenticated;

CREATE OR REPLACE FUNCTION spend_network_points(p_amount INT)
RETURNS TABLE (success BOOLEAN, new_network_points INT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_network INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  UPDATE profiles
  SET network_points = network_points - p_amount
  WHERE id = auth.uid() AND COALESCE(network_points, 0) >= p_amount
  RETURNING network_points INTO v_network;

  IF NOT FOUND THEN
    SELECT COALESCE(network_points, 0) INTO v_network FROM profiles WHERE id = auth.uid();
    RETURN QUERY SELECT false, v_network;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_network;
END;
$$;

GRANT EXECUTE ON FUNCTION spend_network_points(INT) TO authenticated;

CREATE OR REPLACE FUNCTION create_subscription_voucher()
RETURNS TABLE (success BOOLEAN, code TEXT, new_balance INT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_spend RECORD;
  v_code TEXT;
  v_attempt INT := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_spend FROM spend_network_points(49);

  IF NOT v_spend.success THEN
    RETURN QUERY SELECT false, NULL::TEXT, v_spend.new_network_points;
    RETURN;
  END IF;

  LOOP
    v_attempt := v_attempt + 1;
    v_code := 'KV-' || (
      SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1), '')
      FROM generate_series(1, 10)
    );

    BEGIN
      INSERT INTO subscription_vouchers (code, created_by, status)
      VALUES (v_code, auth.uid(), 'active');
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= 5 THEN
        RAISE EXCEPTION 'voucher_code_generation_failed';
      END IF;
    END;
  END LOOP;

  RETURN QUERY SELECT true, v_code, v_spend.new_network_points;
END;
$$;

GRANT EXECUTE ON FUNCTION create_subscription_voucher() TO authenticated;

CREATE OR REPLACE FUNCTION claim_rank_bonus(p_rank_key TEXT)
RETURNS TABLE (success BOOLEAN, awarded INT, new_network_points INT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_threshold INT;
  v_bonus INT;
  v_active_count INT;
  v_balance INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  v_threshold := CASE p_rank_key
    WHEN 'rising_star' THEN 6
    WHEN 'shining_star' THEN 36
    WHEN 'diamond_star' THEN 108
    ELSE NULL
  END;

  v_bonus := CASE p_rank_key
    WHEN 'rising_star' THEN 49
    WHEN 'shining_star' THEN 294
    WHEN 'diamond_star' THEN 900
    ELSE NULL
  END;

  IF v_threshold IS NULL THEN
    SELECT COALESCE(network_points, 0) INTO v_balance FROM profiles WHERE id = auth.uid();
    RETURN QUERY SELECT false, 0, COALESCE(v_balance, 0);
    RETURN;
  END IF;

  SELECT count(*) INTO v_active_count
  FROM profiles s
  WHERE s.sponsor_id = auth.uid()
    AND s.subscription_status = 'active'
    AND (s.subscription_expires_at IS NULL OR s.subscription_expires_at > now());

  UPDATE profiles
  SET
    network_points = COALESCE(network_points, 0) + v_bonus,
    rank_bonuses_claimed = array_append(COALESCE(rank_bonuses_claimed, ARRAY[]::text[]), p_rank_key)
  WHERE id = auth.uid()
    AND v_active_count >= v_threshold
    AND NOT (p_rank_key = ANY(COALESCE(rank_bonuses_claimed, ARRAY[]::text[])))
  RETURNING network_points INTO v_balance;

  IF NOT FOUND THEN
    SELECT COALESCE(network_points, 0) INTO v_balance FROM profiles WHERE id = auth.uid();
    RETURN QUERY SELECT false, 0, v_balance;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_bonus, v_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_rank_bonus(TEXT) TO authenticated;

-- ── Reward catalog ──────────────────────────────────────────────────────
-- Prizes redeemable with network_points. is_visible controls whether a
-- reward appears in the Kumano-facing catalog at all; a visible reward the
-- viewer can't yet afford still shows there (dimmed/locked), that's a
-- per-viewer computed state, not a DB flag — see src/app/[locale]/rewards/page.tsx.

CREATE TABLE IF NOT EXISTS reward_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  points_cost INT NOT NULL CHECK (points_cost > 0),
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reward_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view visible rewards"
  ON reward_catalog FOR SELECT
  TO authenticated
  USING (is_visible = true);

-- No INSERT/UPDATE/DELETE policy: catalog management is admin-only via the
-- service role (src/app/actions/admin.ts), same as marketplace_settings.

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID NOT NULL REFERENCES reward_catalog(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_spent INT NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS reward_redemptions_user_id_idx ON reward_redemptions (user_id);

ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own redemptions"
  ON reward_redemptions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Atomically spends network_points and logs the redemption — a reward
-- with redemptions can't be hard-deleted from the catalog (ON DELETE
-- RESTRICT above), only hidden, so fulfillment history is never lost.
CREATE OR REPLACE FUNCTION redeem_reward(p_reward_id UUID)
RETURNS TABLE (success BOOLEAN, reason TEXT, new_network_points INT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_cost INT;
  v_visible BOOLEAN;
  v_spend RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT points_cost, is_visible INTO v_cost, v_visible FROM reward_catalog WHERE id = p_reward_id;

  IF v_cost IS NULL THEN
    RETURN QUERY SELECT false, 'not_found', COALESCE((SELECT network_points FROM profiles WHERE id = auth.uid()), 0);
    RETURN;
  END IF;

  IF NOT v_visible THEN
    RETURN QUERY SELECT false, 'not_available', COALESCE((SELECT network_points FROM profiles WHERE id = auth.uid()), 0);
    RETURN;
  END IF;

  SELECT * INTO v_spend FROM spend_network_points(v_cost);

  IF NOT v_spend.success THEN
    RETURN QUERY SELECT false, 'insufficient_points', v_spend.new_network_points;
    RETURN;
  END IF;

  INSERT INTO reward_redemptions (reward_id, user_id, points_spent)
  VALUES (p_reward_id, auth.uid(), v_cost);

  RETURN QUERY SELECT true, NULL::TEXT, v_spend.new_network_points;
END;
$$;

GRANT EXECUTE ON FUNCTION redeem_reward(UUID) TO authenticated;
