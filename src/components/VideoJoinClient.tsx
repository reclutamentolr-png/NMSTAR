'use client'

import { useState } from 'react'
import { JitsiMeeting } from '@jitsi/react-sdk'
import { Video, Shield } from 'lucide-react'

type VideoJoinClientProps = {
  roomName: string
  title: string
  isModerator?: boolean
  displayName?: string
}

export default function VideoJoinClient({ roomName, title, isModerator = false, displayName }: VideoJoinClientProps) {
  const [joined, setJoined] = useState(false)

  // ✅ Schermata di ingresso per gli ospiti
  if (!joined && !isModerator) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-10 text-center max-w-md w-full">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Video className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-gray-600 mb-6">
            Sei stato invitato a questo evento video. Potrai scegliere nome, microfono e camera prima di entrare.
          </p>
          <button
            onClick={() => setJoined(true)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            Entra nella stanza
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 relative">
      {/* Badge organizzatore */}
      {isModerator && (
        <div className="absolute top-4 left-4 z-10 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
          <Shield className="w-4 h-4" />
          <span className="text-sm font-bold">Sei l'organizzatore</span>
        </div>
      )}

      <JitsiMeeting
        roomName={roomName}
        configOverwrite={{
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          // ✅ L'organizzatore entra subito, niente pre-join
          prejoinPageEnabled: !isModerator,
          disableDeepLinking: true,
          subject: title,
          lobby: { enabled: false },
          enableModeratorIndicator: true
        }}
        interfaceConfigOverwrite={{
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false
        }}
        userInfo={{
          displayName: displayName || (isModerator ? 'Organizzatore' : 'Ospite'),
          email: ''   // ✅ FIX TS2741: il tipo dell'SDK richiede obbligatoriamente anche email
        }}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.height = '100vh'
          iframeRef.style.width = '100%'
        }}
      />
    </div>
  )
}