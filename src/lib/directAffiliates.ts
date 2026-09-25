import type { SupabaseClient } from '@supabase/supabase-js'

export interface SponsoredProfile {
  id: string
  first_name: string | null
  last_name: string | null
  referral_code: string | null
  phone: string | null
  created_at: string
  subscription_status: string | null
  subscription_expires_at?: string | null
}

/**
 * All profiles personally sponsored by the logged-in user (profiles.sponsor_id),
 * with the fields needed to tell which ones are active subscribers.
 * Goes through get_my_direct_sponsored(): the phone column of other users is
 * no longer readable directly, only that of one's own direct sponsees.
 */
export async function fetchDirectSponsored(supabase: SupabaseClient): Promise<SponsoredProfile[]> {
  const { data } = await supabase.rpc('get_my_direct_sponsored')
  return (data as SponsoredProfile[] | null) || []
}
