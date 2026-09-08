import { createClient } from '@/lib/supabase/server'
import VideoJoinClient from '@/components/VideoJoinClient'
import { getDailyOwnerToken } from '@/app/actions/video-rooms'
import Link from '@/components/LocalizedLink'
import { VideoOff, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function VideoRoomPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string; room: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { locale, room } = await params
  const sp = await searchParams
  const isModerator = sp?.moderator === '1'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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

  // ✅ Controllo se l'utente loggato è il creatore della stanza
  const isOwner = user?.id === roomData.creator_id
  const finalIsModerator = isModerator && isOwner

  // ✅ Se è l'organizzatore, genera il token Daily con permessi da moderatore
  // (nessun sign-in Google/GitHub richiesto - addio lobby e limiti!)
  let ownerToken: string | undefined = undefined
  if (finalIsModerator) {
    const tokenResult = await getDailyOwnerToken(roomData.room_slug)
    if (tokenResult.success) {
      ownerToken = tokenResult.token
    } else {
      // Se il token non può essere generato (API key mancante o altro errore),
      // mostriamo un messaggio chiaro invece di far entrare senza permessi
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow p-10 text-center max-w-md">
            <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Configurazione mancante</h1>
            <p className="text-gray-600 mb-6">
              Impossibile entrare come organizzatore: {tokenResult.error}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Verifica che <code className="bg-gray-100 px-2 py-1 rounded">DAILY_API_KEY</code> sia configurata su Vercel.
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
  }

  // ✅ Nome visualizzato: "Organizzatore" per il creatore, niente per gli ospiti
  // (gli ospiti sceglieranno il loro nome nella pre-join UI di Daily)
  const displayName = finalIsModerator ? 'Organizzatore' : undefined

  return (
    <VideoJoinClient
      roomName={roomData.room_slug}
      title={roomData.title}
      isModerator={finalIsModerator}
      token={ownerToken}
      displayName={displayName}
    />
  )
}