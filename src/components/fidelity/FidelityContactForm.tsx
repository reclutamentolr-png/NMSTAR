'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Bell, Check, ChevronDown, ChevronUp, Copy, MessageCircle, Share2, ShieldCheck } from 'lucide-react'
import { updateMemberContact } from '@/app/actions/fidelity'

const inputClass = 'w-full rounded-lg border border-[var(--gold)]/30 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]'
const grayButton = 'inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200'
const goldButton = 'rounded-lg bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] px-4 py-2.5 text-sm font-bold text-[var(--ink)] disabled:opacity-50'

// Tutto interno, nessun servizio esterno:
// - "Salva la tua tessera": il cliente si manda il link (WhatsApp,
//   condivisione del telefono o copia) e la ritrova anche cambiando telefono;
// - preferenze: nome, telefono e consenso a essere avvisato su WhatsApp dal
//   negozio quando è vicino al premio.
export default function FidelityContactForm({
  token,
  businessName,
  initial,
}: {
  token: string
  businessName: string
  initial: { customerName: string; phone: string; marketingConsent: boolean }
}) {
  const t = useTranslations('fidelity')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [customerName, setCustomerName] = useState(initial.customerName)
  const [phone, setPhone] = useState(initial.phone)
  const [consent, setConsent] = useState(initial.marketingConsent)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  // Link "pulito" della tessera (senza ?esito=...), calcolato al click.
  const cardUrl = () => `${window.location.origin}${window.location.pathname}`
  const shareText = () => t('saveLinkMessage', { business: businessName, url: cardUrl() })

  const sendToWhatsapp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText())}`, '_blank', 'noopener,noreferrer')
  }

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Kumi Card · ${businessName}`, text: shareText() })
      } catch {
        // Condivisione annullata dall'utente: nulla da fare.
      }
    } else {
      await copy()
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cardUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard non disponibile (es. browser vecchio): resta WhatsApp.
    }
  }

  const saveContact = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const result = await updateMemberContact(token, { customerName, phone, marketingConsent: consent })
    setBusy(false)
    setMessage(result.success ? { ok: true, text: t('contactSaved') } : { ok: false, text: t(`contactError_${result.message}`) })
    if (result.success) router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[var(--paper)] p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-6 w-6 flex-shrink-0 text-[var(--gold)]" />
          <div>
            <p className="font-semibold text-[var(--ink)]">{t('saveCardTitle')}</p>
            <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">{t('saveCardText')}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button type="button" onClick={sendToWhatsapp} className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-green-700">
            <MessageCircle className="h-4 w-4" /> {t('saveCardWhatsapp')}
          </button>
          <button type="button" onClick={share} className={grayButton}>
            <Share2 className="h-4 w-4" /> {t('saveCardShare')}
          </button>
          <button type="button" onClick={copy} className={grayButton}>
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />} {copied ? t('linkCopied') : t('saveCardCopy')}
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-[var(--paper)] p-5">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 text-left">
          <Bell className="h-6 w-6 flex-shrink-0 text-[var(--gold)]" />
          <span className="flex-1">
            <span className="block font-semibold text-[var(--ink)]">{t('notifyTitle', { business: businessName })}</span>
            <span className="block text-xs text-[var(--muted)]">{initial.marketingConsent ? t('notifyActive') : t('notifySubtitle')}</span>
          </span>
          {open ? <ChevronUp className="h-5 w-5 text-[var(--muted)]" /> : <ChevronDown className="h-5 w-5 text-[var(--muted)]" />}
        </button>

        {open && (
          <form onSubmit={saveContact} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--ink)]">{t('customerNameField')}</label>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} maxLength={60} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--ink)]">{t('phoneField')}</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+39 333 1234567" />
            </div>
            <label className="flex items-start gap-2.5 rounded-lg bg-[var(--background)] p-3 text-sm text-[var(--ink)]">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[var(--gold)]" />
              {t('marketingConsentLabel', { business: businessName })}
            </label>
            <button type="submit" disabled={busy} className={goldButton}>
              {t('saveContact')}
            </button>
            {message && <p className={`text-sm ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
