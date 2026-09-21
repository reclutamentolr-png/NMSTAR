import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from '@/components/LocalizedLink'
import { ArrowLeft, ListChecks, PlusCircle } from 'lucide-react'
import OfferMakerCampaignCard from '@/components/OfferMakerCampaignCard'

export default async function OfferMakerCampaignsPage() {
  const t = await getTranslations('offermaker')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: campaigns } = await supabase
    .from('offermaker_campaigns')
    .select('id, code, campaign_title, status, click_count, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link
            href="/marketplace/offermaker"
            className="flex items-center gap-2 text-gray-600 hover:text-violet-600 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('backToMarketplace')}
          </Link>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <ListChecks className="h-5 w-5 text-violet-600" />
            {t('myCampaigns')}
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">{t('myCampaigns')}</h2>
          <Link
            href="/marketplace/offermaker"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-700 hover:to-purple-700 transition-all"
          >
            <PlusCircle className="w-5 h-5" />
            {t('newCampaign')}
          </Link>
        </div>

        {campaigns && campaigns.length > 0 ? (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <OfferMakerCampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <ListChecks className="w-12 h-12 mx-auto mb-4" />
            <p>{t('noCampaignsYet')}</p>
          </div>
        )}
      </main>
    </div>
  )
}
