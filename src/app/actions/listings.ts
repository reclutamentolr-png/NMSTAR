// src/app/actions/listings.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { LISTING_COST, type CreateListingData } from '@/lib/listings'

// ✅ Service client per bypassare RLS (come admin)
const getServiceClient = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

export async function createListingAction(data: CreateListingData) {
  const supabase = await createClient()
  
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
  
  const newPoints = (profile.daily_points || 0) - LISTING_COST
  const { error: pointsError } = await supabase
    .from('profiles')
    .update({ daily_points: newPoints })
    .eq('id', data.userId)
  
  if (pointsError) {
    return { success: false, message: 'Errore nell\'aggiornamento punti' }
  }
  
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
  
  let query = supabase
    .from('messages')
    .update({ is_read: true })
    .eq('receiver_id', userId)
    .eq('sender_id', otherUserId)
    .eq('is_read', false)
    
  if (listingId) {
    query = query.eq('listing_id', listingId)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('❌ ERRORE SUPABASE markMessagesAsRead:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

// ✅ CANCELLAZIONE CONVERSAZIONE - Usa service client per bypassare RLS
export async function deleteConversationAction(
  currentUserId: string, 
  otherUserId: string, 
  listingId?: string
) {
  console.log('🗑️ [DELETE] === INIZIO CANCELLAZIONE CONVERSAZIONE ===')
  console.log('🗑️ [DELETE] Parametri:', { currentUserId, otherUserId, listingId })

  const supabase = await createClient()

  // STEP 1: Verifica che chi cancella sia l'autore della conversazione
  let firstMessageQuery = supabase
    .from('messages')
    .select('sender_id')
    .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (listingId) {
    firstMessageQuery = firstMessageQuery.eq('listing_id', listingId)
  }

  const { data: firstMessage, error: firstMsgError } = await firstMessageQuery

  if (firstMsgError || !firstMessage) {
    console.error('❌ [DELETE] Nessun messaggio trovato:', firstMsgError?.message)
    return { success: false, error: 'Conversazione non trovata' }
  }

  if (firstMessage.sender_id !== currentUserId) {
    console.log('⛔ [DELETE] Utente non autorizzato')
    return { 
      success: false, 
      error: 'Non hai i permessi per cancellare questa conversazione' 
    }
  }

  console.log('✅ [DELETE] Utente autorizzato, procedo con cancellazione HARD')

  // ✅ STEP 2: CANCELLAZIONE con SERVICE CLIENT (bypass RLS)
  const supabaseAdmin = getServiceClient()

  let deleteQuery = supabaseAdmin
    .from('messages')
    .delete()
    .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
    .select('id')  // ✅ Seleziona gli id per contare quanti messaggi sono stati cancellati

  if (listingId) {
    deleteQuery = deleteQuery.eq('listing_id', listingId)
  }

  const { data: deletedMessages, error: deleteError } = await deleteQuery

  if (deleteError) {
    console.error('❌ [DELETE] Errore cancellazione:', deleteError.message)
    return { success: false, error: deleteError.message }
  }

  const deletedCount = deletedMessages?.length || 0
  console.log(`✅ [DELETE] Cancellati ${deletedCount} messaggi dal DB`)

  if (deletedCount === 0) {
    console.warn('⚠️ [DELETE] Nessun messaggio cancellato - verifica RLS')
  }

  // STEP 3: Invalida la cache di Next.js
  revalidatePath('/marketplace/chat')
  revalidatePath('/marketplace')
  revalidatePath('/')

  console.log('🗑️ [DELETE] === FINE CANCELLAZIONE ===')
  return { success: true, deletedCount }
}