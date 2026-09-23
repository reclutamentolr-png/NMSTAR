'use server'

import { createClient } from '@/lib/supabase/server'
import type { AdminMessageRow } from '@/lib/adminMessages'

/** Broadcasts and individual messages the current user hasn't dismissed yet. */
export async function getUnreadMessages(): Promise<AdminMessageRow[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase.rpc('get_unread_messages_for_me')
  if (error) {
    console.error('[Messages] getUnreadMessages failed:', error)
    return []
  }
  return data || []
}

/** Dismissing a message is the user's own action — no admin check needed. */
export async function markMessageRead(messageId: string): Promise<{ success: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false }

  const { error } = await supabase.from('admin_message_reads').insert({ message_id: messageId, user_id: user.id })
  if (error) {
    console.error('[Messages] markMessageRead failed:', error)
    return { success: false }
  }
  return { success: true }
}
