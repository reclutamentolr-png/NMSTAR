'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation' // ✅ CORRETTO e stabile
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase, 
  Save, 
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

type ProfileModalProps = {
  isOpen: boolean
  onClose: () => void
  initialData: any
  userId: string
}

export default function ProfileModal({ isOpen, onClose, initialData, userId }: ProfileModalProps) {
  const [formData, setFormData] = useState({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    phone: initialData?.phone || '',
    country_code: initialData?.country_code || '',
    date_of_birth: initialData?.date_of_birth === '2000-01-01' ? '' : initialData?.date_of_birth || '',
    occupation: initialData?.occupation || ''
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()
  const router = useRouter()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...formData,
          date_of_birth: formData.date_of_birth || '2000-01-01'
        })
        .eq('id', userId)

      if (error) throw error

      setSuccess(true)
      router.refresh() // Aggiorna i dati nel server component
      
      // Chiudi il modale dopo 1.5 secondi
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modale */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-full">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Modifica Profilo</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <User className="w-4 h-4" /> Nome
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <User className="w-4 h-4" /> Cognome
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Phone className="w-4 h-4" /> Telefono
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <MapPin className="w-4 h-4" /> Paese
              </label>
              <input
                type="text"
                value={formData.country_code}
                onChange={(e) => setFormData({...formData, country_code: e.target.value})}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="es. IT"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Data di nascita
              </label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Briefcase className="w-4 h-4" /> Occupazione
              </label>
              <input
                type="text"
                value={formData.occupation}
                onChange={(e) => setFormData({...formData, occupation: e.target.value})}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
              <CheckCircle2 className="w-4 h-4" /> Profilo aggiornato con successo!
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvataggio...' : 'Salva Modifiche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}