'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createListingAction } from '@/app/actions/listings'
import { LISTING_COST, type ListingCategory, CATEGORY_ICONS } from '@/lib/listings'
import { X, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from '@/components/LocalizedLink'

type Props = {
  userId: string
  currentPoints: number
  onCloseUrl: string
}

const CATEGORY_LABELS_MAP: Record<ListingCategory, string> = {
  servizi: 'services',
  prodotti: 'products',
  collaborazioni: 'collaborations',
  eventi: 'events'
}

export default function ListingForm({ userId, currentPoints, onCloseUrl }: Props) {
  const t = useTranslations('marketplace')
  const commonT = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'servizi' as ListingCategory,
    price: '',
    imageUrl: '',
    contactEmail: '',
    contactPhone: ''
  })

  const canPublish = currentPoints >= LISTING_COST

  const categoryEmojis = {
    servizi: '\u{1F4BC}',
    prodotti: '\u{1F6CD}',
    collaborazioni: '\u{1F91D}',
    eventi: '\u{1F389}'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!canPublish) {
      setError(`${t('notEnoughPointsDesc', { current: currentPoints, cost: LISTING_COST })} ${t('dailyAccess')}`)
      setLoading(false)
      return
    }

    const result = await createListingAction({
      userId,
      title: formData.title,
      description: formData.description,
      category: formData.category,
      price: formData.price ? parseFloat(formData.price) : undefined,
      imageUrl: formData.imageUrl || undefined,
      contactEmail: formData.contactEmail || undefined,
      contactPhone: formData.contactPhone || undefined
    })

    if (result.success) {
      setSuccess(true)
    } else {
      setError(result.message ?? t('publishError'))
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 mb-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-green-900 mb-2">{t('publishSuccess')}</h3>
        <p className="text-green-700 mb-4">
          {t('pointsDeducted', { cost: LISTING_COST, remaining: currentPoints - LISTING_COST })}
        </p>
        <Link href={onCloseUrl} className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold">
          {t('backToMarketplace')}
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">{t('publishYourListing')}</h2>
        <Link href={onCloseUrl} className="text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </Link>
      </div>

      {!canPublish && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-900">{t('notEnoughPoints')}</p>
            <p className="text-sm text-orange-700">{t('notEnoughPointsDesc', { current: currentPoints, cost: LISTING_COST })} {t('dailyAccess')}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('listingTitle')} *</label>
          <input type="text" required maxLength={100} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder={t('listingTitlePlaceholder')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('listingCategory')} *</label>
          <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as ListingCategory })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
            <option value="servizi">{categoryEmojis.servizi} {t('services')}</option>
            <option value="prodotti">{categoryEmojis.prodotti} {t('products')}</option>
            <option value="collaborazioni">{categoryEmojis.collaborazioni} {t('collaborations')}</option>
            <option value="eventi">{categoryEmojis.eventi} {t('events')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('listingDescription')} *</label>
          <textarea required maxLength={1000} rows={4} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder={t('listingDescPlaceholder')} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('listingPrice')}</label>
            <input type="number" min="0" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('listingImageUrl')}</label>
            <input type="url" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder={t('listingImageUrlPlaceholder')} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('contactEmail')}</label>
            <input type="email" value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder={t('contactEmailPlaceholder')} />
            <p className="text-xs text-gray-500 mt-1">{t('notVisiblePublicly')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('contactPhone')}</label>
            <input type="tel" value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder={t('contactPhonePlaceholder')} />
            <p className="text-xs text-gray-500 mt-1">{t('notVisiblePublicly')}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">{t('cost')}: <strong className="text-yellow-600">{LISTING_COST} {commonT('points')}</strong> ({t('remaining')}: <strong>{currentPoints - LISTING_COST}</strong> {commonT('points')})</p>
          <button type="submit" disabled={loading || !canPublish} className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {loading ? t('publishing') : t('publish')}
          </button>
        </div>
      </form>
    </div>
  )
}
