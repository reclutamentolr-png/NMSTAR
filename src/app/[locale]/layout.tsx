import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import MaintenanceGate from '@/components/MaintenanceGate'

// ✅ DOPO (Corretto per Next.js 15+)
export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }> // params deve essere una Promise
}) {
  const { locale } = await params // Attendi i parametri prima di usarli
  
  return (
    <html lang={locale}>
      <body>
        <MaintenanceGate>
          {children}
        </MaintenanceGate>
      </body>
    </html>
  )
}