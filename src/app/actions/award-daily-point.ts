'use server'

import { createClient } from '@/lib/supabase/server'

// Punto giornaliero di accesso (+1, al massimo uno al giorno, ora di Roma).
// La logica vive in award_daily_login_point() (SECURITY DEFINER, atomica):
// dal profilo dell'utente daily_points non è più scrivibile direttamente.
export async function awardDailyPoint() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('award_daily_login_point')
    .maybeSingle<{ awarded: boolean; new_daily_points: number }>()

  if (error || !data) {
    return { success: false, message: 'Errore nel salvataggio del punto' }
  }
  if (!data.awarded) {
    return { success: false, alreadyClaimed: true, message: 'Punto giornaliero già raccolto oggi.' }
  }
  return { success: true, newPoints: data.new_daily_points, message: 'Punto giornaliero assegnato con successo!' }
}
