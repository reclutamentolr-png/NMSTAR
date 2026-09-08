'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Crea una stanza con slug casuale (il link È l'invito)
export async function createVideoRoom(title: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Devi essere loggato' }

  const slug = `nmp-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`

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
    console.error('❌ Errore creazione stanza:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/marketplace/video')
  return { success: true, room: data }
}

// Apri/chiudi stanza
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

// Elimina stanza
export async function deleteVideoRoom(roomId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non autorizzato' }

  const { error } = await supabase
    .from('video_rooms')
    .delete()
    .eq('id', roomId)
    .eq('creator_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/marketplace/video')
  return { success: true }
}