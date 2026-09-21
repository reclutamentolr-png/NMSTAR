'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import Link from '@/components/LocalizedLink'
import { Mail, AlertCircle, Loader2, Rocket, Home, CheckCircle } from 'lucide-react'
import MaintenanceGate from '@/components/MaintenanceGate'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const t = useTranslations('auth')
  const locale = useLocale()
  const supabase = createClient()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError(null)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <MaintenanceGate>
      <div className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-[var(--background)] py-12 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(199,154,59,0.18),transparent_42%)]" />
        <Link 
          href="/" 
          className="absolute left-6 top-6 flex items-center gap-2 font-semibold text-[var(--ink-soft)] transition-colors hover:text-[var(--gold)]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ink)]">
            <Rocket className="h-5 w-5 text-[var(--gold-bright)]" />
          </div>
          <span className="text-lg hidden sm:inline">Network Marketing Program</span>
          <Home className="w-4 h-4 sm:hidden" />
        </Link>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[var(--ink)]">
            {t('forgotPasswordTitle')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('forgotPasswordDescription')}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="relative border border-[var(--gold)]/35 bg-[var(--paper)] px-4 py-8 shadow-[0_20px_55px_rgba(23,23,23,0.14)] sm:rounded-2xl sm:px-10">
            {error && (
              <div className="mb-4 border-l-4 bg-red-50 border-red-400 p-4 rounded-r">
                <p className="text-sm font-medium text-red-700">
                  {error}
                </p>
              </div>
            )}

            {sent ? (
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-green-700 mb-4">{t('resetLinkSent')}</p>
                <Link 
                  href="/login" 
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-transparent bg-[var(--ink)] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-[var(--ink-soft)]"
                >
                  {t('backToLogin')}
                </Link>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleReset}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">{t('email')}</label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-md border border-stone-300 bg-white pl-10 pr-4 py-2.5 shadow-sm focus:border-[var(--gold)] focus:ring-[var(--gold)]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-transparent bg-[var(--ink)] px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--ink-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {loading ? t('sending') : t('resetPassword')}
                </button>
              </form>
            )}

            {!sent && (
              <div className="mt-6 text-center">
                <Link href="/login" className="text-sm font-medium text-[var(--gold)] hover:text-[var(--ink)] hover:underline">
                  {t('backToLogin')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </MaintenanceGate>
  )
}
