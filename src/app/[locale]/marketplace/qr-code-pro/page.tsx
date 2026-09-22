import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from '@/components/LocalizedLink'
import ToolBackLink from '@/components/ToolBackLink'
import { QrCode, ArrowLeft, PlusCircle, Sparkles } from 'lucide-react'
import { hasActiveQrProAccess } from '@/lib/qrPro-server'
import QrProCodeCard from '@/components/QrProCodeCard'

export default async function QrCodeProPage() {
  const t = await getTranslations('qrCodePro')
  const commonT = await getTranslations('common')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hasAccess = await hasActiveQrProAccess(supabase, user.id)
  if (!hasAccess) {
    redirect('/marketplace')
  }

  const { data: qrCodes } = await supabase
    .from('qr_pro_codes')
    .select('id, label, content_type, click_count, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <ToolBackLink
            className="flex items-center gap-2 text-gray-600 hover:text-cyan-600 font-medium transition-colors"
            dashboardLabel={<><ArrowLeft className="w-5 h-5" /> {commonT('backToDashboard')}</>}
          >
            <ArrowLeft className="w-5 h-5" />
            {t('backToMarketplace')}
          </ToolBackLink>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <QrCode className="h-5 w-5 text-cyan-600" />
            {t('title')}
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-cyan-100 text-cyan-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            {t('badge')}
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-3">{t('heroTitle')}</h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">{t('heroDescription')}</p>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">{t('myCodes')}</h3>
          <Link
            href="/marketplace/qr-code-pro/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all"
          >
            <PlusCircle className="w-5 h-5" />
            {t('newCode')}
          </Link>
        </div>

        {qrCodes && qrCodes.length > 0 ? (
          <div className="space-y-4">
            {qrCodes.map((qrCode) => (
              <QrProCodeCard key={qrCode.id} qrCode={qrCode} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <QrCode className="w-12 h-12 mx-auto mb-4" />
            <p>{t('noCodesYet')}</p>
          </div>
        )}
      </main>
    </div>
  )
}
