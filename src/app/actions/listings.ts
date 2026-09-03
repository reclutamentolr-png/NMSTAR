// src/app/actions/listings.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { LISTING_COST, type CreateListingData } from '@/lib/listings'

export async function createListingAction(data: CreateListingData) {
  const supabase = await createClient()
  
  // 1. Verifica punti utente
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('daily_points')
    .eq('id', data.userId)
    .single()
  
  if (profileError || !profile) {
    return { success: false, message: 'Profilo non trovato' }
  }
  
  if ((profile.daily_points || 0) < LISTING_COST) {
    return { success: false, message: `Ti servono almeno ${LISTING_COST} punti per pubblicare un annuncio` }
  }
  
  // 2. Scala 10 punti
  const newPoints = (profile.daily_points || 0) - LISTING_COST
  const { error: pointsError } = await supabase
    .from('profiles')
    .update({ daily_points: newPoints })
    .eq('id', data.userId)
  
  if (pointsError) {
    return { success: false, message: 'Errore nell\'aggiornamento punti' }
  }
  
  // 3. Crea l'annuncio
  const { data: listing, error } = await supabase
    .from('listings')
    .insert({
      user_id: data.userId,
      title: data.title,
      description: data.description,
      category: data.category,
      price: data.price,
      image_url: data.imageUrl,
      contact_email: data.contactEmail,
      contact_phone: data.contactPhone,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })
    .select()
    .single()
  
  if (error) {
    // Rollback punti se fallisce
    await supabase.from('profiles').update({ daily_points: profile.daily_points }).eq('id', data.userId)
    return { success: false, message: 'Errore nella creazione dell\'annuncio' }
  }
  
  return { success: true, listing, newPoints }
}

export async function deleteListingAction(listingId: string, userId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('listings').delete().eq('id', listingId).eq('user_id', userId)
  
  if (error) return { success: false, message: 'Errore nell\'eliminazione' }
  return { success: true }
}

export async function markMessagesAsRead(userId: string, otherUserId: string, listingId?: string) {
  const supabase = await createClient()
  
  console.log('🔄 Tentativo di update DB per:', { userId, otherUserId, listingId })
  
  let query = supabase
    .from('messages')
    .update({ is_read: true })
    .eq('receiver_id', userId)
    .eq('sender_id', otherUserId)
    .eq('is_read', false) // Aggiorna solo quelli non letti
    
  if (listingId) {
    query = query.eq('listing_id', listingId)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('❌ ERRORE SUPABASE markMessagesAsRead:', error)
    return { success: false, error: error.message }
  }
  
  console.log('✅ SUCCESSO: Messaggi aggiornati nel DB')
  return { success: true, data }
}


export async function deleteConversationAction(userId: string, otherUserId: string, listingId?: string) {
  const supabase = await createClient()
  
  // Elimina i messaggi ricevuti dall'altro utente
  let deleteReceived = supabase.from('messages').delete()
    .eq('receiver_id', userId)
    .eq('sender_id', otherUserId)
    
  if (listingId) deleteReceived = deleteReceived.eq('listing_id', listingId)
  await deleteReceived

  // Elimina i messaggi inviati all'altro utente (per pulire completamente la chat)
  let deleteSent = supabase.from('messages').delete()
    .eq('sender_id', userId)
    .eq('receiver_id', otherUserId)
    
  if (listingId) deleteSent = deleteSent.eq('listing_id', listingId)
  
  const { error } = await deleteSent
  return { success: !error }
}