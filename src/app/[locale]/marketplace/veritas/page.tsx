import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft, VenetianMask } from 'lucide-react'
import Link from '@/components/LocalizedLink'
import VeritasHome from '@/components/veritas/VeritasHome'
import { createClient } from '@/lib/supabase/server'

// Veritas — "Chi sta mentendo?": crea una stanza per giocare con gli amici.
export default async function VeritasPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations('veritas')
  const commonT = await getTranslations('common')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)
  const { data: profile } = await supabase.from('profiles').select('first_name').eq('id', user.id).maybeSingle()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50">
      <header className="sticky top-0 z-10 border-b border-[var(--gold)]/25 bg-[var(--ink)] text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-white transition-colors hover:text-[var(--gold-bright)]">
            <ArrowLeft className="h-5 w-5" /> {commonT('backToDashboard')}
          </Link>
          <div className="flex items-center gap-2">
            <VenetianMask className="h-5 w-5 text-[var(--gold-bright)]" />
            <span className="font-semibold tracking-wide">Veritas</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Veritas</h1>
          <p className="mt-3 text-lg font-semibold text-violet-700">{t('tagline')}</p>
          <p className="mt-3 text-slate-600">{t('intro')}</p>
        </div>

        <VeritasHome defaultNickname={profile?.first_name ?? ''} />

        <div className="mt-10 rounded-2xl border border-[var(--gold)]/20 bg-white/80 p-6">
          <h2 className="mb-3 font-bold text-slate-900">{t('howToPlay')}</h2>
          <ol className="space-y-2 text-sm leading-6 text-slate-600">
            <li>1. {t('rule1')}</li>
            <li>2. {t('rule2')}</li>
            <li>3. {t('rule3')}</li>
            <li>4. {t('rule4')}</li>
          </ol>
        </div>
      </main>
    </div>
  )
}
