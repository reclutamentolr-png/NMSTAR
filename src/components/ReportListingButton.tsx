'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Flag, LoaderCircle } from 'lucide-react'
import { reportListingAction } from '@/app/actions/listings'

export default function ReportListingButton({ listingId }: { listingId: string }) {
  const t = useTranslations('marketplace')
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async () => {
    setLoading(true)
    setMessage(null)
    const result = await reportListingAction(listingId, reason)
    setLoading(false)

    if (!result.success) {
      const key = result.message === 'own_listing' ? 'reportErrorOwn' : 'reportErrorGeneric'
      setMessage({ type: 'error', text: t(key) })
      return
    }

    setMessage({ type: 'success', text: t('reportSuccess') })
    setOpen(false)
  }

  if (message?.type === 'success') {
    return <p className="text-xs text-green-700 mt-2">{message.text}</p>
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-gray-400 hover:text-red-600 text-xs flex items-center gap-1 mt-2"
      >
        <Flag className="w-3 h-3" /> {t('reportListing')}
      </button>
    )
  }

  return (
    <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3">
      <p className="text-xs font-semibold text-red-900 mb-2">{t('reportListingPrompt')}</p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder={t('reportListingPlaceholder')}
        className="w-full text-xs px-2 py-1.5 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-400 mb-2"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 disabled:opacity-50"
        >
          {loading && <LoaderCircle className="w-3 h-3 animate-spin" />}
          {t('reportSubmit')}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-gray-700 px-2">
          {t('cancel')}
        </button>
      </div>
      {message && <p className="mt-2 text-xs text-red-600">{message.text}</p>}
    </div>
  )
}
