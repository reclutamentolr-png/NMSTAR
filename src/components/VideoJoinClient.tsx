'use client'

import { useEffect, useRef, useState } from 'react'
import DailyIframe, { DailyCall } from '@daily-co/daily-js'
import { Video, Shield } from 'lucide-react'

type VideoJoinClientProps = {
  roomName: string
  title: string
  isModerator?: boolean
  token?: string
  displayName?: string
}

const DAILY_DOMAIN = process.env.NEXT_PUBLIC_DAILY_DOMAIN || 'your-subdomain.daily.co'

export default function VideoJoinClient({
  roomName,
  title,
  isModerator = false,
  token,
  displayName
}: VideoJoinClientProps) {
  // ✅ L'organizzatore entra subito; gli ospiti vedono la schermata di benvenuto
  const [joined, setJoined] = useState(isModerator)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const callRef = useRef<DailyCall | null>(null)

  useEffect(() => {
    if (!joined || !containerRef.current) return

    const call = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: {
        width: '100%',
        height: '100%',
        border: 'none'
      },
      theme: {
        colors: {
          mainPrimary: '#6366f1',
          mainLight: '#818cf8',
          background: '#0f172a',
          baseText: '#e2e8f0'
        }
      }
    })

    callRef.current = call

    call.join({
      url: `https://${DAILY_DOMAIN}/${roomName}`,
      token: token || undefined,
      userName: displayName || undefined,
      showLeaveButton: true,
      startAudioOff: true,
      startVideoOff: false
    })

    return () => {
      // ✅ Pulizia: distruggi la chiamata quando il componente si smonta
      try {
        call.destroy()
      } catch {
        // ignora errori di cleanup
      }
      callRef.current = null
    }
  }, [joined, roomName, token, displayName])

  // ✅ Schermata di ingresso per gli ospiti
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
    <div className="min-h-screen bg-gray-900 relative">
      {/* Badge organizzatore */}
      {isModerator && (
        <div className="absolute top-4 left-4 z-10 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg pointer-events-none">
          <Shield className="w-4 h-4" />
          <span className="text-sm font-bold">Sei l'organizzatore</span>
        </div>
      )}

      {/* ✅ Container dove Daily monta la sua UI completa */}
      <div ref={containerRef} className="w-full" style={{ height: '100vh' }} />
    </div>
  )
}