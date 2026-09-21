import { Star, Sparkles, Crown } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import type { RankDefinition } from '@/lib/ranks'

const RANK_ICONS = { Star, Sparkles, Crown }

export default async function RankBadge({ rank }: { rank: RankDefinition }) {
  const t = await getTranslations('dashboard')
  const Icon = RANK_ICONS[rank.icon]

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)]/55 bg-[var(--gold)]/15 px-3 py-1 text-xs font-bold text-[var(--gold-bright)]">
      <Icon className="h-3.5 w-3.5" />
      {t(rank.labelKey)}
    </span>
  )
}
