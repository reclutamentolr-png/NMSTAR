'use server'

import { createClient } from '@/lib/supabase/server'

export async function awardDailyPoint(userId: string) {
  const supabase = await createClient()
  
  // 1. Ottieni la data di oggi in formato YYYY-MM-DD (Timezone Italia per evitare fusi orari)
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })
  
  // 2. Leggi lo stato attuale del profilo
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('daily_points, last_daily_login')
    .eq('id', userId)
    .single()
  
  if (error || !profile) {
    return { success: false, message: 'Profilo non trovato' }
  }
  
  // 3. CONTROLLO RIGIDO: Se ha già fatto login oggi, non fare nulla
  if (profile.last_daily_login === today) {
    return { 
      success: false, 
      alreadyClaimed: true,
      message: 'Punto giornaliero già raccolto oggi.' 
    }
  }
  
  // 4. Assegna il punto e aggiorna la data
  const newPoints = (profile.daily_points || 0) + 1
  
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      daily_points: newPoints,
      last_daily_login: today
    })
    .eq('id', userId)
  
  if (updateError) {
    return { success: false, message: 'Errore nel salvataggio del punto' }
  }
  
  return { 
    success: true, 
    newPoints,
    message: 'Punto giornaliero assegnato con successo!' 
  }
}