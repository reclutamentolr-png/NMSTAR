'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

// Selettore anno condiviso da Dashboard/Entrate/Spese Fisse/Spese
// Variabili/Capienza — guida lo stato via query string (?year=2026) invece
// che state locale, così il link è condivisibile e il valore sopravvive al
// refresh, stesso principio delle altre pagine con filtri via URL nel
// progetto. La Dashboard passa dashboardYears() (storico dal 2024 a oggi),
// le altre pagine passano currentYearOnly() — niente anni passati da
// ripulire né anni futuri non ancora iniziati.
export default function YearSelect({ year, years }: { year: number; years: number[] }) {
  const t = useTranslations('spendly')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('year', e.target.value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <label className="inline-flex items-center gap-2">
      <span className="sr-only">{t('year')}</span>
      <select
        value={year}
        onChange={handleChange}
        className="rounded-lg border border-[var(--gold)]/30 bg-[var(--paper)] px-3 py-2 text-sm font-medium text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </label>
  )
}
