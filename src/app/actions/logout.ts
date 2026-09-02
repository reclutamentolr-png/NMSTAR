'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers' // ✅ Importiamo i cookie per leggere la lingua

export async function logout() {
  const supabase = await createClient()
  
  // 1. Effettua il logout da Supabase
  await supabase.auth.signOut()
  
  // 2. Leggi il cookie della lingua impostato automaticamente da next-intl
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'it' // Fallback a 'it' se non trovato
  
  // 3. Reindirizza alla home page nella lingua corretta (es. '/it', '/fr', '/en')
  redirect(`/${locale}`)
}