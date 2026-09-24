import type { SupabaseClient } from '@supabase/supabase-js'
import { hasActiveToolAccess } from '@/lib/subscriptionGate'

export function hasActiveSpendlyAccess(supabase: SupabaseClient, userId: string): Promise<boolean> {
  return hasActiveToolAccess(supabase, userId, 'spendly')
}
