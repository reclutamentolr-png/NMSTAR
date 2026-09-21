import type { SupabaseClient } from '@supabase/supabase-js'

export interface SubscriptionProfile {
  subscription_status: string | null
  subscription_expires_at?: string | null
}

/**
 * Single source of truth for "is this subscription active" — status must be
 * 'active' and, if an expiry is set, it must not have passed yet. Used
 * anywhere a profile's paying status matters: tool gating, the leaderboard,
 * and rank/qualification thresholds.
 */
export function isActiveSubscription(profile: SubscriptionProfile | null | undefined): boolean {
  if (!profile || profile.subscription_status !== 'active') return false
  if (!profile.subscription_expires_at) return true
  return new Date(profile.subscription_expires_at).getTime() > Date.now()
}

/**
 * Checks for an active subscription. Falls back to a column-less select when
 * `subscription_expires_at` doesn't exist yet on this database (that migration
 * may not be applied), same defensive pattern as marketplace/page.tsx.
 */
async function getSubscriptionProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('subscription_status, subscription_expires_at')
    .eq('id', userId)
    .single()

  if (!error) return data

  const { data: fallback } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', userId)
    .single()

  return fallback
}

/**
 * Gate used by premium marketplace tools that must re-check access server-side
 * (not just hide the marketplace card), because each use has a real cost or
 * consumes a shared resource. Checks both an active subscription and the
 * per-tool `marketplace_settings.is_enabled` admin toggle.
 */
export async function hasActiveToolAccess(
  supabase: SupabaseClient,
  userId: string,
  toolName: string
): Promise<boolean> {
  const profile = await getSubscriptionProfile(supabase, userId)

  if (!isActiveSubscription(profile)) return false

  const { data: toolSetting } = await supabase
    .from('marketplace_settings')
    .select('is_enabled')
    .eq('tool_name', toolName)
    .single()

  if (toolSetting && toolSetting.is_enabled === false) return false

  return true
}
