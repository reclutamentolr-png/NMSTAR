'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { LoaderCircle, Ticket, Copy, Check, Share2 } from 'lucide-react'
import { createVoucher, redeemVoucher } from '@/app/actions/vouchers'

type Voucher = {
  id: string
  code: string
  status: string
  created_at: string
  redeemed_at: string | null
}

const VOUCHER_COST = 49

function buildWhatsAppHref(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

export default function WalletVoucherSection({
  initialPoints,
  initialVouchers,
}: {
  initialPoints: number
  initialVouchers: Voucher[]
}) {
  const t = useTranslations('wallet')
  const locale = useLocale()
  const router = useRouter()

  const [points, setPoints] = useState(initialPoints)
  const [vouchers, setVouchers] = useState(initialVouchers)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [lastCode, setLastCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [redeemCode, setRedeemCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [redeemMessage, setRedeemMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const canCreate = points >= VOUCHER_COST

  const handleCreate = async () => {
    setCreating(true)
    setCreateError(null)
    setLastCode(null)
    const result = await createVoucher()
    setCreating(false)

    if (!result.success) {
      setCreateError(result.message === 'insufficientPoints' ? t('voucherInsufficientPoints', { points: VOUCHER_COST }) : t('voucherCreateError'))
      return
    }

    setPoints(result.balance)
    setLastCode(result.code)
    setVouchers((prev) => [
      { id: result.code, code: result.code, status: 'active', created_at: new Date().toISOString(), redeemed_at: null },
      ...prev,
    ])
    router.refresh()
  }

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable — the code is already shown on screen for manual copy.
    }
  }

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return
    setRedeeming(true)
    setRedeemMessage(null)
    const result = await redeemVoucher(redeemCode)
    setRedeeming(false)

    if (!result.success) {
      const errorKey =
        result.message === 'already_used'
          ? 'voucherRedeemErrorUsed'
          : result.message === 'self_redemption'
            ? 'voucherRedeemErrorSelf'
            : result.message === 'not_found'
              ? 'voucherRedeemErrorNotFound'
              : 'voucherRedeemErrorGeneric'
      setRedeemMessage({ type: 'error', text: t(errorKey) })
      return
    }

    setRedeemMessage({
      type: 'success',
      text: t('voucherRedeemSuccess', { date: new Date(result.expiresAt).toLocaleDateString(locale) }),
    })
    setRedeemCode('')
    router.refresh()
  }

  const statusLabel = (status: string) =>
    status === 'redeemed' ? t('voucherStatusRedeemed') : status === 'revoked' ? t('voucherStatusRevoked') : t('voucherStatusActive')
  const statusClass = (status: string) =>
    status === 'redeemed'
      ? 'bg-gray-100 text-gray-500'
      : status === 'revoked'
        ? 'bg-red-100 text-red-600'
        : 'bg-emerald-100 text-emerald-700'

  return (
    <div className="space-y-5">
      <p className="text-sm text-[var(--muted)]">{t('voucherIntro', { points: VOUCHER_COST })}</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          onClick={handleCreate}
          disabled={!canCreate || creating}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--ink-soft)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {creating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
          {t('voucherCreate')}
        </button>
        {!canCreate && <p className="text-xs text-gray-400">{t('voucherNeedMore', { points: VOUCHER_COST - points })}</p>}
      </div>

      {createError && <p className="text-sm text-red-600">{createError}</p>}

      {lastCode && (
        <div className="rounded-lg border border-[var(--gold)]/40 bg-[var(--gold-pale)] p-4">
          <p className="mb-2 text-sm font-semibold text-[var(--ink)]">{t('voucherCreated')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-white px-3 py-1.5 font-mono text-base font-bold tracking-wider text-[var(--ink)]">
              {lastCode}
            </code>
            <button
              onClick={() => handleCopy(lastCode)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--gold)]/40 bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--gold-pale)]"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? t('voucherCopied') : t('voucherCopy')}
            </button>
            <a
              href={buildWhatsAppHref(t('voucherShareMessage', { code: lastCode }))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              <Share2 className="h-3.5 w-3.5" />
              {t('voucherShareWhatsapp')}
            </a>
          </div>
        </div>
      )}

      {vouchers.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">{t('voucherMyVouchers')}</p>
          <div className="space-y-2">
            {vouchers.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                <code className="font-mono text-sm text-[var(--ink)]">{v.code}</code>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClass(v.status)}`}>
                  {statusLabel(v.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-gray-100 pt-4">
        <p className="mb-2 text-sm font-semibold text-[var(--ink)]">{t('voucherRedeemTitle')}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value)}
            placeholder={t('voucherRedeemPlaceholder')}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase tracking-wider focus:border-[var(--gold)] focus:outline-none"
          />
          <button
            onClick={handleRedeem}
            disabled={redeeming || !redeemCode.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--gold)]/50 bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--gold-pale)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {redeeming && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {t('voucherRedeemButton')}
          </button>
        </div>
        {redeemMessage && (
          <p className={`mt-2 text-sm ${redeemMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
            {redeemMessage.text}
          </p>
        )}
      </div>
    </div>
  )
}
