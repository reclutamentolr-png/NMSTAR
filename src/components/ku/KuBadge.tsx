import { getTranslations } from 'next-intl/server'
import { Award } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { currentKuBadge, type KuBadgesConfig } from '@/lib/ku'

// Badge di costanza (Gestione KU → 3): compare solo se il metodo è attivo e
// l'utente ha raggiunto almeno la prima soglia di KU guadagnati in totale.
export default async function KuBadge({ earnedTotal }: { earnedTotal: number }) {
  const supabase = await createClient()
  const { data } = await supabase.from('ku_features').select('enabled, config').eq('key', 'badges').maybeSingle()
  if (!data?.enabled) return null
  const badge = currentKuBadge((data.config as KuBadgesConfig).levels, earnedTotal)
  if (!badge) return null
  const t = await getTranslations('kuRewards')

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--gold)]/40 bg-[var(--gold-pale)] px-2.5 py-1 text-xs font-bold text-[var(--ink)]">
      <Award className="h-3.5 w-3.5 text-[var(--gold)]" />
      {t.has(`badge_${badge.key}`) ? t(`badge_${badge.key}`) : badge.key}
    </span>
  )
}
