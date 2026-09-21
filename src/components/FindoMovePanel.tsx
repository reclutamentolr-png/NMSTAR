'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ArrowRightLeft, LoaderCircle } from 'lucide-react'
import { moveItem } from '@/app/actions/findo'
import { buildBreadcrumb, type FindoLocation } from '@/lib/findo'

export default function FindoMovePanel({
  itemId,
  currentLocationId,
  locations,
}: {
  itemId: string
  currentLocationId: string | null
  locations: FindoLocation[]
}) {
  const t = useTranslations('findo')
  const router = useRouter()
  const [selected, setSelected] = useState<string>(currentLocationId ?? '')
  const [moving, setMoving] = useState(false)

  const locationOptions = useMemo(
    () =>
      locations
        .map((loc) => ({ id: loc.id, breadcrumb: buildBreadcrumb(loc.id, locations) }))
        .sort((a, b) => a.breadcrumb.localeCompare(b.breadcrumb)),
    [locations]
  )

  const handleMove = async () => {
    const newLocationId = selected || null
    if (newLocationId === currentLocationId) return
    setMoving(true)
    const result = await moveItem(itemId, newLocationId)
    setMoving(false)
    if (result.success) {
      router.refresh()
    } else {
      alert(t(result.message))
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
        <ArrowRightLeft className="w-5 h-5 text-amber-600" />
        {t('movePanelTitle')}
      </h3>
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
        >
          <option value="">{t('noLocation')}</option>
          {locationOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.breadcrumb}
            </option>
          ))}
        </select>
        <button
          onClick={handleMove}
          disabled={moving || selected === (currentLocationId ?? '')}
          className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-all disabled:opacity-50"
        >
          {moving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
          {t('moveHere')}
        </button>
      </div>
    </div>
  )
}
