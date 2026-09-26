'use client'

import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

// Segnali in tempo reale di Affinity (canale privato "affinity:<id utente>",
// vedi migrazione affinity_realtime). Una sola connessione condivisa da tutti
// i componenti della pagina: chat, presentazioni, pallino in dashboard.
// Il segnale non porta dati: chi lo riceve rilegge con le funzioni protette.
// Rete di sicurezza: aggiornamento quando la pagina torna visibile e ogni
// 60 secondi solo se visibile (connessione caduta, telefono in standby).

type Listener = () => void
const listeners = new Set<Listener>()
let channel: RealtimeChannel | null = null
let starting = false

function notifyAll() {
  for (const listener of listeners) listener()
}

async function start() {
  if (channel || starting) return
  starting = true
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || listeners.size === 0) return
    await supabase.realtime.setAuth()
    channel = supabase
      .channel(`affinity:${user.id}`, { config: { private: true } })
      .on('broadcast', { event: '*' }, notifyAll)
      .subscribe()
  } catch {
    // Senza tempo reale restano i controlli di riserva.
  } finally {
    starting = false
  }
}

function stop() {
  if (!channel) return
  createClient().removeChannel(channel)
  channel = null
}

export function useAffinityRealtime(onSignal: () => void) {
  const callback = useRef(onSignal)

  useEffect(() => {
    callback.current = onSignal
  }, [onSignal])

  useEffect(() => {
    const listener = () => callback.current()
    listeners.add(listener)
    start()

    const onVisible = () => {
      if (document.visibilityState === 'visible') listener()
    }
    document.addEventListener('visibilitychange', onVisible)
    const fallback = setInterval(() => {
      if (document.visibilityState === 'visible') listener()
    }, 60000)

    return () => {
      listeners.delete(listener)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(fallback)
      if (listeners.size === 0) stop()
    }
  }, [])
}
