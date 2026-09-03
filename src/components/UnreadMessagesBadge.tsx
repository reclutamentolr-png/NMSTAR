'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Mail } from 'lucide-react'
import Link from '@/components/LocalizedLink'

export default function UnreadMessagesBadge({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    console.log('🔔 UnreadMessagesBadge montato con count iniziale:', initialCount)

    const handleRefresh = () => {
      console.log('📩 Evento refreshUnreadCount ricevuto! Azzero il contatore.')
      setCount(0)
    }

    window.addEventListener('refreshUnreadCount', handleRefresh)
    return () => {
      console.log('🔕 UnreadMessagesBadge smontato, rimuovo listener.')
      window.removeEventListener('refreshUnreadCount', handleRefresh)
    }
  }, [initialCount])

  // ✅ Caso 1: Ci sono messaggi non letti → Badge rosso lampeggiante
  if (count > 0) {
    return (
      <Link 
        href="/marketplace/chat" 
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-full border border-red-200 hover:bg-red-100 transition-colors animate-pulse"
      >
        <MessageCircle className="w-3 h-3" />
        Hai {count} nuovi messaggi
      </Link>
    )
  }

  // ✅ Caso 2: Nessun messaggio non letto → Link neutro sempre visibile
  return (
    <Link 
      href="/marketplace/chat" 
      className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200 hover:bg-indigo-100 transition-colors"
    >
      <Mail className="w-3 h-3" />
      Leggi i tuoi messaggi
    </Link>
  )
}