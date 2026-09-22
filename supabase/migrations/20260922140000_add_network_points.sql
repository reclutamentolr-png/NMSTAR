-- Migration: Distinguish "network points" (earned by reaching a sponsorship
-- rank milestone — Rising Star/Shining Star/Diamond Star, see src/lib/ranks.ts)
-- from the existing profiles.daily_points (earned from daily login + using
-- Marketplace tools). Both are spendable on the same things (listings,
-- subscription vouchers), but are tracked and displayed as two distinct
-- balances so a Kumano can see how much came from showing up vs. from
-- growing their network.
--
-- rank_bonuses_claimed is intentionally separate from the existing
-- profiles.qualifications_seen (used only to dismiss the congrats popup
-- once): decoupling them lets already-achieved-and-already-seen ranks still
-- be credited retroactively the next time claim_rank_bonus runs, instead of
-- silently losing the bonus for anyone who reached a rank before this
-- migration existed.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS network_points INT NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rank_bonuses_claimed TEXT[] NOT NULL DEFAULT '{}';

-- Atomically spends p_amount from the caller's combined balance
-- (network_points first, then daily_points for the remainder) — the same
-- "guard baked into the UPDATE's WHERE clause" pattern as every other spend
-- in this app, so concurrent spend attempts can't both succeed off a stale
-- balance read. Used by both create_subscription_voucher() below and the
-- community-listing action (src/app/actions/listings.ts), replacing that
-- action's old read-then-write deduction.
CREATE OR REPLACE FUNCTION spend_points(p_amount INT)
RETURNS TABLE (success BOOLEAN, new_daily_points INT, new_network_points INT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_daily INT;
  v_network INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  UPDATE profiles
  SET
    network_points = GREATEST(COALESCE(network_points, 0) - LEAST(COALESCE(network_points, 0), p_amount), 0),
    daily_points = COALESCE(daily_points, 0) - GREATEST(p_amount - COALESCE(network_points, 0), 0)
  WHERE id = auth.uid()
    AND (COALESCE(daily_points, 0) + COALESCE(network_points, 0)) >= p_amount
  RETURNING daily_points, network_points INTO v_daily, v_network;

  IF NOT FOUND THEN
    SELECT COALESCE(daily_points, 0), COALESCE(network_points, 0) INTO v_daily, v_network
    FROM profiles WHERE id = auth.uid();
    RETURN QUERY SELECT false, v_daily, v_network;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_daily, v_network;
END;
$$;

GRANT EXECUTE ON FUNCTION spend_points(INT) TO authenticated;

-- Restores points to daily_points after a spend whose follow-up step failed
-- (e.g. a listing insert error) — bucket doesn't matter since both are
-- equally spendable, this just needs to not lose the amount.
CREATE OR REPLACE FUNCTION refund_points(p_amount INT)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  UPDATE profiles SET daily_points = COALESCE(daily_points, 0) + p_amount WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION refund_points(INT) TO authenticated;

-- create_subscription_voucher() now spends from the combined balance via
-- spend_points() instead of checking/decrementing daily_points directly, so
-- network_points earned from rank bonuses can fund a voucher too.
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

  SELECT * INTO v_spend FROM spend_points(49);

  IF NOT v_spend.success THEN
    RETURN QUERY SELECT false, NULL::TEXT, (v_spend.new_daily_points + v_spend.new_network_points);
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
        -- Aborts the whole transaction, rolling back the spend_points()
        -- deduction above too — see the original migration's note.
        RAISE EXCEPTION 'voucher_code_generation_failed';
      END IF;
    END;
  END LOOP;

  RETURN QUERY SELECT true, v_code, (v_spend.new_daily_points + v_spend.new_network_points);
END;
$$;

GRANT EXECUTE ON FUNCTION create_subscription_voucher() TO authenticated;

-- Awards a flat 49 network_points the first time the caller reaches a
-- sponsorship rank (rising_star at 6 active direct affiliates, shining_star
-- at 36, diamond_star at 108 — thresholds mirror src/lib/ranks.ts). The
-- active-affiliate count is recomputed here from profiles directly, never
-- trusted from the caller, so this can't be spoofed by calling it with an
-- arbitrary rank key; the rank_bonuses_claimed guard is baked into the
-- UPDATE's WHERE clause so a rank can never be credited twice, even under
-- concurrent/repeated calls (this function is meant to be called
-- idempotently every time the dashboard loads, see getDashboardNetworkData).
CREATE OR REPLACE FUNCTION claim_rank_bonus(p_rank_key TEXT)
RETURNS TABLE (success BOOLEAN, awarded INT, new_network_points INT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_threshold INT;
  v_bonus INT := 49;
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
