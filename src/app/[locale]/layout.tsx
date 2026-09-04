import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import MaintenanceGate from '@/components/MaintenanceGate'

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  
  return (
    <html lang={locale}>
      {/* ✅ PWA: manifest + meta tag per installazione come app */}
      <link rel="manifest" href="/manifest.webmanifest" />
      <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      <link rel="apple-touch-icon" href="/icon.svg" />
      <meta name="theme-color" content="#4f46e5" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="NMP" />
      <body>
        <MaintenanceGate>
          {children}
        </MaintenanceGate>
      </body>
    </html>
  )
}