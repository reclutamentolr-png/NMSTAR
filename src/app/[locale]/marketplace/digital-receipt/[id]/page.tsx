import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from '@/components/LocalizedLink'
import { ArrowLeft } from 'lucide-react'
import { hasActiveDigitalReceiptAccess } from '@/lib/digitalReceipt-server'
import { defaultLocale } from '../../../../../../i18n'
import OfferMakerQR from '@/components/OfferMakerQR'
import CopyLinkButton from '@/components/CopyLinkButton'
import DigitalReceiptActions from '@/components/DigitalReceiptActions'
import DigitalReceiptPdfButton from '@/components/DigitalReceiptPdfButton'

export default async function DigitalReceiptDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const t = await getTranslations('digitalReceipt')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hasAccess = await hasActiveDigitalReceiptAccess(supabase, user.id)
  if (!hasAccess) {
    redirect('/marketplace')
  }

  const { data: receipt } = await supabase
    .from('digital_receipts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!receipt) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, email')
    .eq('id', user.id)
    .single()
  const issuedByName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || profile?.email || user.email || ''

  const photoUrl = receipt.photo_path
    ? supabase.storage.from('receipt-photos').getPublicUrl(receipt.photo_path).data.publicUrl
    : null

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const receiptUrl =
    locale === defaultLocale ? `${baseUrl}/ricevute/${receipt.code}` : `${baseUrl}/${locale}/ricevute/${receipt.code}`

  const statusLabel = receipt.returned_at
    ? t('statusReturned')
    : receipt.confirmed_at
      ? t('statusConfirmed')
      : t('statusPending')

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link
            href="/marketplace/digital-receipt"
            className="flex items-center gap-2 text-gray-600 hover:text-teal-600 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('title')}
          </Link>
          <h1 className="text-lg font-semibold text-gray-800 truncate max-w-xs">{receipt.object_name}</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
            <div className="sm:col-span-2 space-y-4">
              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
                  {statusLabel}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">{t('shareLinkLabel')}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 break-all">
                    {receiptUrl}
                  </code>
                  <CopyLinkButton url={receiptUrl} />
                </div>
              </div>
              <p className="text-sm text-gray-600">
                {t('recipientField')}: <span className="font-medium text-gray-900">{receipt.recipient_name}</span>
              </p>
            </div>

            <div className="flex justify-center">
              <OfferMakerQR
                url={receiptUrl}
                fileName={`receipt-${receipt.code}`}
                generatingLabel={t('generatingQr')}
                downloadLabel={t('downloadQr')}
                accentClassName="bg-teal-600 hover:bg-teal-700"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <DigitalReceiptPdfButton
            receipt={receipt}
            receiptUrl={receiptUrl}
            photoUrl={photoUrl}
            issuedByName={issuedByName}
          />
          <DigitalReceiptActions
            id={receipt.id}
            showConfirmReturn={receipt.template === 'loan' && !!receipt.confirmed_at && !receipt.returned_at}
          />
        </div>
      </main>
    </div>
  )
}
