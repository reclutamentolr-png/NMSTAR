'use client'

import { useState } from 'react'
import { JitsiMeeting } from '@jitsi/react-sdk'
import { Video } from 'lucide-react'

type VideoJoinClientProps = {
  roomName: string
  title: string
}

export default function VideoJoinClient({ roomName, title }: VideoJoinClientProps) {
  const [joined, setJoined] = useState(false)

  if (!joined) {
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
    <div className="min-h-screen bg-gray-900">
      <JitsiMeeting
        roomName={roomName}
        configOverwrite={{
          startWithAudioMuted: true,
          prejoinPageEnabled: true,
          disableDeepLinking: true,
          subject: title
        }}
        interfaceConfigOverwrite={{
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false
        }}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.height = '100vh'
          iframeRef.style.width = '100%'
        }}
      />
    </div>
  )
}