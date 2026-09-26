import { getTranslations } from 'next-intl/server'
import { ArrowRight, Briefcase } from 'lucide-react'
import Link from '@/components/LocalizedLink'

// Invito compatto al piano Pro per chi non ce l'ha: porta alla pagina /pro.
export default async function ProTeaser() {
  const t = await getTranslations('proArea')
  return (
    <Link
      href="/pro"
      className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--gold)]/40 bg-[var(--ink)] px-5 py-4 text-white shadow-sm transition-colors hover:border-[var(--gold)]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-bright)] text-[var(--ink)]">
          <Briefcase className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="font-semibold">{t('teaserTitle')}</p>
          <p className="text-xs text-white/60">{t('teaserBody')}</p>
        </div>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-[var(--gold-bright)]">
        <span className="hidden sm:inline">{t('teaserCta')}</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  )
}
