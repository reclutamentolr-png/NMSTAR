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
        // ✅ Solo proprietà valide secondo l'API Daily.co
        enable_knocking: false,         // niente "bussare" per entrare
        enable_prejoin_ui: true,        // schermata pre-join (nome/mic/camera)
        enable_screenshare: true,       // condivisione schermo abilitata
        enable_emoji_reactions: true,   // reazioni emoji
        enable_hand_raising: true,      // alzare la mano
        start_video_off: false,         // camera accesa di default
        start_audio_off: true,          // microfono spento di default (privacy)
        max_participants: 100           // limite partecipanti
      }
    })
  })

  if (res.ok) return { ok: true }

  const body = await res.json().catch(() => null)
  if (res.status === 400 && body && JSON.stringify(body).toLowerCase().includes('already exists')) {
    return { ok: true }
  }
  console.error('❌ Daily create room error:', res.status, JSON.stringify(body))
  return { ok: false, error: body?.error || `Errore Daily ${res.status}` }
}

// ✅ Token OWNER con AUTO-CREAZIONE della stanza se manca
export async function getDailyOwnerToken(roomSlug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: 'Non autorizzato' }
  if (!DAILY_API_KEY) return { success: false as const, error: 'DAILY_API_KEY non configurata sul server' }

  const { data: room } = await supabase
    .from('video_rooms')
    .select('creator_id, is_active')
    .eq('room_slug', roomSlug)
    .single()

  if (!room || room.creator_id !== user.id || !room.is_active) {
    return { success: false as const, error: 'Non sei il creatore di questa stanza' }
  }

  // ✅ Token payload con SOLO proprietà valide per meeting tokens
  const tokenPayload = {
    properties: {
      room_name: roomSlug,
      is_owner: true,
      enable_screenshare: true,
      start_video_off: false,
      start_audio_off: false
    }
  }

  const requestToken = () =>
    fetch('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DAILY_API_KEY}`
      },
      body: JSON.stringify(tokenPayload)
    })

  let res = await requestToken()

  // ✅ Se la stanza non esiste su Daily (stanze pre-migrazione), creala e riprova
  if (!res.ok) {
    console.log('🔄 Token fallito, provo a creare la stanza Daily e riprovo...')
    const created = await createDailyRoom(roomSlug)
    if (created.ok) {
      res = await requestToken()
    }
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => null)
    console.error('❌ Daily token error:', res.status, JSON.stringify(errBody))
    return {
      success: false as const,
      error: `Errore Daily ${res.status}: ${errBody?.error || 'verifica API key e dominio'}`
    }
  }

  const data = await res.json()
  return { success: true as const, token: data.token as string }
}

// ✅ Crea stanza: record Supabase + stanza Daily
export async function createVideoRoom(title: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Devi essere loggato' }

  const slug = `nmp-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`

  const daily = await createDailyRoom(slug)
  if (!daily.ok) {
    return { success: false, error: daily.error || 'Errore servizio video' }
  }

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

  if (DAILY_API_KEY) {
    fetch(`https://api.daily.co/v1/rooms/${room.room_slug}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` }
    }).catch(() => {})
  }

  revalidatePath('/marketplace/video')
  return { success: true }
}