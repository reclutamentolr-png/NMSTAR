import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { Globe, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  detectMenuLocale,
  formatMenuPrice,
  isMenuLocale,
  MENU_LOCALE_NAMES,
  pickText,
  type LocalizedText,
  type MenuDietTag,
  type MenuLocale,
} from '@/lib/menu'

type PublicItem = {
  id: string
  name: string
  names: LocalizedText
  descriptions: LocalizedText
  price: number | null
  diet_tags: MenuDietTag[]
  available: boolean
  is_daily_special: boolean
}
type PublicMenu = {
  restaurant_name: string
  tagline: string | null
  currency: string
  default_locale: string
  languages: string[]
  categories: { id: string; names: LocalizedText; items: PublicItem[] }[]
}

async function loadMenu(token: string): Promise<PublicMenu | null> {
  if (!/^[a-z0-9]{6,16}$/i.test(token)) return null
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_public_menu', { p_token: token })
  return (data as PublicMenu | null) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const menu = await loadMenu(token)
  return { title: menu ? `${menu.restaurant_name} · Menu` : 'Menu' }
}

// Menù pubblico del QR al tavolo (/m/<token>): lingua scelta dal cliente
// (?lang=) o presa dal telefono, tra quelle attivate dal ristoratore.
export default async function PublicMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const { token } = await params
  const { lang: langParam } = await searchParams
  const menu = await loadMenu(token)

  if (!menu) {
    const t = await getTranslations({ locale: 'it', namespace: 'menuPublic' })
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--ink)] px-6 text-center text-white">
        <p className="max-w-sm text-white/80">{t('notAvailable')}</p>
      </div>
    )
  }

  const fallback: MenuLocale = isMenuLocale(menu.default_locale) ? menu.default_locale : 'it'
  const available = (menu.languages ?? []).filter(isMenuLocale) as MenuLocale[]
  if (!available.includes(fallback)) available.unshift(fallback)
  const lang: MenuLocale =
    isMenuLocale(langParam) && available.includes(langParam)
      ? langParam
      : detectMenuLocale((await headers()).get('accept-language'), available, fallback)

  const t = await getTranslations({ locale: lang, namespace: 'menuPublic' })
  const specials = menu.categories.flatMap((c) => c.items).filter((item) => item.is_daily_special && item.available)

  const itemName = (item: PublicItem) => item.names?.[lang]?.trim() || item.name

  return (
    <div lang={lang} className="min-h-screen bg-[#141311] text-[#f4efe3]">
      <header className="border-b border-[#c79a3b]/30 px-5 pb-8 pt-10 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#e7c56a]">Menu</p>
        <h1 className="mt-3 font-serif text-4xl font-bold leading-tight sm:text-5xl">{menu.restaurant_name}</h1>
        {menu.tagline && <p className="mx-auto mt-3 max-w-md font-serif italic text-[#f4efe3]/70">{menu.tagline}</p>}

        {available.length > 1 && (
          <nav className="mt-6 flex flex-wrap items-center justify-center gap-1.5" aria-label={t('language')}>
            <Globe className="mr-1 h-4 w-4 text-[#e7c56a]" />
            {available.map((l) => (
              <a
                key={l}
                href={`?lang=${l}`}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  l === lang ? 'bg-[#e7c56a] text-[#141311]' : 'border border-[#c79a3b]/40 text-[#f4efe3]/80'
                }`}
              >
                {MENU_LOCALE_NAMES[l]}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-5 py-8">
        {specials.length > 0 && (
          <section className="mb-10 rounded-2xl border border-[#c79a3b]/50 bg-[#c79a3b]/10 p-5">
            <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-[#e7c56a]">
              <Star className="h-5 w-5 fill-[#e7c56a]" /> {t('dailySpecial')}
            </h2>
            <ul className="mt-3 space-y-3">
              {specials.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-4">
                  <span className="font-semibold">{itemName(item)}</span>
                  <span className="shrink-0 font-semibold text-[#e7c56a]">{formatMenuPrice(item.price, lang, menu.currency)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {menu.categories.filter((c) => c.items.length > 0).length === 0 && <p className="text-center text-[#f4efe3]/60">{t('empty')}</p>}

        {menu.categories
          .filter((category) => category.items.length > 0)
          .map((category) => (
            <section key={category.id} className="mb-10">
              <h2 className="mb-4 border-b border-[#c79a3b]/30 pb-2 text-center font-serif text-2xl font-bold tracking-wide text-[#e7c56a]">
                {pickText(category.names, lang, fallback)}
              </h2>
              <ul className="space-y-5">
                {category.items.map((item) => {
                  const description = pickText(item.descriptions, lang, fallback)
                  return (
                    <li key={item.id} className={item.available ? '' : 'opacity-45'}>
                      <div className="flex items-baseline gap-3">
                        <span className="font-semibold">{itemName(item)}</span>
                        <span className="min-w-4 flex-1 border-b border-dotted border-[#f4efe3]/25" />
                        <span className="shrink-0 font-semibold text-[#e7c56a]">
                          {item.available ? formatMenuPrice(item.price, lang, menu.currency) : t('soldOut')}
                        </span>
                      </div>
                      {itemName(item) !== item.name && <p className="text-xs italic text-[#f4efe3]/45">{item.name}</p>}
                      {description && <p className="mt-1 text-sm leading-6 text-[#f4efe3]/70">{description}</p>}
                      {item.diet_tags.length > 0 && (
                        <p className="mt-1.5 flex flex-wrap gap-1.5">
                          {item.diet_tags.map((tag) => (
                            <span key={tag} className="rounded-full border border-[#c79a3b]/40 px-2 py-0.5 text-[10px] font-semibold text-[#e7c56a]">
                              {t(`tag_${tag}`)}
                            </span>
                          ))}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
      </main>

      <footer className="border-t border-[#c79a3b]/20 px-5 py-6 text-center text-xs text-[#f4efe3]/45">
        {t('allergenNotice')}
        <p className="mt-3 tracking-[0.25em] text-[#e7c56a]/70">KUMANI MENU</p>
      </footer>
    </div>
  )
}
