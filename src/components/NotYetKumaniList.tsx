'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { ChevronDown, ChevronUp, MessageCircle, UserPlus } from 'lucide-react'

type PendingPerson = {
  id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  created_at: string
}

function buildWhatsAppHref(phone: string | null, message: string): string {
  if (phone) {
    const digits = phone.replace(/[^\d+]/g, '').replace(/^\+/, '')
    if (digits) return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
  }
  // Nessun numero salvato: apre WhatsApp con il messaggio pronto, il KUMI
  // sceglie lui il contatto a cui inviarlo.
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

// See DirectAffiliatesList for the 'dark'/'light' variant rationale — this
// list is used both on Tipo 1's dark hero card and on the plain white
// /dashboard/rete page.
export default function NotYetKumaniList({
  people,
  senderName,
  loginUrl,
  variant = 'dark',
}: {
  people: PendingPerson[]
  senderName: string
  loginUrl: string
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
        <UserPlus className="h-4 w-4" />
        {t('notYetKumaniListToggle', { count: people.length })}
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className={`mt-3 rounded-xl border p-3 ${isLight ? 'border-gray-200 bg-gray-50' : 'border-white/15 bg-white/5'}`}>
          <p className={`mb-3 text-xs ${isLight ? 'text-gray-500' : 'text-stone-400'}`}>{t('notYetKumaniHint')}</p>
          <ul className="space-y-2">
            {people.map((person) => {
              const name = `${person.first_name || ''} ${person.last_name || ''}`.trim()
              const message = t('whatsappNudgeMessage', {
                name: person.first_name || name,
                sponsorName: senderName,
                loginUrl,
              })
              return (
                <li key={person.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className={`truncate font-medium ${isLight ? 'text-[var(--ink)]' : 'text-white'}`}>{name}</p>
                    <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-stone-400'}`}>
                      {new Date(person.created_at).toLocaleDateString(locale)}
                    </p>
                  </div>
                  <a
                    href={buildWhatsAppHref(person.phone, message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {t('sendWhatsAppNudge')}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
