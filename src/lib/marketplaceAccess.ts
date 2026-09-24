import type { SupabaseClient } from '@supabase/supabase-js'

export const REQUIRES_SUBSCRIPTION = [
  'link-in-bio',
  'memolife',
  'neurobalance',
  'svat',
  'offermaker',
  'qr-code-pro',
  'life-calendar',
  'findo',
  'digital-receipt',
  'aureya',
  'preventivi',
  'kumani-cv',
  'spendly',
]

export interface MarketplaceAccessState {
  isSettingEnabled: (toolName: string) => boolean
  isToolEnabled: (toolName: string) => boolean
}

/**
 * Shared by the marketplace landing page and each category page: fetches
 * the user's subscription status and the admin's per-tool on/off settings,
 * and exposes the two gating checks every marketplace listing needs.
 */
export async function getMarketplaceAccessState(
  supabase: SupabaseClient,
  userId: string
): Promise<MarketplaceAccessState> {
  let profile: { subscription_status?: string; subscription_expires_at?: string | null } | null = null
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, subscription_status, subscription_expires_at')
      .eq('id', userId)
      .single()

    if (error) {
      // Fallback: column might not exist yet, retry with just subscription_status
      if (
        error.message?.includes('subscription_expires_at') ||
        error.message?.includes('column') ||
        error.message?.includes('DoesNotExist')
      ) {
        const { data: fallbackData } = await supabase
          .from('profiles')
          .select('id, subscription_status')
          .eq('id', userId)
          .single()
        profile = fallbackData
      } else {
        profile = data
      }
    } else {
      profile = data
    }
  } catch {
    // If anything fails, still show the marketplace (cards will be disabled for premium)
  }

  const { data: toolsSettings } = await supabase.from('marketplace_settings').select('tool_name, is_enabled')

  const toolsStatus: Record<string, boolean> = {}
  toolsSettings?.forEach((tool: { tool_name: string; is_enabled: boolean }) => {
    toolsStatus[tool.tool_name] = tool.is_enabled
  })

  const isSettingEnabled = (toolName: string): boolean => toolsStatus[toolName] !== false

  const now = new Date()
  const subscriptionExpiresAt = profile?.subscription_expires_at ? new Date(profile.subscription_expires_at) : null
  const hasActiveSubscription =
    profile?.subscription_status === 'active' && (!subscriptionExpiresAt || subscriptionExpiresAt.getTime() > now.getTime())

  const isToolEnabled = (toolName: string): boolean => {
    if (!isSettingEnabled(toolName)) return false
    if (REQUIRES_SUBSCRIPTION.includes(toolName) && !hasActiveSubscription) return false
    return true
  }

  return { isSettingEnabled, isToolEnabled }
}
