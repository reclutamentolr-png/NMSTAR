'use client'

import { useLocale, useTranslations } from 'next-intl'

type Props = {
  value: string // "YYYY-MM" or ""
  onChange: (value: string) => void
  disabled?: boolean
}

const inputClass =
  'w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--gold)] text-sm disabled:opacity-50'

/**
 * Two plain <select>s instead of <input type="month"> — the native month
 * picker doesn't let you type the year directly and its year stepper only
 * moves one year at a time, making it painful to reach e.g. 1998 from the
 * current year. A year <select> jumps there in one click; a month <select>
 * needs no typing at all. Still stores/reads the same "YYYY-MM" string so
 * nothing downstream (PDF, templates) has to change.
 */
export default function MonthYearPicker({ value, onChange, disabled }: Props) {
  const t = useTranslations('kumaniCv')
  const locale = useLocale()
  const [year, month] = value ? value.split('-') : ['', '']

  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = currentYear + 1; y >= currentYear - 70; y--) years.push(y)

  const monthNames = Array.from({ length: 12 }, (_, i) => {
    try {
      return new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2000, i, 1))
    } catch {
      return String(i + 1).padStart(2, '0')
    }
  })

  const handleMonthChange = (m: string) => {
    if (!m) {
      onChange(year ? `${year}-` : '')
      return
    }
    onChange(`${year || currentYear}-${m}`)
  }

  const handleYearChange = (y: string) => {
    if (!y) {
      onChange('')
      return
    }
    onChange(`${y}-${month || '01'}`)
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <select value={month} onChange={(e) => handleMonthChange(e.target.value)} disabled={disabled} className={inputClass}>
        <option value="">{t('monthPlaceholder')}</option>
        {monthNames.map((name, idx) => {
          const mm = String(idx + 1).padStart(2, '0')
          return (
            <option key={mm} value={mm}>
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </option>
          )
        })}
      </select>
      <select value={year} onChange={(e) => handleYearChange(e.target.value)} disabled={disabled} className={inputClass}>
        <option value="">{t('yearPlaceholder')}</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  )
}
