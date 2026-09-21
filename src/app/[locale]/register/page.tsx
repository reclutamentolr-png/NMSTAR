import Link from '@/components/LocalizedLink'
import { getTranslations } from 'next-intl/server'
import { Rocket } from 'lucide-react'
import RegisterForm from '@/components/RegisterForm'
import MaintenanceGate from '@/components/MaintenanceGate'

export const dynamic = 'force-dynamic'

export default async function RegisterPage() {
  const t = await getTranslations('authRegister')
  return (
    <MaintenanceGate>
      <div className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-[var(--background)] py-12 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(199,154,59,0.18),transparent_42%)]" />
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--ink)]">
              <Rocket className="h-7 w-7 text-[var(--gold-bright)]" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[var(--ink)]">
            {t('registerTitle')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('registerDescription')}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="relative border border-[var(--gold)]/35 bg-[var(--paper)] px-4 py-8 shadow-[0_20px_55px_rgba(23,23,23,0.14)] sm:rounded-lg sm:px-10">
            <RegisterForm />
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {t('alreadyHaveAccount')}{' '}
                <Link href="/login" className="font-medium text-[var(--gold)] hover:text-[var(--ink)] hover:underline">
                  {t('loginHere')}
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-500">
          <p className="text-[var(--muted)]">
            {t('byCreatingAccount')}{' '}
            <Link href="/terms" className="text-[var(--gold)] hover:underline">{t('termsOfService')}</Link>
            {' '}{t('and')}{' '}
            <Link href="/privacy" className="text-[var(--gold)] hover:underline">{t('privacyPolicy')}</Link>
          </p>
        </div>
      </div>
    </MaintenanceGate>
  )
}