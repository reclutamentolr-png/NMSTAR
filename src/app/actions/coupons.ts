'use server'

import { createClient } from '@/lib/supabase/server'

/** Owner-only, idempotent self-redemption of a wallet coupon. */
export async function redeemCoupon(code: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'notLoggedIn' }

  const { data, error } = await supabase
    .rpc('redeem_wallet_coupon', { p_code: code })
    .single<{ code: string; already_redeemed: boolean; redeemed_at: string }>()

  if (error || !data) return { success: false, message: 'notFound' }
  return { success: true, alreadyRedeemed: data.already_redeemed, redeemedAt: data.redeemed_at }
}
