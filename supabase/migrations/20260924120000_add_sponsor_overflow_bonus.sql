-- Migration: pay the referring sponsor (profiles.sponsor_id) for every
-- active affiliate they bring in, even beyond their own 5 direct matrix
-- slots. Until now, claim_matrix_slot_bonus() only paid for slots that
-- landed inside the caller's own 5-wide matrix row — once those 5 fill up,
-- any further direct sponsee who spills over elsewhere in the tree (via
-- find_spillover_position, see 20260922200000) earned the sponsor nothing,
-- even though the sponsor did personally recruit them.
--
-- This does NOT double-pay: it explicitly excludes anyone who landed in the
-- caller's own 5 slots (those already get the "direct" rate from
-- claim_matrix_slot_bonus). It only covers the overflow — sponsees whose
-- matrix placement ended up under someone else (or who have no matrix node
-- at all, e.g. a failed placement) — using the same rate as the "direct"
-- slot bonus (matrix_slot_bonus_points), per product decision: this is
-- still "you personally recruited this person", just not capped at 5.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sponsor_overflow_bonus_paid INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION claim_sponsor_overflow_bonus()
RETURNS TABLE (success BOOLEAN, awarded INT, overflow_paid INT, new_network_points INT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_my_node_id UUID;
  v_active_overflow INT;
  v_already_paid INT;
  v_new_paid INT;
  v_rate INT;
  v_awarded INT;
  v_balance INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_my_node_id FROM matrix_nodes WHERE user_id = auth.uid();

  -- Active, Stripe-paid direct sponsees of the caller whose matrix node did
  -- NOT land under the caller's own node — i.e. the 6th+ direct referral
  -- (or a sponsee with no matrix_nodes row at all, e.g. a failed placement:
  -- sponsor_id already proves affiliation regardless of matrix state).
  SELECT count(*)
  INTO v_active_overflow
  FROM profiles s
  LEFT JOIN matrix_nodes mn ON mn.user_id = s.id
  WHERE s.sponsor_id = auth.uid()
    AND s.subscription_status = 'active'
    AND s.subscription_source = 'stripe'
    AND (s.subscription_expires_at IS NULL OR s.subscription_expires_at > now())
    AND (v_my_node_id IS NULL OR mn.parent_id IS DISTINCT FROM v_my_node_id);

  SELECT COALESCE(sponsor_overflow_bonus_paid, 0) INTO v_already_paid
  FROM profiles WHERE id = auth.uid();

  v_new_paid := GREATEST(v_active_overflow - v_already_paid, 0);

  IF v_new_paid = 0 THEN
    SELECT COALESCE(network_points, 0) INTO v_balance FROM profiles WHERE id = auth.uid();
    RETURN QUERY SELECT false, 0, v_already_paid, v_balance;
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(value, '')::int, 10) INTO v_rate
  FROM system_settings WHERE key = 'matrix_slot_bonus_points';
  v_rate := COALESCE(v_rate, 10);

  v_awarded := v_new_paid * v_rate;

  UPDATE profiles
  SET
    network_points = COALESCE(network_points, 0) + v_awarded,
    sponsor_overflow_bonus_paid = v_active_overflow
  WHERE id = auth.uid()
    -- Same atomic stale-read guard used by the other claim_* functions:
    -- only applies if nobody else already advanced this counter
    -- concurrently.
    AND COALESCE(sponsor_overflow_bonus_paid, 0) = v_already_paid
  RETURNING network_points INTO v_balance;

  IF NOT FOUND THEN
    SELECT COALESCE(network_points, 0) INTO v_balance FROM profiles WHERE id = auth.uid();
    RETURN QUERY SELECT false, 0, v_already_paid, v_balance;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_awarded, v_active_overflow, v_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_sponsor_overflow_bonus() TO authenticated;
