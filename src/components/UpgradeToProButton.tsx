'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Crown, LoaderCircle } from 'lucide-react'
import { upgradeToPro } from '@/app/actions/plans'

// "Passa a Pro" per chi ha già un abbonamento Base con carta.
export default function UpgradeToProButton({ label, note }: { label: string; note: string }) {
  const t = useTranslations('plans')
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const upgrade = async () => {
    if (!confirm(note)) return
    setBusy(true)
    setMessage(null)
    const result = await upgradeToPro()
    setBusy(false)
    if (result.success) {
      setMessage({ ok: true, text: t('upgradeDone') })
      router.refresh()
    } else {
      setMessage({ ok: false, text: t(`upgradeError_${result.reason ?? 'stripe_error'}`) })
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={upgrade}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] px-6 py-3.5 font-bold text-[var(--ink)] disabled:opacity-50"
      >
        {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Crown className="h-5 w-5" />} {label}
      </button>
      <p className="mt-2 text-xs text-gray-400">{note}</p>
      {message && <p className={`mt-3 text-sm ${message.ok ? 'text-green-300' : 'text-amber-300'}`}>{message.text}</p>}
    </div>
  )
}
