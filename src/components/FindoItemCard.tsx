'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from '@/components/LocalizedLink'
import { Star, Trash2, Package, MapPin, LoaderCircle } from 'lucide-react'
import { toggleFavorite, deleteItem } from '@/app/actions/findo'

type Item = {
  id: string
  name: string
  category: string | null
  tags: string[]
  is_favorite: boolean
  photo_url: string | null
  location_breadcrumb: string
}

export default function FindoItemCard({ item }: { item: Item }) {
  const t = useTranslations('findo')
  const router = useRouter()
  const [togglingFavorite, setTogglingFavorite] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleToggleFavorite = async () => {
    setTogglingFavorite(true)
    const result = await toggleFavorite(item.id, item.is_favorite)
    setTogglingFavorite(false)
    if (result.success) {
      router.refresh()
    } else {
      alert(t(result.message))
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('deleteConfirm'))) return
    setDeleting(true)
    const result = await deleteItem(item.id)
    if (result.success) {
      router.refresh()
    } else {
      alert(t(result.message))
      setDeleting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-50 border border-gray-200 shrink-0 flex items-center justify-center">
        {item.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.photo_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Package className="w-6 h-6 text-gray-300" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
        {item.location_breadcrumb && (
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            {item.location_breadcrumb}
          </p>
        )}
        {(item.category || item.tags.length > 0) && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {[item.category, ...item.tags].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleToggleFavorite}
          disabled={togglingFavorite}
          className="p-2 rounded-lg hover:bg-gray-100 transition-all disabled:opacity-50"
          title={t('favorite')}
        >
          <Star className={`w-4 h-4 ${item.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
        </button>
        <Link
          href={`/marketplace/findo/${item.id}`}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
        >
          {t('details')}
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          title={t('deleteItem')}
          className="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-all disabled:opacity-50"
        >
          {deleting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
