import { createClient } from '@/lib/supabase/server'
import VideoJoinClient from '@/components/VideoJoinClient'
import Link from '@/components/LocalizedLink'
import { VideoOff } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function VideoRoomPage({
  params
}: {
  params: Promise<{ locale: string; room: string }>
}) {
  const { locale, room } = await params
  const supabase = await createClient()

  const { data: roomData } = await supabase
    .from('video_rooms')
    .select('*')
    .eq('room_slug', room)
    .single()

  if (!roomData || !roomData.is_active) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow p-10 text-center max-w-md">
          <VideoOff className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Evento non disponibile</h1>
          <p className="text-gray-600 mb-6">
            La stanza video non esiste o è stata chiusa dall'organizzatore.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold"
          >
            Torna alla home
          </Link>
        </div>
      </div>
    )
  }

  return <VideoJoinClient roomName={roomData.room_slug} title={roomData.title} />
}