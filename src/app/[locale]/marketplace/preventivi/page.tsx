import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from '@/components/LocalizedLink'
import ToolBackLink from '@/components/ToolBackLink'
import { ArrowLeft, FileSpreadsheet, Sparkles, Pencil } from 'lucide-react'
import { hasActivePreventiviAccess } from '@/lib/quotes-server'
import QuotesDashboard from '@/components/QuotesDashboard'

export default async function PreventiviPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const t = await getTranslations('preventivi')
  const commonT = await getTranslations('common')
  const { from } = await searchParams
  const backSuffix = from === 'dashboard' ? '?from=dashboard' : ''

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hasAccess = await hasActivePreventiviAccess(supabase, user.id)
  if (!hasAccess) {
    redirect('/marketplace')
  }

  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, quote_number, client_name, issue_date, total')
    .eq('user_id', user.id)

  const { data: issuerProfile } = await supabase
    .from('quote_issuer_profiles')
    .select('company_name')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[var(--gold-pale)]">
      <header className="border-b border-[var(--gold)]/25 bg-[var(--ink)] sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <ToolBackLink
            className="flex items-center gap-2 text-white hover:text-[var(--gold-bright)] font-medium transition-colors"
            dashboardLabel={<><ArrowLeft className="w-5 h-5" /> {commonT('backToDashboard')}</>}
          >
            <ArrowLeft className="w-5 h-5" />
            {t('backToMarketplace')}
          </ToolBackLink>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
            <FileSpreadsheet className="h-5 w-5 text-[var(--gold-bright)]" />
            {t('title')}
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[var(--gold-pale)] text-[var(--ink)] px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4 text-[var(--gold)]" />
            {t('badge')}
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-3">{t('heroTitle')}</h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">{t('heroDescription')}</p>
        </div>

        {!issuerProfile?.company_name && (
          <Link
            href={`/marketplace/preventivi/business-profile${backSuffix}`}
            className="mb-8 flex items-center justify-between gap-4 rounded-xl border border-[var(--gold)]/40 bg-[var(--gold-pale)] px-5 py-4 hover:border-[var(--gold)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <Pencil className="w-5 h-5 text-[var(--ink)] shrink-0" />
              <p className="text-sm font-medium text-[var(--ink)]">{t('businessProfilePrompt')}</p>
            </div>
            <span className="text-sm font-semibold text-[var(--gold)] whitespace-nowrap">{t('editBusinessProfile')}</span>
          </Link>
        )}

        <QuotesDashboard quotes={quotes || []} />
      </main>
    </div>
  )
}
