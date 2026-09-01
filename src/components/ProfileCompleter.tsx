'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase, 
  Save, 
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react'

type ProfileCompleterProps = {
  initialData: any
}

export default function ProfileCompleter({ initialData }: ProfileCompleterProps) {
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
  const [dismissed, setDismissed] = useState(false)
  const [saved, setSaved] = useState(false) // ✅ NUOVO: per chiudere il banner dopo il salvataggio
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
      setSaved(true) // ✅ Chiude il banner dopo il successo
    } catch (err: any) {
      setError(err.message || 'Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  // ✅ Il banner si chiude se l'utente lo ha dismissato OPPURE se il salvataggio è riuscito
  if (dismissed || saved) return null

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-lg p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="bg-amber-100 p-2 rounded-full">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-amber-900">Completa il tuo profilo</h3>
            <p className="text-sm text-amber-700 mt-1">
              Aggiungi le tue informazioni per apparire professionalmente nella piattaforma
            </p>
          </div>
        </div>
        <button 
          onClick={() => setDismissed(true)}
          className="text-amber-600 hover:text-amber-800"
          title="Chiudi"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <User className="w-4 h-4" /> Nome
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({...formData, first_name: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
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

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvataggio...' : 'Salva profilo'}
          </button>
        </div>
      </form>
    </div>
  )
}