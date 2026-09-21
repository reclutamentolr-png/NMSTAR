'use client'

import { useTranslations } from 'next-intl'
import OfferMakerQR from '@/components/OfferMakerQR'

type Props = {
  firstName: string | null
  lastName: string | null
  memberId: string | null
  memberSince: string
  planLabel: string
  rankLabel: string | null
  qrUrl: string
}

export default function WalletMembershipCard({
  firstName,
  lastName,
  memberId,
  memberSince,
  planLabel,
  rankLabel,
  qrUrl,
}: Props) {
  const t = useTranslations('wallet')

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--gold)]/45 bg-[var(--ink)] p-6 text-white">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--gold)]/10 blur-2xl" />
      <div className="relative z-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 space-y-3">
          <p className="text-xl font-bold text-white">
            {firstName} {lastName}
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-stone-400">{t('memberId')}</p>
              <p className="font-mono font-semibold text-[var(--gold-bright)]">{memberId}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">{t('memberSince')}</p>
              <p className="font-semibold text-white">{memberSince}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">{t('currentPlan')}</p>
              <p className="font-semibold text-white">{planLabel}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">{t('currentRank')}</p>
              <p className="font-semibold text-white">{rankLabel || t('noRank')}</p>
            </div>
          </div>
        </div>
        <OfferMakerQR
          url={qrUrl}
          fileName={`member-${memberId}`}
          generatingLabel="..."
          downloadLabel={t('downloadCard')}
          accentClassName="bg-[var(--gold)] hover:bg-[var(--gold-bright)] text-[var(--ink)]"
        />
      </div>
    </div>
  )
}
