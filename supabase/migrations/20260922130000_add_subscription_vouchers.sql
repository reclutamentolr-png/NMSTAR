-- Migration: Add subscription_vouchers — a Kumano with >=49 daily_points can
-- mint a single-use code that grants the redeemer an active subscription
-- (same 1-year grant the Stripe webhook gives on checkout.session.completed,
-- see src/app/api/webhooks/stripe/route.ts and src/lib/subscriptionGate.ts).
--
-- Security model mirrors wallet_coupons / daily_tool_points: RLS only ever
-- grants SELECT to the parties involved. Every mutation (spend points +
-- mint code, redeem code + activate subscription) goes through a narrow
-- SECURITY DEFINER function that does the whole thing as one atomic
-- statement sequence, never an app-side read-then-write:
--   * create_subscription_voucher() decrements daily_points with the
--     "WHERE ... AND daily_points >= 49" guard baked into the UPDATE itself,
--     so two concurrent creation requests can't both succeed off a stale
--     balance read.
--   * redeem_subscription_voucher() flips status 'active' -> 'redeemed'
--     with "WHERE status = 'active'" baked into the UPDATE itself, so two
--     concurrent redemptions of the same code can't both succeed — this is
--     the actual single-use guarantee, not an app-side check.
--   * Self-redemption (the creator redeeming their own voucher) is blocked
--     explicitly, per product requirement.

CREATE TABLE IF NOT EXISTS subscription_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'revoked')),
  redeemed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_vouchers_created_by_idx ON subscription_vouchers (created_by);
CREATE INDEX IF NOT EXISTS subscription_vouchers_redeemed_by_idx ON subscription_vouchers (redeemed_by);

ALTER TABLE subscription_vouchers ENABLE ROW LEVEL SECURITY;

-- Owner can see vouchers they created (to track status) and ones they
-- redeemed (their own redemption history). No INSERT/UPDATE/DELETE policy
-- exists for the authenticated role: creation and redemption only happen
-- inside the SECURITY DEFINER functions below, and admin revocation only
-- through the service-role key (src/app/actions/admin.ts).
CREATE POLICY "Owner can view own vouchers"
  ON subscription_vouchers FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = created_by OR (select auth.uid()) = redeemed_by);

-- Spends 49 daily_points and mints a single-use voucher code for the
-- caller. Returns success = false (with the caller's current balance, so
-- the UI can show "you need N more points") if they don't have enough —
-- the balance check and the deduction are the same atomic UPDATE, so this
-- can't be raced by firing two creation requests at once.
CREATE OR REPLACE FUNCTION create_subscription_voucher()
RETURNS TABLE (success BOOLEAN, code TEXT, new_balance INT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance INT;
  v_code TEXT;
  v_attempt INT := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  UPDATE profiles
  SET daily_points = daily_points - 49
  WHERE id = auth.uid() AND COALESCE(daily_points, 0) >= 49
  RETURNING daily_points INTO v_balance;

  IF NOT FOUND THEN
    SELECT COALESCE(daily_points, 0) INTO v_balance FROM profiles WHERE id = auth.uid();
    RETURN QUERY SELECT false, NULL::TEXT, COALESCE(v_balance, 0);
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
      -- Extremely unlikely (10-char code from a 32-char alphabet), but if it
      -- happens 5 times in a row something is wrong — abort the whole
      -- transaction, which also rolls back the points deduction above so
      -- the caller isn't charged for a voucher that was never created.
      IF v_attempt >= 5 THEN
        RAISE EXCEPTION 'voucher_code_generation_failed';
      END IF;
    END;
  END LOOP;

  RETURN QUERY SELECT true, v_code, v_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION create_subscription_voucher() TO authenticated;

-- Redeems a voucher code for the caller: single-use, and never redeemable
-- by its own creator. On success, activates the caller's subscription with
-- the same 1-year-from-now grant the real Stripe webhook gives.
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

  -- The real single-use guarantee: this UPDATE only affects a row if it is
  -- still 'active' at the moment it runs, so two concurrent redemption
  -- attempts for the same code can never both succeed.
  UPDATE subscription_vouchers
  SET status = 'redeemed', redeemed_by = auth.uid(), redeemed_at = now()
  WHERE id = v_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'already_used', NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  v_expires := now() + interval '1 year';

  UPDATE profiles
  SET subscription_status = 'active', subscription_expires_at = v_expires
  WHERE id = auth.uid();

  RETURN QUERY SELECT true, NULL::TEXT, v_expires;
END;
$$;

GRANT EXECUTE ON FUNCTION redeem_subscription_voucher(TEXT) TO authenticated;
