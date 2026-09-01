'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type ActivityTrackerProps = {
  userId: string
}

export default function ActivityTracker({ userId }: ActivityTrackerProps) {
  const supabase = createClient()

  useEffect(() => {
    // Aggiorna last_seen all'avvio
    const updateLastSeen = async () => {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', userId)
    }

    updateLastSeen()

    // Aggiorna ogni 60 secondi
    const interval = setInterval(updateLastSeen, 60000)

    return () => clearInterval(interval)
  }, [userId, supabase])

  return null // Componente invisibile
}