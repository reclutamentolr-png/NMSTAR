-- Migration: "Bonus Struttura" — until now, a Kumano whose matrix slots
-- fill via spillover (someone else's overflow, not their own personal
-- sponsorship) got zero benefit from it: claim_rank_bonus only rewards
-- profiles.sponsor_id (personal recruitment), completely independent of
-- matrix position. This adds a small, separate reward tied specifically to
-- the matrix mechanic itself, so spillover has an actual purpose again.
--
-- Rule: for each of a Kumano's 5 direct matrix slots that gets filled by a
-- REAL, Stripe-paying active subscriber — regardless of whether that person
-- is their own sponsee or arrived via someone else's spillover — they earn
-- a flat, admin-configurable amount of network_points, once per slot, ever.
-- The per-slot amount lives in system_settings ('matrix_slot_bonus_points',
-- default 5) so it can be tuned without a deploy, same mechanism already
-- used for maintenance_mode / dashboard_layout.
--
-- Security: gated on subscription_source = 'stripe', identical to
-- claim_rank_bonus (see 20260922160000_gate_rank_bonus_on_real_payment.sql)
-- — a slot filled by a voucher- or admin-activated account must not pay
-- out, or this reopens the exact same free-account farming loop that
-- migration closed.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS matrix_bonus_slots_paid INT NOT NULL DEFAULT 0;

-- Matrix positions are assigned sequentially (find_spillover_position always
-- hands out v_children + 1), so a parent's direct children always occupy
-- positions 1..N with no gaps — tracking how many slots have been paid as a
-- single count is therefore equivalent to tracking a set of paid positions,
-- and much simpler to reason about atomically.
CREATE OR REPLACE FUNCTION claim_matrix_slot_bonus()
RETURNS TABLE (success BOOLEAN, awarded INT, slots_paid INT, new_network_points INT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_my_node_id UUID;
  v_active_slots INT;
  v_already_paid INT;
  v_new_slots INT;
  v_bonus_per_slot INT;
  v_awarded INT;
  v_balance INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_my_node_id FROM matrix_nodes WHERE user_id = auth.uid();
  IF v_my_node_id IS NULL THEN
    RETURN QUERY SELECT false, 0, 0, COALESCE((SELECT network_points FROM profiles WHERE id = auth.uid()), 0);
    RETURN;
  END IF;

  -- Count of the (up to 5) direct matrix children who are genuinely active
  -- Stripe subscribers right now.
  SELECT count(*) INTO v_active_slots
  FROM matrix_nodes child
  JOIN profiles p ON p.id = child.user_id
  WHERE child.parent_id = v_my_node_id
    AND p.subscription_status = 'active'
    AND p.subscription_source = 'stripe'
    AND (p.subscription_expires_at IS NULL OR p.subscription_expires_at > now());

  SELECT COALESCE(matrix_bonus_slots_paid, 0) INTO v_already_paid FROM profiles WHERE id = auth.uid();
  v_new_slots := GREATEST(v_active_slots - v_already_paid, 0);

  IF v_new_slots = 0 THEN
    SELECT COALESCE(network_points, 0) INTO v_balance FROM profiles WHERE id = auth.uid();
    RETURN QUERY SELECT false, 0, v_already_paid, v_balance;
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(value, '')::int, 5) INTO v_bonus_per_slot
  FROM system_settings WHERE key = 'matrix_slot_bonus_points';
  v_bonus_per_slot := COALESCE(v_bonus_per_slot, 5);

  v_awarded := v_new_slots * v_bonus_per_slot;

  UPDATE profiles
  SET
    network_points = COALESCE(network_points, 0) + v_awarded,
    matrix_bonus_slots_paid = v_active_slots
  WHERE id = auth.uid()
    -- Re-check the same stale-read guard atomically: only apply if nobody
    -- else already advanced matrix_bonus_slots_paid concurrently.
    AND COALESCE(matrix_bonus_slots_paid, 0) = v_already_paid
  RETURNING network_points INTO v_balance;

  IF NOT FOUND THEN
    SELECT COALESCE(network_points, 0) INTO v_balance FROM profiles WHERE id = auth.uid();
    RETURN QUERY SELECT false, 0, v_already_paid, v_balance;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_awarded, v_active_slots, v_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_matrix_slot_bonus() TO authenticated;
