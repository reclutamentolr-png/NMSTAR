import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from '@/components/LocalizedLink'
import ToolBackLink from '@/components/ToolBackLink'
import { Wand2, ArrowLeft, Sparkles, ListChecks } from 'lucide-react'
import OfferMakerWizard from '@/components/OfferMakerWizard'
import { hasActiveOfferMakerAccess } from '@/lib/offermaker-server'

export default async function OfferMakerPage() {
  const t = await getTranslations('offermaker')
  const commonT = await getTranslations('common')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hasAccess = await hasActiveOfferMakerAccess(supabase, user.id)
  if (!hasAccess) {
    redirect('/marketplace')
  }

  const { data: profile } = await supabase.rpc('get_my_profile').maybeSingle<{ phone: string | null }>()

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <ToolBackLink
            className="flex items-center gap-2 text-gray-600 hover:text-violet-600 font-medium transition-colors"
            dashboardLabel={<><ArrowLeft className="w-5 h-5" /> {commonT('backToDashboard')}</>}
          >
            <ArrowLeft className="w-5 h-5" />
            {t('backToMarketplace')}
          </ToolBackLink>
          <div className="flex items-center gap-4">
            <Link
              href="/marketplace/offermaker/campaigns"
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-violet-600 transition-colors"
            >
              <ListChecks className="w-4 h-4" />
              {t('myCampaigns')}
            </Link>
            <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
              <Wand2 className="h-5 w-5 text-violet-600" />
              {t('title')}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            {t('badge')}
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-3">{t('heroTitle')}</h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">{t('heroDescription')}</p>
        </div>

        <OfferMakerWizard initialWhatsapp={profile?.phone || ''} />
      </main>
    </div>
  )
}
