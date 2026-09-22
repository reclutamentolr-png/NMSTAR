import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_DASHBOARD_LAYOUT, isValidDashboardLayout, type DashboardLayoutId } from './dashboardLayouts'

/**
 * Reads the site-wide active dashboard layout from `system_settings`
 * (key 'dashboard_layout'), same table/JSON-string convention already used
 * for maintenance_mode etc. (see AdminDashboard.tsx / actions/system.ts).
 * Falls back to the default for a missing row, an unparsable value, or an
 * id that isn't (or no longer is) in the DASHBOARD_LAYOUTS registry.
 */
export async function getActiveDashboardLayout(supabase: SupabaseClient): Promise<DashboardLayoutId> {
  const { data } = await supabase.from('system_settings').select('value').eq('key', 'dashboard_layout').maybeSingle()

  if (!data) return DEFAULT_DASHBOARD_LAYOUT

  try {
    const parsed = JSON.parse(data.value)
    if (isValidDashboardLayout(parsed)) return parsed
  } catch {
    if (isValidDashboardLayout(data.value)) return data.value
  }

  return DEFAULT_DASHBOARD_LAYOUT
}
