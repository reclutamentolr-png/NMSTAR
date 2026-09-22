-- Migration: split the flat "Bonus Struttura" rate into two admin-configurable
-- rates — one for slots filled by a Kumano's own direct sponsee, one for
-- slots filled by someone else's spillover — instead of paying every filled
-- slot the same amount regardless of origin.
--
-- Direct vs. spillover is derived, not stored: a filled slot is "direct" when
-- the occupant's real sponsor (profiles.sponsor_id) is the slot owner
-- themselves, and "spillover" when it's anyone else (find_spillover_position
-- placed them here via BFS because their real sponsor's own subtree was
-- full). Verified live against the current matrix before writing this.
--
-- matrix_bonus_slots_paid (single flat counter) is replaced by two counters,
-- one per origin, since the two origins can now pay different amounts and a
-- single count can no longer disambiguate what's already been paid.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS matrix_bonus_direct_slots_paid INT NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS matrix_bonus_spillover_slots_paid INT NOT NULL DEFAULT 0;

-- One-time backfill: every slot paid so far under the old flat-rate scheme
-- is attributed to "direct" (verified against live data at migration time —
-- the only nonzero row was in fact a direct slot). This only affects
-- already-awarded points bookkeeping, never re-pays or claws back points.
UPDATE profiles SET matrix_bonus_direct_slots_paid = matrix_bonus_slots_paid WHERE matrix_bonus_slots_paid > 0;

ALTER TABLE profiles DROP COLUMN IF EXISTS matrix_bonus_slots_paid;

-- Return shape changed (split slots_paid into direct/spillover), which
-- Postgres won't let CREATE OR REPLACE do in place.
DROP FUNCTION IF EXISTS claim_matrix_slot_bonus();

CREATE OR REPLACE FUNCTION claim_matrix_slot_bonus()
RETURNS TABLE (success BOOLEAN, awarded INT, direct_slots_paid INT, spillover_slots_paid INT, new_network_points INT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_my_node_id UUID;
  v_active_direct INT;
  v_active_spillover INT;
  v_already_direct INT;
  v_already_spillover INT;
  v_new_direct INT;
  v_new_spillover INT;
  v_rate_direct INT;
  v_rate_spillover INT;
  v_awarded INT;
  v_balance INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_my_node_id FROM matrix_nodes WHERE user_id = auth.uid();
  IF v_my_node_id IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, 0, COALESCE((SELECT network_points FROM profiles WHERE id = auth.uid()), 0);
    RETURN;
  END IF;

  -- Direct: the child's real sponsor is this Kumano. Spillover: their real
  -- sponsor is someone else, but they landed in one of this Kumano's 5
  -- matrix slots via find_spillover_position's BFS overflow.
  SELECT
    count(*) FILTER (WHERE p.sponsor_id = auth.uid()),
    count(*) FILTER (WHERE p.sponsor_id IS DISTINCT FROM auth.uid())
  INTO v_active_direct, v_active_spillover
  FROM matrix_nodes child
  JOIN profiles p ON p.id = child.user_id
  WHERE child.parent_id = v_my_node_id
    AND p.subscription_status = 'active'
    AND p.subscription_source = 'stripe'
    AND (p.subscription_expires_at IS NULL OR p.subscription_expires_at > now());

  SELECT COALESCE(matrix_bonus_direct_slots_paid, 0), COALESCE(matrix_bonus_spillover_slots_paid, 0)
  INTO v_already_direct, v_already_spillover
  FROM profiles WHERE id = auth.uid();

  v_new_direct := GREATEST(v_active_direct - v_already_direct, 0);
  v_new_spillover := GREATEST(v_active_spillover - v_already_spillover, 0);

  IF v_new_direct = 0 AND v_new_spillover = 0 THEN
    SELECT COALESCE(network_points, 0) INTO v_balance FROM profiles WHERE id = auth.uid();
    RETURN QUERY SELECT false, 0, v_already_direct, v_already_spillover, v_balance;
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(value, '')::int, 5) INTO v_rate_direct
  FROM system_settings WHERE key = 'matrix_slot_bonus_points';
  v_rate_direct := COALESCE(v_rate_direct, 5);

  SELECT COALESCE(NULLIF(value, '')::int, 5) INTO v_rate_spillover
  FROM system_settings WHERE key = 'matrix_spillover_bonus_points';
  v_rate_spillover := COALESCE(v_rate_spillover, 5);

  v_awarded := v_new_direct * v_rate_direct + v_new_spillover * v_rate_spillover;

  UPDATE profiles
  SET
    network_points = COALESCE(network_points, 0) + v_awarded,
    matrix_bonus_direct_slots_paid = v_active_direct,
    matrix_bonus_spillover_slots_paid = v_active_spillover
  WHERE id = auth.uid()
    -- Same atomic stale-read guard as before, now on both counters: only
    -- apply if nobody else already advanced either counter concurrently.
    AND COALESCE(matrix_bonus_direct_slots_paid, 0) = v_already_direct
    AND COALESCE(matrix_bonus_spillover_slots_paid, 0) = v_already_spillover
  RETURNING network_points INTO v_balance;

  IF NOT FOUND THEN
    SELECT COALESCE(network_points, 0) INTO v_balance FROM profiles WHERE id = auth.uid();
    RETURN QUERY SELECT false, 0, v_already_direct, v_already_spillover, v_balance;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_awarded, v_active_direct, v_active_spillover, v_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_matrix_slot_bonus() TO authenticated;
