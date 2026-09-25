'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { MessageCircle } from 'lucide-react'
import { markFidelityMemberContacted } from '@/app/actions/fidelity'
import { FIDELITY_CONTACT_COOLDOWN_DAYS, effectiveStamps, isCloseToPrize, type FidelityCard, type FidelityMember } from '@/lib/fidelity'

type CardInfo = Pick<FidelityCard, 'business_name' | 'prize' | 'stamps_needed' | 'stamps_expire_days' | 'close_to_prize_percent'>
type Filter = 'close' | 'all'

// Elenco clienti della Kumi Card. Filtro "vicini al premio" (≥ la % scelta
// dal commerciante) e messaggio WhatsApp già pronto, inviato dal telefono
// del commerciante (link wa.me): nessun servizio esterno, solo clienti che
// hanno lasciato numero e consenso.
export default function FidelityCustomers({ card, members }: { card: CardInfo; members: FidelityMember[] }) {
  const t = useTranslations('fidelity')
  const closeMembers = members.filter((m) => isCloseToPrize(card, m))
  const [filter, setFilter] = useState<Filter>(closeMembers.length > 0 ? 'close' : 'all')
  // Contatti registrati in questa sessione (la pagina non si ricarica).
  const [contactedNow, setContactedNow] = useState<Record<string, string>>({})
  // Istante di riferimento fissato al mount (il render deve restare puro).
  const [now] = useState(() => Date.now())

  if (members.length === 0) return <p className="text-sm text-[var(--muted)]">{t('customersEmpty')}</p>

  const visible = filter === 'close' ? closeMembers : members
  const reachable = closeMembers.filter((m) => m.marketing_consent && m.contact_phone).length
  const lastContact = (m: FidelityMember) => contactedNow[m.id] ?? m.last_contacted_at
  const cooldownMs = FIDELITY_CONTACT_COOLDOWN_DAYS * 24 * 3600 * 1000

  const whatsappLink = (m: FidelityMember) => {
    const missing = card.stamps_needed - effectiveStamps(card, m)
    const text = m.customer_name
      ? t('whatsappTextName', { name: m.customer_name, count: missing, prize: card.prize, business: card.business_name })
      : t('whatsappText', { count: missing, prize: card.prize, business: card.business_name })
    return `https://wa.me/${m.contact_phone!.replace(/^\+/, '')}?text=${encodeURIComponent(text)}`
  }

  const onWhatsapp = (m: FidelityMember) => {
    setContactedNow((prev) => ({ ...prev, [m.id]: new Date().toISOString() }))
    markFidelityMemberContacted(m.id)
  }

  const tab = (value: Filter, label: string) => (
    <button
      type="button"
      onClick={() => setFilter(value)}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
        filter === value ? 'bg-[var(--ink)] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {tab('close', t('filterClose', { percent: card.close_to_prize_percent, count: closeMembers.length }))}
        {tab('all', t('filterAll', { count: members.length }))}
      </div>
      {filter === 'close' && (
        <p className="rounded-lg bg-[var(--gold-pale)] px-4 py-2.5 text-sm text-[var(--ink)]">
          {closeMembers.length === 0 ? t('closeEmpty') : t('closeSummary', { count: closeMembers.length, reachable })}
        </p>
      )}

      {visible.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--gold)]/15 text-left text-[var(--muted)]">
                <th className="py-2 pr-4 font-medium">{t('colCode')}</th>
                <th className="py-2 pr-4 font-medium">{t('colProgress')}</th>
                <th className="py-2 pr-4 font-medium">{t('colPrizes')}</th>
                <th className="py-2 pr-4 font-medium">{t('colLastVisit')}</th>
                <th className="py-2 font-medium">{t('colContact')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((m) => {
                const stamps = effectiveStamps(card, m)
                const pct = Math.min(100, Math.round((stamps / card.stamps_needed) * 100))
                const canWhatsapp = m.marketing_consent && !!m.contact_phone && stamps < card.stamps_needed
                const contactedAt = lastContact(m)
                const recent = !!contactedAt && now - new Date(contactedAt).getTime() < cooldownMs
                return (
                  <tr key={m.id} className="border-b border-[var(--gold)]/10 align-top last:border-0">
                    <td className="py-2.5 pr-4">
                      <span className="font-mono font-semibold tracking-wider text-[var(--ink)]">{m.member_code}</span>
                      {m.customer_name && <span className="block text-xs text-[var(--muted)]">{m.customer_name}</span>}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                          <div className={`h-full ${pct >= 100 ? 'bg-green-500' : 'bg-[var(--gold)]'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-semibold text-[var(--ink)]">
                          {stamps}/{card.stamps_needed}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-[var(--ink)]">{m.rewards_redeemed}</td>
                    <td className="py-2.5 pr-4 text-[var(--muted)]">{m.last_stamp_at ? new Date(m.last_stamp_at).toLocaleDateString() : '—'}</td>
                    <td className="py-2.5">
                      {canWhatsapp ? (
                        <div>
                          <a
                            href={whatsappLink(m)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => onWhatsapp(m)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                              recent ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> {t('whatsappButton')}
                          </a>
                          {contactedAt && (
                            <span className="mt-1 block text-xs text-[var(--muted)]">
                              {t('contactedOn', { date: new Date(contactedAt).toLocaleDateString() })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--muted)]" title={t('noConsentHint')}>
                          {t('noConsent')}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
