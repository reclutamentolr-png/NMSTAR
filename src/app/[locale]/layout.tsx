import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

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
      <body>{children}</body>
    </html>
  )
}