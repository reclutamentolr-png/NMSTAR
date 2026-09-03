// src/lib/listings-server.ts
import { createClient } from '@/lib/supabase/server'
import type { ListingCategory } from '@/lib/listings'

export async function getActiveListings(options?: { 
  category?: ListingCategory
  limit?: number
  excludeUserId?: string
}) {
  const supabase = await createClient()
  
  let query = supabase
    .from('listings')
    .select(`
      *,
      profiles:user_id (first_name, last_name, referral_code, username)
    `)
    .eq('is_active', true)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  
  if (options?.category) query = query.eq('category', options.category)
  if (options?.limit) query = query.limit(options.limit)
  if (options?.excludeUserId) query = query.neq('user_id', options.excludeUserId)
  
  const { data, error } = await query
  return error ? [] : (data || [])
}

export async function getUserListings(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('listings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  return data || []
}
export async function getUnreadMessagesCount(userId: string) {
  const supabase = await createClient()
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('is_read', false)
  
  return count || 0
}

export async function getUserConversations(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('messages')
    .select(`
      id, sender_id, receiver_id, listing_id, content, created_at, is_read,
      sender:sender_id (first_name, last_name),
      listing:listing_id (title)
    `)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false })
  
  // Raggruppa i messaggi per conversazione (per annuncio o per utente)
  const conversationsMap = new Map()
  
  data?.forEach((msg: any) => {
    const isUserSender = msg.sender_id === userId
    const otherUserId = isUserSender ? msg.receiver_id : msg.sender_id
    const otherUserName = isUserSender 
      ? 'Destinatario' 
      : `${msg.sender?.first_name || ''} ${msg.sender?.last_name || ''}`.trim() || 'Utente'
    
    // La chiave è l'ID dell'annuncio (se esiste) o l'ID dell'altro utente
    const key = msg.listing_id || `user_${otherUserId}`
    
    if (!conversationsMap.has(key)) {
      conversationsMap.set(key, {
        key,
        listingId: msg.listing_id,
        listingTitle: msg.listing?.title || 'Messaggio diretto',
        otherUserId,
        otherUserName,
        lastMessage: msg.content,
        createdAt: msg.created_at,
        unreadCount: (!isUserSender && !msg.is_read) ? 1 : 0
      })
    } else {
      const conv = conversationsMap.get(key)
      if (!isUserSender && !msg.is_read) {
        conv.unreadCount += 1
      }
    }
  })
  
  // Ordina per data dell'ultimo messaggio
  return Array.from(conversationsMap.values()).sort((a: any, b: any) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}