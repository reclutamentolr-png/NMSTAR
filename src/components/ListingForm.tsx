'use client'

import { useState } from 'react'
import { createListingAction } from '@/app/actions/listings'
import { LISTING_COST, type ListingCategory, CATEGORY_LABELS } from '@/lib/listings'
import { X, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from '@/components/LocalizedLink'

type Props = {
  userId: string
  currentPoints: number
  onCloseUrl: string
}

export default function ListingForm({ userId, currentPoints, onCloseUrl }: Props) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!canPublish) {
      setError(`Ti servono almeno ${LISTING_COST} punti per pubblicare`)
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
      setError(result.message)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 mb-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-green-900 mb-2">Annuncio pubblicato!</h3>
        <p className="text-green-700 mb-4">
          Ti sono stati scalati {LISTING_COST} punti. 
          Nuovi punti: <strong>{currentPoints - LISTING_COST}</strong>
        </p>
        <Link href={onCloseUrl} className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold">
          Torna alla Bacheca
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Pubblica un nuovo annuncio</h2>
        <Link href={onCloseUrl} className="text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </Link>
      </div>

      {!canPublish && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-900">Punti insufficienti</p>
            <p className="text-sm text-orange-700">Hai {currentPoints} punti, te ne servono {LISTING_COST}. Accedi ogni giorno per accumularli!</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titolo *</label>
          <input type="text" required maxLength={100} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Es: Consulenza marketing digitale" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
          <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as ListingCategory })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
            <option value="servizi">💼 Servizi</option>
            <option value="prodotti">🛍️ Prodotti</option>
            <option value="collaborazioni">🤝 Collaborazioni</option>
            <option value="eventi">🎉 Eventi</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione *</label>
          <textarea required maxLength={1000} rows={4} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Descrivi il tuo annuncio in dettaglio..." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prezzo (€)</label>
            <input type="number" min="0" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Immagine</label>
            <input type="url" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="https://..." />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email contatto</label>
            <input type="email" value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="tua@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
            <input type="tel" value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="+39..." />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">Costo: <strong className="text-yellow-600">{LISTING_COST} punti</strong> (ti rimarranno <strong>{currentPoints - LISTING_COST}</strong> punti)</p>
          <button type="submit" disabled={loading || !canPublish} className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {loading ? 'Pubblicazione...' : 'Pubblica Annuncio'}
          </button>
        </div>
      </form>
    </div>
  )
}