'use client'

import { Languages } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { defaultLocale } from '../../i18n'

const locales = [
  { code: 'it', label: 'Italiano' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Francais' },
  { code: 'es', label: 'Espanol' },
  { code: 'pt', label: 'Portugues' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ru', label: 'Russkij' },
]

export default function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const locale = pathname.match(/^\/(it|en|fr|es|pt|de|ru)(?=\/|$)/)?.[1] ?? defaultLocale

  const changeLocale = (nextLocale: string) => {
    const pathWithoutLocale = pathname.replace(/^\/(it|en|fr|es|pt|de|ru)(?=\/|$)/, '') || '/'
    // The default locale is never prefixed (localePrefix: 'as-needed'), so
    // pushing `/it/...` would bounce through a middleware redirect back to
    // the unprefixed path — that extra round trip is what left the <select>
    // showing the previous locale. Build the final URL directly instead.
    const target = nextLocale === defaultLocale ? pathWithoutLocale : `/${nextLocale}${pathWithoutLocale}`
    router.push(target)
    router.refresh()
  }

  return (
    <label className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm ${dark ? 'border-white/20 bg-white/10 text-white' : 'border-gray-200 bg-white text-gray-700'}`}>
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">Cambia lingua</span>
      <select key={locale} value={locale} onChange={(event) => changeLocale(event.target.value)} className="bg-transparent text-inherit outline-none" aria-label="Cambia lingua">
        {locales.map((item) => <option key={item.code} value={item.code} className="text-gray-900">{item.label}</option>)}
      </select>
    </label>
  )
}