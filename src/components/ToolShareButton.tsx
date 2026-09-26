'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Check, Share2 } from 'lucide-react'
import { getMarketplaceTools } from '@/lib/marketplaceTools'
import { locales } from '../../i18n'

// Pulsante "Condividi" fisso in basso a sinistra dentro ogni strumento del
// marketplace (in basso a destra ci sono già lettore audio e pulsanti "+").
// Riconosce lo strumento dall'indirizzo e condivide la sua pagina pubblica
// /strumenti/[strumento] con il codice invito di chi condivide, tramite la
// condivisione nativa del telefono. Dove non c'è (computer), copia il link.
export default function ToolShareButton({ referralCode }: { referralCode: string | null }) {
  const pathname = usePathname()
  const t = useTranslations('toolShare')
  const tm = useTranslations('marketplace')
  const [copied, setCopied] = useState(false)

  const segments = pathname.split('/').filter(Boolean)
  if (segments[0] && locales.includes(segments[0])) segments.shift()
  const tool = segments[0] === 'marketplace' ? getMarketplaceTools(tm).find((item) => item.toolName === segments[1]) : undefined
  if (!tool) return null

  const share = async () => {
    // Senza prefisso di lingua: chi riceve il link lo apre nella propria lingua.
    const url = `${window.location.origin}/strumenti/${tool.toolName}${referralCode ? `?ref=${encodeURIComponent(referralCode)}` : ''}`
    const text = t('shareText', { tool: tool.title })
    if (navigator.share) {
      try {
        await navigator.share({ title: `${tool.title} · KUMANI`, text, url })
      } catch {
        // Condivisione annullata dall'utente.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Appunti non disponibili: niente da fare.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-[var(--gold)]/40 bg-[var(--ink)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_35px_rgba(23,23,23,0.35)] transition-all hover:-translate-y-0.5 hover:text-[var(--gold-bright)]"
    >
      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Share2 className="h-4 w-4 text-[var(--gold-bright)]" />}
      {copied ? t('linkCopied') : t('shareButton')}
    </button>
  )
}
