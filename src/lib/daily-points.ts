import { createClient } from '@/lib/supabase/server'

export async function awardDailyPoint(userId: string) {
  const supabase = await createClient()
  
  // 1. Ottieni la data di oggi in formato YYYY-MM-DD (timezone Italia)
  const today = new Date().toLocaleDateString('it-IT', { 
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).split('/').reverse().join('-') // Converte in YYYY-MM-DD
  
  // 2. Leggi il profilo attuale
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('daily_points, last_daily_login')
    .eq('id', userId)
    .single()
  
  if (error || !profile) return { success: false, message: 'Profilo non trovato' }
  
  // 3. CONTROLLO RIGIDO: se ha già timbrato oggi, niente punti
  if (profile.last_daily_login === today) {
    return { 
      success: false, 
      message: 'Hai già raccolto il punto di oggi. Torna domani!',
      alreadyClaimed: true 
    }
  }
  
  // 4. Assegna il punto e aggiorna la data
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      daily_points: (profile.daily_points || 0) + 1,
      last_daily_login: today
    })
    .eq('id', userId)
  
  if (updateError) {
    return { success: false, message: 'Errore nell\'aggiornamento' }
  }
  
  return { 
    success: true, 
    newBalance: (profile.daily_points || 0) + 1,
    message: '+1 punto! Continua così!'
  }
}

export async function getUserPoints(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('daily_points, last_daily_login')
    .eq('id', userId)
    .single()
  
  return data?.daily_points || 0
}