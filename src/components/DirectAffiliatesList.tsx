'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { ChevronDown, ChevronUp, Users } from 'lucide-react'

type SponsoredPerson = {
  id: string
  first_name: string | null
  last_name: string | null
  referral_code: string | null
  created_at: string
  is_active: boolean
}

export default function DirectAffiliatesList({ people }: { people: SponsoredPerson[] }) {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const [open, setOpen] = useState(false)

  if (people.length === 0) return null

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-stone-300 transition-colors hover:text-white"
      >
        <Users className="h-4 w-4" />
        {t('directAffiliatesListToggle', { count: people.length })}
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <ul className="mt-3 space-y-2 rounded-xl border border-white/15 bg-white/5 p-3">
          {people.map((person) => (
            <li key={person.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${person.is_active ? 'bg-emerald-400' : 'bg-stone-500'}`}
                    aria-hidden="true"
                  />
                  <p className="truncate font-medium text-white">
                    {person.first_name} {person.last_name}
                  </p>
                </div>
                {person.referral_code && (
                  <p className="ml-3.5 font-mono text-xs text-[var(--gold-bright)]">{person.referral_code}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <span
                  className={`block text-[10px] font-semibold uppercase tracking-wide ${person.is_active ? 'text-emerald-400' : 'text-stone-500'}`}
                >
                  {person.is_active ? t('affiliateActive') : t('affiliateInactive')}
                </span>
                <span className="text-xs text-stone-400">{new Date(person.created_at).toLocaleDateString(locale)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
