import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from '@/components/LocalizedLink'
import { hasActiveAureyaAccess } from '@/lib/aureya-server'
import { ArrowLeft, Eye } from 'lucide-react'
import AureyaVisualFieldTest from '@/components/AureyaVisualFieldTest'

export default async function AureyaVisualPage() {
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
    .eq('test_type', 'visual')
    .order('tested_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,#e7fff5,transparent_32%),linear-gradient(135deg,#f7fffb,#eef3f5)]">
      <header className="sticky top-0 z-10 border-b border-teal-900/10 bg-[#123331]/95 text-white shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/marketplace/aureya" className="flex items-center gap-2 text-sm font-medium text-teal-100 transition-colors hover:text-white">
            <ArrowLeft className="h-5 w-5" /> {t('backToAureya')}
          </Link>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-cyan-200" />
            <span className="font-semibold tracking-wide">AUREYA</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <AureyaVisualFieldTest previousScore={previous?.score ?? null} previousTestedAt={previous?.tested_at ?? null} />
      </main>
    </div>
  )
}
