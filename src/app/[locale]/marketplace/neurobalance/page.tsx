import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import ToolBackLink from '@/components/ToolBackLink'
import NeurobalancePlayer from '@/components/NeurobalancePlayer'
import { ArrowLeft, Brain, Headphones, ShieldCheck, Sparkles, Waves } from 'lucide-react'

export default async function NeurobalancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations('neurobalance')
  const commonT = await getTranslations('common')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,#e7eaff,transparent_32%),linear-gradient(135deg,#f7f8ff,#eef5f3)]">
      <header className="sticky top-0 z-10 border-b border-indigo-900/10 bg-[#161936]/95 text-white shadow-lg backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8"><ToolBackLink className="flex items-center gap-2 text-sm font-medium text-indigo-100 transition-colors hover:text-white" dashboardLabel={<><ArrowLeft className="h-5 w-5" /> {commonT('backToDashboard')}</>}><ArrowLeft className="h-5 w-5" /> {t('backToMarketplace')}</ToolBackLink><div className="flex items-center gap-2"><Waves className="h-5 w-5 text-cyan-200" /><span className="font-semibold tracking-wide">NEUROBALANCE</span></div></div></header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto mb-10 max-w-3xl text-center"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/70 px-4 py-1.5 text-sm font-semibold text-indigo-800 shadow-sm"><Sparkles className="h-4 w-4" /> {t('eyebrow')}</div><h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">NEUROBALANCE</h1><p className="mt-4 text-lg leading-8 text-slate-600 sm:text-xl">{t('subtitle')}</p><div className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-500"><Headphones className="h-4 w-4 text-indigo-600" /> {t('headphones')}</div></div>
        <NeurobalancePlayer />
        <div className="mt-8 grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-indigo-100 bg-white/80 p-5"><Brain className="mb-3 h-7 w-7 text-indigo-600" /><h2 className="font-bold text-slate-900">{t('featureRitmiTitle')}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{t('featureRitmiDescription')}</p></div><div className="rounded-2xl border border-teal-100 bg-white/80 p-5"><Waves className="mb-3 h-7 w-7 text-teal-600" /><h2 className="font-bold text-slate-900">{t('featureAudioTitle')}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{t('featureAudioDescription')}</p></div><div className="rounded-2xl border border-amber-100 bg-white/80 p-5"><ShieldCheck className="mb-3 h-7 w-7 text-amber-600" /><h2 className="font-bold text-slate-900">{t('featureSafetyTitle')}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{t('featureSafetyDescription')}</p></div></div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-5 text-slate-500">{t('disclaimer')}</p>
      </main>
    </div>
  )
}