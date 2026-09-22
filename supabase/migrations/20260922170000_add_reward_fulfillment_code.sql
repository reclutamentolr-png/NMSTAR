-- Migration: lets an admin fulfill a reward redemption (e.g. "Buono Amazon
-- 20€") by entering the real code they bought/obtained (an Amazon gift
-- card code, etc.). fulfillment_code is kept here as the admin's own audit
-- record of what was sent; the code itself is ALSO copied into a new
-- wallet_coupons row for the redeeming user (created by the
-- fulfillRewardRedemption server action, not by this migration), so it
-- shows up where Kumani already know to look — My Wallet → Coupon — using
-- the existing coupon UI/PDF flow instead of building a parallel one.

ALTER TABLE reward_redemptions ADD COLUMN IF NOT EXISTS fulfillment_code TEXT;
