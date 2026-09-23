'use client'

import { useTranslations, useLocale } from 'next-intl'
import Link from '@/components/LocalizedLink'
import { FileSpreadsheet } from 'lucide-react'

type Quote = {
  id: string
  quote_number: number
  client_name: string
  issue_date: string
  total: number
}

export default function QuoteCard({ quote, fromDashboardSuffix = '' }: { quote: Quote; fromDashboardSuffix?: string }) {
  const t = useTranslations('preventivi')
  const locale = useLocale()

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-[var(--gold-pale)] text-[var(--gold)] flex items-center justify-center shrink-0">
        <FileSpreadsheet className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 truncate">
            {t('quoteNumberLabel', { number: quote.quote_number })}
          </h3>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {quote.client_name} · {new Date(quote.issue_date).toLocaleDateString(locale)}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="font-bold text-[var(--ink)]">{quote.total.toLocaleString(locale, { style: 'currency', currency: 'EUR' })}</p>
      </div>

      <Link
        href={`/marketplace/preventivi/${quote.id}${fromDashboardSuffix}`}
        className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all shrink-0"
      >
        {t('details')}
      </Link>
    </div>
  )
}
