'use server'

import { createClient } from '@/lib/supabase/server'

export async function getMaintenanceGate() {
  console.log('🔵 [MAINTENANCE GATE] === Inizio controllo ===')
  
  try {
    const supabase = await createClient()

    // Leggi le impostazioni dal database
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['maintenance_mode', 'maintenance_message'])

    if (error) {
      console.error('❌ [MAINTENANCE GATE] Errore query:', error)
      return { enabled: false, message: '' }
    }

    console.log('🔵 [MAINTENANCE GATE] Righe trovate nel DB:', data?.length || 0)
    console.log('🔵 [MAINTENANCE GATE] Dati grezzi:', JSON.stringify(data, null, 2))

    let enabled = false
    let message = 'Sito in manutenzione. Torna presto!'

    data?.forEach((s: any) => {
      console.log(`🔵 [MAINTENANCE GATE] Processing key="${s.key}", value="${s.value}" (tipo: ${typeof s.value})`)
      
      try {
        const parsed = JSON.parse(s.value)
        console.log(`🔵 [MAINTENANCE GATE] Parsed value for "${s.key}":`, parsed, `(tipo: ${typeof parsed})`)
        
        if (s.key === 'maintenance_mode') {
          enabled = parsed === true
          console.log(`🔵 [MAINTENANCE GATE] maintenance_mode = ${enabled}`)
        }
        if (s.key === 'maintenance_message' && parsed) {
          message = parsed
          console.log(`🔵 [MAINTENANCE GATE] maintenance_message = "${message}"`)
        }
      } catch (parseError) {
        console.log(`⚠️ [MAINTENANCE GATE] JSON parse fallito per "${s.key}", uso fallback`)
        if (s.key === 'maintenance_mode') {
          enabled = s.value === 'true' || s.value === true
          console.log(`🔵 [MAINTENANCE GATE] maintenance_mode (fallback) = ${enabled}`)
        }
        if (s.key === 'maintenance_message' && s.value) {
          message = s.value
        }
      }
    })

    console.log('🔵 [MAINTENANCE GATE] Dopo parsing - enabled:', enabled, '| message:', message)

    // ✅ BYPASS ADMIN
    if (enabled) {
      console.log('🔵 [MAINTENANCE GATE] Manutenzione ATTIVA, controllo se l\'utente è admin...')
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.log('🔵 [MAINTENANCE GATE] Nessun utente loggato → BLOCCA')
        return { enabled: true, message }
      }
      
      console.log('🔵 [MAINTENANCE GATE] Utente loggato:', user.id, user.email)

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      console.log('🔵 [MAINTENANCE GATE] profiles.is_admin:', profile?.is_admin)

      const { data: adminRecord } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .single()

      console.log('🔵 [MAINTENANCE GATE] admin_users record:', adminRecord ? 'ESISTE' : 'NON ESISTE')

      if (profile?.is_admin || adminRecord) {
        console.log('✅ [MAINTENANCE GATE] Utente è ADMIN → BYPASS attivo')
        return { enabled: false, message }
      }
      
      console.log('🔵 [MAINTENANCE GATE] Utente NON è admin → BLOCCA')
    } else {
      console.log('🔵 [MAINTENANCE GATE] Manutenzione DISATTIVA → sito normale')
    }

    console.log('🔵 [MAINTENANCE GATE] === Fine controllo. Risultato:', { enabled, message }, '===')
    return { enabled, message }
  } catch (error) {
    console.error('❌ [MAINTENANCE GATE] Errore generale:', error)
    return { enabled: false, message: '' }
  }
}