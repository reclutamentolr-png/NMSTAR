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
 * All profiles personally sponsored by `sponsorId` (profiles.sponsor_id),
 * with the fields needed to tell which ones are active subscribers.
 * Falls back to a query without subscription_expires_at if that column
 * doesn't exist yet on this database (same defensive pattern used in
 * marketplace/page.tsx).
 */
export async function fetchDirectSponsored(
  supabase: SupabaseClient,
  sponsorId: string
): Promise<SponsoredProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, referral_code, phone, created_at, subscription_status, subscription_expires_at')
    .eq('sponsor_id', sponsorId)
    .order('created_at', { ascending: true })

  if (!error) return data || []

  const { data: fallbackData } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, referral_code, phone, created_at, subscription_status')
    .eq('sponsor_id', sponsorId)
    .order('created_at', { ascending: true })
  return fallbackData || []
}
