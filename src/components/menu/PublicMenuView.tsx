'use client'

import { useState } from 'react'
import { SlidersHorizontal, Star } from 'lucide-react'
import {
  allergenNumber,
  formatMenuPrice,
  MENU_ALLERGENS,
  menuPhotoUrl,
  pickText,
  type LocalizedText,
  type MenuAllergen,
  type MenuDietTag,
  type MenuLocale,
} from '@/lib/menu'

export type PublicItem = {
  id: string
  name: string
  names: LocalizedText
  descriptions: LocalizedText
  price: number | null
  diet_tags: MenuDietTag[]
  allergens: MenuAllergen[]
  photo_path?: string | null
  available: boolean
  is_daily_special: boolean
}
export type PublicCategory = { id: string; names: LocalizedText; items: PublicItem[] }

export type PublicMenuLabels = {
  dailySpecial: string
  soldOut: string
  empty: string
  allergensLabel: string
  legendTitle: string
  filterTitle: string
  filterDiet: string
  filterExclude: string
  clearFilters: string
  noResults: string
  filterDisclaimer: string
  tags: Record<string, string>
  allergens: Record<string, string>
}

// Parte interattiva del menù pubblico: filtri del cliente (vegetariano,
// vegano, escludi allergeni) e legenda allergeni. I testi arrivano già
// tradotti nella lingua scelta per il menù (può differire da quella del sito).
export default function PublicMenuView({
  categories,
  lang,
  fallback,
  currency,
  labels,
  headingFont,
}: {
  categories: PublicCategory[]
  lang: MenuLocale
  fallback: MenuLocale
  currency: string
  labels: PublicMenuLabels
  headingFont: string
}) {
  const [diet, setDiet] = useState<'vegetarian' | 'vegan' | null>(null)
  const [excluded, setExcluded] = useState<MenuAllergen[]>([])
  const [showFilters, setShowFilters] = useState(false)

  const allItems = categories.flatMap((c) => c.items)
  const presentAllergens = MENU_ALLERGENS.filter((a) => allItems.some((item) => item.allergens.includes(a)))
  const hasVeg = allItems.some((item) => item.diet_tags.includes('vegetarian') || item.diet_tags.includes('vegan'))
  const hasVegan = allItems.some((item) => item.diet_tags.includes('vegan'))
  const filtering = diet !== null || excluded.length > 0

  const matches = (item: PublicItem) => {
    if (diet === 'vegan' && !item.diet_tags.includes('vegan')) return false
    if (diet === 'vegetarian' && !item.diet_tags.includes('vegetarian') && !item.diet_tags.includes('vegan')) return false
    return !item.allergens.some((a) => excluded.includes(a))
  }

  const visible = categories
    .map((category) => ({ ...category, items: category.items.filter(matches) }))
    .filter((category) => category.items.length > 0)
  const specials = allItems.filter((item) => item.is_daily_special && item.available && matches(item))
  const itemName = (item: PublicItem) => item.names?.[lang]?.trim() || item.name

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-semibold ${active ? 'bg-[var(--m-accent)] text-[var(--m-accent-ink)]' : 'border border-[var(--m-line)]/40 text-[var(--m-text)]/80'}`

  return (
    <>
      {(hasVeg || presentAllergens.length > 0) && (
        <div className="mb-8">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="mx-auto flex items-center gap-2 rounded-full border border-[var(--m-line)]/50 px-4 py-2 text-sm font-semibold text-[var(--m-accent)]"
          >
            <SlidersHorizontal className="h-4 w-4" /> {labels.filterTitle}
            {filtering && <span className="rounded-full bg-[var(--m-accent)] px-1.5 text-[10px] text-[var(--m-accent-ink)]">{(diet ? 1 : 0) + excluded.length}</span>}
          </button>
          {showFilters && (
            <div className="mt-4 space-y-4 rounded-2xl border border-[var(--m-line)]/30 bg-[var(--m-text)]/[0.03] p-4">
              {hasVeg && (
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wider text-[var(--m-text)]/50">{labels.filterDiet}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={chip(diet === 'vegetarian')} onClick={() => setDiet(diet === 'vegetarian' ? null : 'vegetarian')}>
                      {labels.tags.vegetarian}
                    </button>
                    {hasVegan && (
                      <button type="button" className={chip(diet === 'vegan')} onClick={() => setDiet(diet === 'vegan' ? null : 'vegan')}>
                        {labels.tags.vegan}
                      </button>
                    )}
                  </div>
                </div>
              )}
              {presentAllergens.length > 0 && (
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wider text-[var(--m-text)]/50">{labels.filterExclude}</p>
                  <div className="flex flex-wrap gap-2">
                    {presentAllergens.map((a) => {
                      const on = excluded.includes(a)
                      return (
                        <button
                          key={a}
                          type="button"
                          className={chip(on)}
                          onClick={() => setExcluded(on ? excluded.filter((x) => x !== a) : [...excluded, a])}
                        >
                          {labels.allergens[a]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              {filtering && (
                <button
                  type="button"
                  onClick={() => {
                    setDiet(null)
                    setExcluded([])
                  }}
                  className="text-xs font-semibold text-[var(--m-accent)] underline underline-offset-2"
                >
                  {labels.clearFilters}
                </button>
              )}
              <p className="text-[11px] leading-5 text-[var(--m-text)]/45">{labels.filterDisclaimer}</p>
            </div>
          )}
        </div>
      )}

      {specials.length > 0 && (
        <section className="mb-10 rounded-2xl border border-[var(--m-line)]/50 bg-[var(--m-line)]/10 p-5">
          <h2 className={`flex items-center gap-2 ${headingFont} text-xl font-bold text-[var(--m-accent)]`}>
            <Star className="h-5 w-5 fill-[var(--m-accent)]" /> {labels.dailySpecial}
          </h2>
          <ul className="mt-3 space-y-3">
            {specials.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-4">
                <span className="font-semibold">{itemName(item)}</span>
                <span className="shrink-0 font-semibold text-[var(--m-accent)]">{formatMenuPrice(item.price, lang, currency)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {visible.length === 0 && <p className="text-center text-[var(--m-text)]/60">{filtering ? labels.noResults : labels.empty}</p>}

      {visible.map((category) => (
        <section key={category.id} className="mb-10">
          <h2 className={`mb-4 border-b border-[var(--m-line)]/30 pb-2 text-center ${headingFont} text-2xl font-bold tracking-wide text-[var(--m-accent)]`}>
            {pickText(category.names, lang, fallback)}
          </h2>
          <ul className="space-y-5">
            {category.items.map((item) => {
              const description = pickText(item.descriptions, lang, fallback)
              const photo = menuPhotoUrl(item.photo_path)
              return (
                <li key={item.id} className={`flex gap-3 ${item.available ? '' : 'opacity-45'}`}>
                  {photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-3">
                      <span className="font-semibold">{itemName(item)}</span>
                      <span className="min-w-4 flex-1 border-b border-dotted border-[var(--m-text)]/25" />
                      <span className="shrink-0 font-semibold text-[var(--m-accent)]">
                        {item.available ? formatMenuPrice(item.price, lang, currency) : labels.soldOut}
                      </span>
                    </div>
                    {itemName(item) !== item.name && <p className="text-xs italic text-[var(--m-text)]/45">{item.name}</p>}
                    {description && <p className="mt-1 text-sm leading-6 text-[var(--m-text)]/70">{description}</p>}
                    {(item.diet_tags.length > 0 || item.allergens.length > 0) && (
                      <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {item.diet_tags.map((tag) => (
                          <span key={tag} className="rounded-full border border-[var(--m-line)]/40 px-2 py-0.5 text-[10px] font-semibold text-[var(--m-accent)]">
                            {labels.tags[tag]}
                          </span>
                        ))}
                        {item.allergens.length > 0 && (
                          <span className="text-[11px] text-[var(--m-text)]/50" title={item.allergens.map((a) => labels.allergens[a]).join(', ')}>
                            {labels.allergensLabel}: {item.allergens.map((a) => allergenNumber(a)).join(', ')}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      {presentAllergens.length > 0 && (
        <section className="mt-12 rounded-2xl border border-[var(--m-line)]/25 p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--m-accent)]">{labels.legendTitle}</h3>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--m-text)]/70">
            {MENU_ALLERGENS.map((a) => (
              <li key={a}>
                {allergenNumber(a)}. {labels.allergens[a]}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
