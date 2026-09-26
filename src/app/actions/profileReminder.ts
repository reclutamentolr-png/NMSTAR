'use server'

import { createClient } from '@/lib/supabase/server'

// Dati per il promemoria "completa il profilo": solo se l'utente è
// collegato e ha ancora la data di nascita provvisoria (profilo incompleto).
export async function getIncompleteProfile(): Promise<
  { status: 'anonymous' } | { status: 'complete' } | { status: 'incomplete'; profile: Record<string, unknown> }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { status: 'anonymous' }
  const { data: profile } = await supabase.rpc('get_my_profile').maybeSingle<Record<string, unknown>>()
  if (!profile || profile.date_of_birth !== '2000-01-01') return { status: 'complete' }
  const { id, first_name, last_name, phone, country_code, date_of_birth, occupation, address, city, province } = profile
  return { status: 'incomplete', profile: { id, first_name, last_name, phone, country_code, date_of_birth, occupation, address, city, province } }
}
