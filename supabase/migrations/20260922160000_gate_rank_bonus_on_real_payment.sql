-- Migration: network_points from rank bonuses must only be earned from
-- REAL paying downline members, never from accounts activated via a
-- voucher or by an admin — otherwise a Kumano could create fake/free
-- accounts, activate them for free (voucher or, with admin access,
-- directly), farm rank thresholds, and mint more vouchers from the
-- resulting network_points: a closed loop with no real money ever
-- involved.
--
-- Root cause: profiles.subscription_status = 'active' gets set by three
-- different code paths (Stripe webhook, redeem_subscription_voucher(),
-- admin's user editor) and claim_rank_bonus() counted ANY active direct
-- sponsee regardless of which path activated them. Fix: track WHICH path
-- activated a subscription, and only count 'stripe' when checking rank
-- thresholds for the network_points bonus.
--
-- Existing active rows are backfilled to NULL (unknown provenance) rather
-- than guessed as 'stripe' — NULL doesn't satisfy the new 'stripe' filter,
-- so this is the safe default: better to under-count a real payer once
-- (they keep earning points from every future qualifying referral anyway)
-- than to trust an unverified historical row.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_source TEXT
  CHECK (subscription_source IS NULL OR subscription_source IN ('stripe', 'voucher', 'admin'));

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

  -- Only downline members whose subscription came from a real Stripe
  -- payment count toward the network_points rank bonus (see migration
  -- header). Note this is intentionally narrower than the count used for
  -- the "I tuoi KUMANI" list / rank badge display elsewhere in the app,
  -- which still show anyone with an active subscription regardless of
  -- source — this filter only gates the points payout.
  SELECT count(*) INTO v_active_count
  FROM profiles s
  WHERE s.sponsor_id = auth.uid()
    AND s.subscription_status = 'active'
    AND s.subscription_source = 'stripe'
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

-- redeem_subscription_voucher() now tags the activation as 'voucher'.
CREATE OR REPLACE FUNCTION redeem_subscription_voucher(p_code TEXT)
RETURNS TABLE (success BOOLEAN, reason TEXT, new_expires_at TIMESTAMPTZ)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
  v_created_by UUID;
  v_status TEXT;
  v_expires TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT id, created_by, status INTO v_id, v_created_by, v_status
  FROM subscription_vouchers WHERE code = p_code;

  IF v_id IS NULL THEN
    RETURN QUERY SELECT false, 'not_found', NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_created_by = auth.uid() THEN
    RETURN QUERY SELECT false, 'self_redemption', NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_status <> 'active' THEN
    RETURN QUERY SELECT false, 'already_used', NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  UPDATE subscription_vouchers
  SET status = 'redeemed', redeemed_by = auth.uid(), redeemed_at = now()
  WHERE id = v_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'already_used', NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  v_expires := now() + interval '1 year';

  UPDATE profiles
  SET subscription_status = 'active', subscription_expires_at = v_expires, subscription_source = 'voucher'
  WHERE id = auth.uid();

  RETURN QUERY SELECT true, NULL::TEXT, v_expires;
END;
$$;

GRANT EXECUTE ON FUNCTION redeem_subscription_voucher(TEXT) TO authenticated;
