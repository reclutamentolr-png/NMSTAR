'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const DAILY_API_KEY = process.env.DAILY_API_KEY

// ✅ Crea la stanza su Daily.co (idempotente: se esiste già, non è un errore)
async function createDailyRoom(name: string): Promise<{ ok: boolean; error?: string }> {
  if (!DAILY_API_KEY) return { ok: false, error: 'DAILY_API_KEY non configurata' }

  const res = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DAILY_API_KEY}`
    },
    body: JSON.stringify({
      name,
      properties: {
        enable_knocking: false,        // niente lobby: chi ha il link entra
        enable_waiting_room: false,
        enable_prejoin_ui: true,       // schermata scelta nome/mic/camera
        enable_screenshare: true,
        enable_chat: true,
        enable_emoji_reactions: true,
        enable_hand_raising: true,
        start_video_off: false,
        start_audio_off: true,
        max_participants: 100
      }
    })
  })

  if (res.ok) return { ok: true }

  const body = await res.json().catch(() => null)
  // Se la stanza esiste già su Daily, va bene così
  if (res.status === 400 && body && JSON.stringify(body).toLowerCase().includes('already exists')) {
    return { ok: true }
  }
  return { ok: false, error: body?.error || `Errore Daily ${res.status}` }
}

// ✅ Token OWNER: dà i poteri da moderatore al creatore nella UI Daily
export async function getDailyOwnerToken(roomSlug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: 'Non autorizzato' }
  if (!DAILY_API_KEY) return { success: false as const, error: 'DAILY_API_KEY non configurata' }

  const { data: room } = await supabase
    .from('video_rooms')
    .select('creator_id, is_active')
    .eq('room_slug', roomSlug)
    .single()

  if (!room || room.creator_id !== user.id || !room.is_active) {
    return { success: false as const, error: 'Non sei il creatore di questa stanza' }
  }

  const res = await fetch('https://api.daily.co/v1/meeting-tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DAILY_API_KEY}`
    },
    body: JSON.stringify({
      properties: {
        room_name: roomSlug,
        is_owner: true,
        enable_screenshare: true,
        enable_chat: true,
        start_video_off: false,
        start_audio_off: false
      }
    })
  })

  if (!res.ok) return { success: false as const, error: 'Errore generazione token Daily' }
  const data = await res.json()
  return { success: true as const, token: data.token as string }
}

// ✅ Crea stanza: record Supabase + stanza Daily
export async function createVideoRoom(title: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Devi essere loggato' }

  const slug = `nmp-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`

  // 1) Crea prima la stanza su Daily
  const daily = await createDailyRoom(slug)
  if (!daily.ok) {
    console.error('❌ Errore creazione stanza Daily:', daily.error)
    return { success: false, error: daily.error || 'Errore servizio video' }
  }

  // 2) Poi salva il record nel nostro database
  const { data, error } = await supabase
    .from('video_rooms')
    .insert({
      room_slug: slug,
      title: title?.trim() || 'Evento video',
      creator_id: user.id
    })
    .select()
    .single()

  if (error) {
    console.error('❌ Errore salvataggio stanza:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/marketplace/video')
  return { success: true, room: data }
}

// ✅ Apri/chiudi stanza
export async function toggleVideoRoom(roomId: string, active: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non autorizzato' }

  const { error } = await supabase
    .from('video_rooms')
    .update({ is_active: active })
    .eq('id', roomId)
    .eq('creator_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/marketplace/video')
  return { success: true }
}

// ✅ Elimina stanza (Supabase + best-effort su Daily)
export async function deleteVideoRoom(roomId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non autorizzato' }

  const { data: room } = await supabase
    .from('video_rooms')
    .select('room_slug')
    .eq('id', roomId)
    .eq('creator_id', user.id)
    .single()

  if (!room) return { success: false, error: 'Stanza non trovata' }

  const { error } = await supabase
    .from('video_rooms')
    .delete()
    .eq('id', roomId)
    .eq('creator_id', user.id)

  if (error) return { success: false, error: error.message }

  // Best-effort: elimina anche la stanza su Daily (non bloccante)
  if (DAILY_API_KEY) {
    fetch(`https://api.daily.co/v1/rooms/${room.room_slug}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` }
    }).catch(() => {})
  }

  revalidatePath('/marketplace/video')
  return { success: true }
}