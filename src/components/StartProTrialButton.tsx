'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Gift, LoaderCircle } from 'lucide-react'
import { startProTrial } from '@/app/actions/plans'

// "Prova Pro gratis" sulla pagina /pro per chi è iscritto e non l'ha mai usata.
export default function StartProTrialButton({ label }: { label: string }) {
  const t = useTranslations('plans')
  const router = useRouter()
  const locale = useLocale()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await startProTrial()
      if (result.success) {
        router.push(`/${locale}/dashboard`)
        router.refresh()
        return
      }
      setError(result.reason === 'already_used' ? t('trialAlreadyUsed') : t('trialError'))
    } catch {
      setError(t('trialError'))
    }
    setBusy(false)
  }

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--gold)] px-6 py-3 font-bold text-[var(--gold-bright)] transition-colors hover:bg-[var(--gold)]/10 disabled:opacity-50"
      >
        {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Gift className="h-5 w-5" />} {label}
      </button>
      {error && <p className="mt-3 rounded-xl bg-amber-500/15 px-4 py-3 text-sm font-semibold text-amber-200">{error}</p>}
    </div>
  )
}
