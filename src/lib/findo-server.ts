import type { SupabaseClient } from '@supabase/supabase-js'
import { hasActiveToolAccess } from '@/lib/subscriptionGate'

export function hasActiveFindoAccess(supabase: SupabaseClient, userId: string): Promise<boolean> {
  return hasActiveToolAccess(supabase, userId, 'findo')
}
