'use server'

import { createClient } from '@/lib/supabase/server'

const VOUCHER_COST = 49

/**
 * Spends 49 network_points (never daily_points — that's reserved for
 * community listings) and mints a single-use subscription voucher for the
 * caller. The balance check + deduction + code minting all happen inside
 * one SECURITY DEFINER Postgres transaction (create_subscription_voucher,
 * see supabase/migrations/20260922150000_fix_voucher_points_and_reward_tiers.sql)
 * so this action can't be raced by firing two requests at once.
 */
export async function createVoucher() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false as const, message: 'notLoggedIn' as const }

  const { data, error } = await supabase
    .rpc('create_subscription_voucher')
    .single<{ success: boolean; code: string | null; new_balance: number }>()

  if (error || !data) return { success: false as const, message: 'error' as const }
  if (!data.success) {
    return { success: false as const, message: 'insufficientPoints' as const, balance: data.new_balance, cost: VOUCHER_COST }
  }
  return { success: true as const, code: data.code as string, balance: data.new_balance }
}

/**
 * Redeems a subscription voucher code: single-use, and never redeemable by
 * its own creator (both enforced inside redeem_subscription_voucher, not
 * here — this action is a thin pass-through so the RPC's atomicity is the
 * real guarantee).
 */
export async function redeemVoucher(code: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false as const, message: 'notLoggedIn' as const }

  const trimmed = code.trim().toUpperCase()
  if (!trimmed) return { success: false as const, message: 'notFound' as const }

  const { data, error } = await supabase
    .rpc('redeem_subscription_voucher', { p_code: trimmed })
    .single<{ success: boolean; reason: string | null; new_expires_at: string | null }>()

  if (error || !data) return { success: false as const, message: 'error' as const }
  if (!data.success) {
    return { success: false as const, message: (data.reason || 'error') as 'not_found' | 'already_used' | 'self_redemption' }
  }
  return { success: true as const, expiresAt: data.new_expires_at as string }
}

/** Lists vouchers the caller created, for their own wallet history. */
export async function listMyVouchers() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('subscription_vouchers')
    .select('id, code, status, created_at, redeemed_at')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  return data || []
}
