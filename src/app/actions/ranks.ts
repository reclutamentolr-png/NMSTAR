'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Marks a rank-achievement popup as dismissed so it never shows again for
 * this user, on any device (stored on profiles.qualifications_seen, not
 * localStorage).
 */
export async function markRankSeen(rankKey: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false }

  const { data: profile } = await supabase
    .from('profiles')
    .select('qualifications_seen')
    .eq('id', user.id)
    .single()

  const seen: string[] = profile?.qualifications_seen || []
  if (seen.includes(rankKey)) return { success: true }

  const { error } = await supabase
    .from('profiles')
    .update({ qualifications_seen: [...seen, rankKey] })
    .eq('id', user.id)

  return { success: !error }
}
