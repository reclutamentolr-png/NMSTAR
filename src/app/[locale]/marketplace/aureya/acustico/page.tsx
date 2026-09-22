import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from '@/components/LocalizedLink'
import { hasActiveAureyaAccess } from '@/lib/aureya-server'
import { ArrowLeft, Ear } from 'lucide-react'
import AureyaAcousticTest from '@/components/AureyaAcousticTest'

export default async function AureyaAcousticPage() {
  const t = await getTranslations('aureya')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hasAccess = await hasActiveAureyaAccess(supabase, user.id)
  if (!hasAccess) {
    redirect('/marketplace')
  }

  const { data: previous } = await supabase
    .from('aureya_test_results')
    .select('score, tested_at')
    .eq('user_id', user.id)
    .eq('test_type', 'acoustic')
    .order('tested_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,#e7eaff,transparent_32%),linear-gradient(135deg,#f7f8ff,#eef5f3)]">
      <header className="sticky top-0 z-10 border-b border-indigo-900/10 bg-[#161936]/95 text-white shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/marketplace/aureya" className="flex items-center gap-2 text-sm font-medium text-indigo-100 transition-colors hover:text-white">
            <ArrowLeft className="h-5 w-5" /> {t('backToAureya')}
          </Link>
          <div className="flex items-center gap-2">
            <Ear className="h-5 w-5 text-cyan-200" />
            <span className="font-semibold tracking-wide">AUREYA</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <AureyaAcousticTest previousScore={previous?.score ?? null} previousTestedAt={previous?.tested_at ?? null} />
      </main>
    </div>
  )
}
