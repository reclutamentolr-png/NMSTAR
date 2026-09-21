import { createClient } from '@/lib/supabase/server'

/**
 * Awards +1 daily_points the first time this tool is used today by the
 * current user. Safe to call after any mutation succeeds: the actual
 * once-per-tool-per-day cap is enforced by a unique constraint in the
 * award_tool_point() RPC, not here, so repeating the call is a no-op
 * rather than a double-award. Never throws — a failure here must not
 * fail the action that already succeeded.
 */
export async function awardToolPoint(toolName: string) {
  try {
    const supabase = await createClient()
    await supabase.rpc('award_tool_point', { p_tool_name: toolName })
  } catch {
    // Never let a points-award failure fail the caller's already-succeeded action.
  }
}
