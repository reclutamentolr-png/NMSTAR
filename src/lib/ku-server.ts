import type { SupabaseClient } from '@supabase/supabase-js'
import type { KuWalletData } from '@/components/ku/KuRewardsSection'
import type { KuFeatureRow, KuUnlockRow } from '@/lib/ku'

// Dati per "Usa i tuoi KU Points" nel Portafoglio (sessione dell'utente:
// impostazioni e catalogo sono leggibili, acquisti e movimenti solo i propri).
export async function loadKuWalletData(
  supabase: SupabaseClient,
  profile: {
    daily_points?: number | null
    ku_earned_total?: number | null
    subscription_status?: string | null
    subscription_source?: string | null
    subscription_expires_at?: string | null
  }
): Promise<KuWalletData> {
  const yearAgo = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString()
  const [{ data: features }, { data: unlocks }, { data: purchases }, { data: tx }] = await Promise.all([
    supabase.from('ku_features').select('key, enabled, config'),
    supabase.from('ku_unlocks').select('key, tool, cost_ku, enabled').order('cost_ku'),
    supabase.from('ku_unlock_purchases').select('unlock_key'),
    supabase
      .from('ku_transactions')
      .select('kind, details, created_at')
      .in('kind', ['conversion', 'renewal_discount'])
      .gte('created_at', yearAgo),
  ])

  // Mese solare italiano, come il tetto calcolato nel database.
  const romeMonth = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit' }).format(new Date())
  const inRomeMonth = (iso: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit' }).format(new Date(iso)) === romeMonth

  const rows = (tx ?? []) as { kind: string; details: { points?: number; status?: string } | null; created_at: string }[]
  const conversionUsedThisMonth = rows
    .filter((row) => row.kind === 'conversion' && inRomeMonth(row.created_at))
    .reduce((sum, row) => sum + Number(row.details?.points ?? 0), 0)
  const renewalUsedThisYear = rows.filter((row) => row.kind === 'renewal_discount' && row.details?.status !== 'failed').length

  const expires = profile.subscription_expires_at ? new Date(profile.subscription_expires_at).getTime() : null
  const hasStripeSubscription =
    profile.subscription_status === 'active' &&
    profile.subscription_source === 'stripe' &&
    // Confronto con la scadenza fatto qui (server), non durante il render.
    (expires === null || expires > Date.now())

  return {
    features: (features ?? []) as KuFeatureRow[],
    unlocks: (unlocks ?? []) as KuUnlockRow[],
    ownedUnlocks: (purchases ?? []).map((row: { unlock_key: string }) => row.unlock_key),
    balance: profile.daily_points ?? 0,
    earnedTotal: profile.ku_earned_total ?? 0,
    conversionUsedThisMonth,
    renewalUsedThisYear,
    hasStripeSubscription,
  }
}
