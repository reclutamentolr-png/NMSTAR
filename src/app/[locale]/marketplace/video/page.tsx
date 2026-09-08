'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from 'next-intl'
import { createVideoRoom, toggleVideoRoom, deleteVideoRoom } from '@/app/actions/video-rooms'
import Link from '@/components/LocalizedLink'
import {
  Video,
  Plus,
  Copy,
  Share2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
  Loader2
} from 'lucide-react'

export default function VideoRoomsPage() {
  const locale = useLocale()
  const supabase = createClient()
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data } = await supabase
          .from('video_rooms')
          .select('*')
          .eq('creator_id', user.id)
          .order('created_at', { ascending: false })
        if (data) setRooms(data)
      }
      setLoading(false)
    }
    init()
  }, [])

  const reload = async () => {
    const { data } = await supabase
      .from('video_rooms')
      .select('*')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })
    if (data) setRooms(data)
  }

  const handleCreate = async () => {
    setCreating(true)
    const result = await createVideoRoom(title)
    if (result.success) {
      setTitle('')
      await reload()
    } else {
      alert('Errore: ' + result.error)
    }
    setCreating(false)
  }

  const roomLink = (slug: string) =>
    `${window.location.origin}/${locale}/marketplace/video/${slug}`

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(roomLink(slug))
    alert('✅ Link copiato! Condividilo con chi vuoi invitare.')
  }

  const shareWhatsApp = (slug: string, roomTitle: string) => {
    const text = encodeURIComponent(
      `Ti invito al mio evento video "${roomTitle}" su Network Marketing Program: ${roomLink(slug)}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const handleToggle = async (id: string, current: boolean) => {
    await toggleVideoRoom(id, !current)
    setRooms(rooms.map(r => (r.id === id ? { ...r, is_active: !current } : r)))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare definitivamente questa stanza? Il link non funzionerà più.')) return
    await deleteVideoRoom(id)
    setRooms(rooms.filter(r => r.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link href="/marketplace" className="text-gray-600 hover:text-indigo-600 flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
            Marketplace
          </Link>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Video className="w-6 h-6 text-indigo-600" />
            Video Eventi
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-600" />
            Crea un evento video
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome dell'evento (es. Consulenza di gruppo, Team call...)"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Video className="w-5 h-5" />}
              Crea stanza
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Riceverai un link di invito da condividere: chiunque lo possieda potrà entrare (anche senza account).
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">I miei eventi</h2>
          {loading ? (
            <div className="text-gray-500">Caricamento...</div>
          ) : rooms.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center text-gray-500">
              <Video className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              Nessuna stanza creata. Inizia ora!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((room) => (
                <div key={room.id} className={`bg-white rounded-xl border p-5 shadow-sm ${room.is_active ? 'border-gray-200' : 'border-gray-200 opacity-60 bg-gray-50'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{room.title}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mt-1 ${room.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {room.is_active ? 'ATTIVA' : 'CHIUSA'}
                      </span>
                    </div>
                    <button onClick={() => handleToggle(room.id, room.is_active)} title={room.is_active ? 'Chiudi stanza' : 'Riapri stanza'}>
                      {room.is_active
                        ? <ToggleRight className="w-10 h-6 text-green-500" />
                        : <ToggleLeft className="w-10 h-6 text-gray-400" />}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => copyLink(room.room_slug)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100"
                    >
                      <Copy className="w-4 h-4" /> Copia link
                    </button>
                    <button
                      onClick={() => shareWhatsApp(room.room_slug, room.title)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100"
                    >
                      <Share2 className="w-4 h-4" /> WhatsApp
                    </button>
                    <button
                      onClick={() => handleDelete(room.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 ml-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}