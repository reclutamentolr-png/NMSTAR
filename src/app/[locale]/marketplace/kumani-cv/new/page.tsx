import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from '@/components/LocalizedLink'
import { ArrowLeft, FileUser } from 'lucide-react'
import { hasActiveCvAccess } from '@/lib/cv-server'
import CvForm from '@/components/CvForm'

export default async function NewCvPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const t = await getTranslations('kumaniCv')
  const { from } = await searchParams
  const backSuffix = from === 'dashboard' ? '?from=dashboard' : ''

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hasAccess = await hasActiveCvAccess(supabase, user.id)
  if (!hasAccess) {
    redirect('/marketplace')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[var(--gold-pale)]">
      <header className="border-b border-[var(--gold)]/25 bg-[var(--ink)] sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link
            href={`/marketplace/kumani-cv${backSuffix}`}
            className="flex items-center gap-2 text-white hover:text-[var(--gold-bright)] font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('title')}
          </Link>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
            <FileUser className="h-5 w-5 text-[var(--gold-bright)]" />
            {t('newCv')}
          </h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <CvForm mode="create" />
      </main>
    </div>
  )
}
