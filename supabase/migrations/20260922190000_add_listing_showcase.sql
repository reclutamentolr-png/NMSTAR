-- Migration: "In Vetrina" — a Kumano can spend network_points to feature
-- their own listing for 7 or 15 days, showing it in a dedicated showcase
-- section above the regular community grid. Cost per duration is an
-- admin-configurable system_settings value (listing_feature_cost_7d /
-- listing_feature_cost_15d), same mechanism already used for
-- matrix_slot_bonus_points, so it can be tuned without a deploy.

ALTER TABLE listings ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS listings_featured_until_idx ON listings (featured_until) WHERE featured_until IS NOT NULL;

-- Atomically validates ownership, spends network_points (never
-- daily_points — matches the vouchers/rewards convention), and sets
-- featured_until, all in one transaction. Ownership + existence are
-- checked before spending, so there's no case where points are spent and
-- the feature fails to apply (no refund path needed).
CREATE OR REPLACE FUNCTION feature_listing(p_listing_id UUID, p_duration_days INT)
RETURNS TABLE (success BOOLEAN, reason TEXT, featured_until TIMESTAMPTZ, new_network_points INT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_owner UUID;
  v_cost INT;
  v_setting_key TEXT;
  v_default_cost INT;
  v_spend RECORD;
  v_featured_until TIMESTAMPTZ;
  v_balance INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(network_points, 0) INTO v_balance FROM profiles WHERE id = auth.uid();

  IF p_duration_days NOT IN (7, 15) THEN
    RETURN QUERY SELECT false, 'invalid_duration', NULL::TIMESTAMPTZ, v_balance;
    RETURN;
  END IF;

  SELECT user_id INTO v_owner FROM listings WHERE id = p_listing_id;
  IF v_owner IS NULL THEN
    RETURN QUERY SELECT false, 'not_found', NULL::TIMESTAMPTZ, v_balance;
    RETURN;
  END IF;
  IF v_owner != auth.uid() THEN
    RETURN QUERY SELECT false, 'not_owner', NULL::TIMESTAMPTZ, v_balance;
    RETURN;
  END IF;

  v_setting_key := CASE p_duration_days WHEN 7 THEN 'listing_feature_cost_7d' ELSE 'listing_feature_cost_15d' END;
  v_default_cost := CASE p_duration_days WHEN 7 THEN 20 ELSE 35 END;

  SELECT COALESCE(NULLIF(value, '')::int, v_default_cost) INTO v_cost
  FROM system_settings WHERE key = v_setting_key;
  v_cost := COALESCE(v_cost, v_default_cost);

  SELECT * INTO v_spend FROM spend_network_points(v_cost);
  IF NOT v_spend.success THEN
    RETURN QUERY SELECT false, 'insufficient_points', NULL::TIMESTAMPTZ, v_spend.new_network_points;
    RETURN;
  END IF;

  v_featured_until := now() + (p_duration_days || ' days')::interval;

  UPDATE listings SET featured_until = v_featured_until WHERE id = p_listing_id;

  RETURN QUERY SELECT true, NULL::TEXT, v_featured_until, v_spend.new_network_points;
END;
$$;

GRANT EXECUTE ON FUNCTION feature_listing(UUID, INT) TO authenticated;
