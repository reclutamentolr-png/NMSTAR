// src/app/actions/listings.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { LISTING_COST, type CreateListingData } from '@/lib/listings'

// ✅ Service client per bypassare RLS
const getServiceClient = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

export async function createListingAction(data: CreateListingData) {
  const supabase = await createClient()

  // The acting user is always the authenticated session, never data.userId
  // (that field arrives from the client and can't be trusted for
  // authorization — using it directly here would let anyone drain another
  // user's points by passing their id).
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Devi effettuare l\'accesso' }

  // 1+2. Spende atomicamente da daily_points (mai network_points, che è
  // riservato a voucher/premi) — stesso guard "nella WHERE dell'UPDATE"
  // usato da create_subscription_voucher, evita la race condition del
  // vecchio pattern read-then-write.
  const { data: spendResult, error: spendError } = await supabase
    .rpc('spend_daily_points', { p_amount: LISTING_COST })
    .single<{ success: boolean; new_daily_points: number }>()

  if (spendError || !spendResult) {
    return { success: false, message: 'Errore nell\'aggiornamento punti' }
  }
  if (!spendResult.success) {
    return { success: false, message: `Ti servono almeno ${LISTING_COST} punti per pubblicare un annuncio` }
  }

  // 3. Crea l'annuncio
  const { data: listing, error } = await supabase
    .from('listings')
    .insert({
      user_id: user.id,
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
    await supabase.rpc('refund_points', { p_amount: LISTING_COST })
    return { success: false, message: 'Errore nella creazione dell\'annuncio' }
  }

  return { success: true, listing, newPoints: spendResult.new_daily_points }
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

// ✅ CANCELLAZIONE CONVERSAZIONE - FIX TS: filtri applicati PRIMA di eseguire la query
export async function deleteConversationAction(
  currentUserId: string, 
  otherUserId: string, 
  listingId?: string
) {
  console.log('🗑️ [DELETE] === INIZIO CANCELLAZIONE CONVERSAZIONE ===')

  const supabase = await createClient()

  // STEP 1: Verifica chi ha iniziato la conversazione
  // ✅ Costruisco la query SENZA .single(), applico il filtro opzionale, poi eseguo
  let firstMessageQuery: any = supabase
    .from('messages')
    .select('sender_id')
    .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
    .order('created_at', { ascending: true })
    .limit(1)

  if (listingId) {
    firstMessageQuery = firstMessageQuery.eq('listing_id', listingId)
  }

  const { data: firstMessages, error: firstMsgError } = await firstMessageQuery
  const firstMessage = firstMessages?.[0]

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

  // STEP 2: Cancellazione con SERVICE CLIENT (bypass RLS)
  const supabaseAdmin = getServiceClient()

  let deleteQuery: any = supabaseAdmin
    .from('messages')
    .delete()
    .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
    .select('id')

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

  // STEP 3: Invalida la cache di Next.js
  revalidatePath('/marketplace/chat')
  revalidatePath('/marketplace')

  console.log('🗑️ [DELETE] === FINE CANCELLAZIONE ===')
  return { success: true, deletedCount }
}