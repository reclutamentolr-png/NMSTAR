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

// 'dark' (default) is for the ink-colored hero card (Tipo 1's referral
// section); 'light' is for a plain paper/white card (the /dashboard/rete
// page), where the dark variant's pale-on-dark styling would be nearly
// unreadable.
export default function DirectAffiliatesList({
  people,
  variant = 'dark',
}: {
  people: SponsoredPerson[]
  variant?: 'dark' | 'light'
}) {
  const t = useTranslations('dashboard')
  const locale = useLocale()
  const [open, setOpen] = useState(false)

  if (people.length === 0) return null

  const isLight = variant === 'light'

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 font-medium transition-colors ${
          isLight ? 'text-base text-[var(--ink)] hover:text-[var(--gold)]' : 'text-sm text-stone-300 hover:text-white'
        }`}
      >
        <Users className="h-4 w-4" />
        {t('directAffiliatesListToggle', { count: people.length })}
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <ul
          className={`mt-3 space-y-2 rounded-xl border p-3 ${
            isLight ? 'border-gray-200 bg-gray-50' : 'border-white/15 bg-white/5'
          }`}
        >
          {people.map((person) => (
            <li key={person.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${person.is_active ? 'bg-emerald-400' : 'bg-stone-500'}`}
                    aria-hidden="true"
                  />
                  <p className={`truncate font-medium ${isLight ? 'text-[var(--ink)]' : 'text-white'}`}>
                    {person.first_name} {person.last_name}
                  </p>
                </div>
                {person.referral_code && (
                  <p className={`ml-3.5 font-mono text-xs ${isLight ? 'text-[var(--gold)]' : 'text-[var(--gold-bright)]'}`}>
                    {person.referral_code}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <span
                  className={`block text-[10px] font-semibold uppercase tracking-wide ${person.is_active ? 'text-emerald-500' : isLight ? 'text-gray-400' : 'text-stone-500'}`}
                >
                  {person.is_active ? t('affiliateActive') : t('affiliateInactive')}
                </span>
                <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-stone-400'}`}>
                  {new Date(person.created_at).toLocaleDateString(locale)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
