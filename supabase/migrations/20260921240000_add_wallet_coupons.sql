-- Migration: Add wallet_coupons — coupons manually issued to a specific
-- user by an admin, shown in that user's My Wallet.
--
-- Only a SELECT policy exists for the owner: creation is admin-only via a
-- service-role server action (src/app/actions/admin.ts), and redemption
-- goes through a narrow SECURITY DEFINER function rather than an UPDATE
-- policy, so a user can only ever flip redeemed_at on their own coupon and
-- can't edit title/description/expiry (same principle as
-- confirm_digital_receipt / register_qr_pro_click elsewhere in this app).

CREATE TABLE IF NOT EXISTS wallet_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  expires_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  issued_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_coupons_user_id_idx ON wallet_coupons (user_id);
CREATE INDEX IF NOT EXISTS wallet_coupons_code_idx ON wallet_coupons (code);

ALTER TABLE wallet_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own coupons"
  ON wallet_coupons FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Idempotent self-redemption: only the owner can redeem, and only once.
CREATE OR REPLACE FUNCTION redeem_wallet_coupon(p_code TEXT)
RETURNS TABLE (code TEXT, already_redeemed BOOLEAN, redeemed_at TIMESTAMPTZ)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
  v_user_id UUID;
  v_redeemed_at TIMESTAMPTZ;
BEGIN
  SELECT id, user_id, wallet_coupons.redeemed_at INTO v_id, v_user_id, v_redeemed_at
  FROM wallet_coupons WHERE wallet_coupons.code = p_code;

  IF v_id IS NULL OR v_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN;
  END IF;

  IF v_redeemed_at IS NOT NULL THEN
    RETURN QUERY SELECT p_code, true, v_redeemed_at;
    RETURN;
  END IF;

  UPDATE wallet_coupons
  SET redeemed_at = now()
  WHERE id = v_id
  RETURNING wallet_coupons.redeemed_at INTO v_redeemed_at;

  RETURN QUERY SELECT p_code, false, v_redeemed_at;
END;
$$;

GRANT EXECUTE ON FUNCTION redeem_wallet_coupon(TEXT) TO authenticated;
