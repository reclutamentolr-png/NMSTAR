'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  User,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Home,
  Building2,
  MapPinned,
  Save,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react'

type ProfileCompleterProps = {
  initialData: any
  // Nel popup promemoria: "Più tardi" / chiudi e fine salvataggio li gestisce chi lo apre.
  onDismiss?: () => void
  onSaved?: () => void
}

export default function ProfileCompleter({ initialData, onDismiss, onSaved }: ProfileCompleterProps) {
  const t = useTranslations('dashboard')
  const commonT = useTranslations('common')
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    phone: initialData?.phone || '',
    country_code: initialData?.country_code || '',
    date_of_birth: initialData?.date_of_birth === '2000-01-01' ? '' : initialData?.date_of_birth || '',
    occupation: initialData?.occupation || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    province: initialData?.province || ''
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [saved, setSaved] = useState(false) 
  
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...formData,
          date_of_birth: formData.date_of_birth || '2000-01-01'
        })
        .eq('id', initialData.id)

      if (error) throw error

      setSuccess(true)
      setSaved(true)
      onSaved?.()

      router.refresh()
      
    } catch (err: any) {
      setError(err.message || t('error'))
    } finally {
      setSaving(false)
    }
  }

  if (dismissed || saved) return null

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-lg p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="bg-amber-100 p-2 rounded-full">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-amber-900">{t('completeProfile')}</h3>
            <p className="text-sm text-amber-700 mt-1">
              {t('completeProfileDesc')}
            </p>
          </div>
        </div>
        <button 
          onClick={() => (onDismiss ? onDismiss() : setDismissed(true))}
          className="text-amber-600 hover:text-amber-800"
          title={commonT('close')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> {t('firstName')}
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({...formData, first_name: e.target.value})}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> {t('lastName')}
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({...formData, last_name: e.target.value})}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> {t('phone')}
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> {t('dateOfBirth')}
            </label>
            <input
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5" /> {t('occupation')}
            </label>
            <input
              type="text"
              value={formData.occupation}
              onChange={(e) => setFormData({...formData, occupation: e.target.value})}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {t('country')}
            </label>
            <input
              type="text"
              value={formData.country_code}
              onChange={(e) => setFormData({...formData, country_code: e.target.value})}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              placeholder={t('countryShort')}
            />
          </div>
          <div className="col-span-2 sm:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Home className="w-3.5 h-3.5" /> {t('address')}
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              placeholder={t('addressPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> {t('city')}
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
              <MapPinned className="w-3.5 h-3.5" /> {t('province')}
            </label>
            <input
              type="text"
              value={formData.province}
              onChange={(e) => setFormData({...formData, province: e.target.value})}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {t('profileUpdated')}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          {onDismiss && (
            <button type="button" onClick={onDismiss} className="px-4 py-2 rounded-lg font-medium text-amber-800 hover:bg-amber-100">
              {t('profileLater')}
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? t('saving') : t('saveProfile')}
          </button>
        </div>
      </form>
    </div>
  )
}
