import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ToolBackLink from '@/components/ToolBackLink'
import MemoLifeDashboard from '@/components/MemoLifeDashboard'
import { getTranslations } from 'next-intl/server'
import { 
  Brain, 
  ArrowLeft, 
  Sparkles,
  Calendar,
  CheckSquare,
  Receipt,
  Users
} from 'lucide-react'

export default async function MemoLifePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations('memolife')
  const marketplaceT = await getTranslations('marketplace')
  const commonT = await getTranslations('common')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-[var(--gold)]/25 bg-[var(--ink)] sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <ToolBackLink
            className="flex items-center gap-2 text-white hover:text-[var(--gold-bright)] transition-colors font-medium"
            dashboardLabel={<><ArrowLeft className="w-5 h-5" /> {commonT('backToDashboard')}</>}
          >
            <ArrowLeft className="w-5 h-5" />
            {marketplaceT('backToMarketplace')}
          </ToolBackLink>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[var(--gold-bright)]" />
            <h1 className="text-xl font-bold text-white">{t('memolife')}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Intro Banner */}
        <div className="bg-[var(--ink)] rounded-2xl p-6 text-white mb-8 shadow-lg">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-medium mb-3">
                <Sparkles className="w-3 h-3" />
                {t('personalAssistant')}
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {t('organizeLife')}
              </h2>
              <p className="text-white/90 text-sm max-w-2xl">
                {t('organizeLifeDesc')}
              </p>
            </div>
            <div className="flex gap-3">
              <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                <Calendar className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs">{t('statAppointments')}</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                <CheckSquare className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs">{t('statTasks')}</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                <Receipt className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs">{t('statBills')}</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
                <Users className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs">{t('statContacts')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard */}
        <MemoLifeDashboard 
          userId={user.id}
          userName={`${profile.first_name} ${profile.last_name}`}
          locale={locale}
        />
      </main>
    </div>
  )
}
