'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { X, Megaphone, Mail } from 'lucide-react'
import { getUnreadMessages, markMessageRead } from '@/app/actions/messages'
import { getLocalizedMessageText, type AdminMessageRow } from '@/lib/adminMessages'

export default function AdminMessagePopup() {
  const t = useTranslations('adminMessage')
  const locale = useLocale()
  const [queue, setQueue] = useState<AdminMessageRow[]>([])
  const [dismissing, setDismissing] = useState(false)

  useEffect(() => {
    getUnreadMessages().then(setQueue)
  }, [])

  const current = queue[0]
  if (!current) return null

  const handleClose = async () => {
    setDismissing(true)
    await markMessageRead(current.id)
    setDismissing(false)
    setQueue((prev) => prev.slice(1))
  }

  const Icon = current.type === 'broadcast' ? Megaphone : Mail
  const badgeLabel = current.type === 'broadcast' ? t('broadcastBadge') : t('individualBadge')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--gold)]/45 bg-[var(--ink)] p-8 text-white shadow-[0_25px_60px_rgba(0,0,0,0.4)]">
        <button
          onClick={handleClose}
          disabled={dismissing}
          aria-label="Close"
          className="absolute right-4 top-4 text-stone-400 transition-colors hover:text-white disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--gold)]/55 bg-[var(--gold)]/10">
          <Icon className="h-7 w-7 text-[var(--gold-bright)]" />
        </div>

        <p className="mb-2 text-center text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold)]">
          {badgeLabel}
        </p>
        <h2 className="mb-3 text-center text-xl font-bold text-white">
          {getLocalizedMessageText(current.title, locale)}
        </h2>
        <p className="text-center text-sm leading-6 text-stone-300 whitespace-pre-wrap">
          {getLocalizedMessageText(current.body, locale)}
        </p>

        <button
          onClick={handleClose}
          disabled={dismissing}
          className="mt-6 w-full rounded-xl bg-[var(--gold)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--gold-bright)] disabled:opacity-50"
        >
          {t('closeAction')}
        </button>
      </div>
    </div>
  )
}
