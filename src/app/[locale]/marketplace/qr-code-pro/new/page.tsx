import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from '@/components/LocalizedLink'
import { ArrowLeft, QrCode } from 'lucide-react'
import { hasActiveQrProAccess } from '@/lib/qrPro-server'
import QrProForm from '@/components/QrProForm'

export default async function NewQrCodePage() {
  const t = await getTranslations('qrCodePro')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hasAccess = await hasActiveQrProAccess(supabase, user.id)
  if (!hasAccess) {
    redirect('/marketplace')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link
            href="/marketplace/qr-code-pro"
            className="flex items-center gap-2 text-gray-600 hover:text-cyan-600 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('title')}
          </Link>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <QrCode className="h-5 w-5 text-cyan-600" />
            {t('newCode')}
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <QrProForm mode="create" />
      </main>
    </div>
  )
}
