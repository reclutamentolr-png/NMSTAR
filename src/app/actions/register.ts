'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation' // ✅ CORRETTO (con l'apice chiuso!)

export async function registerUser(formData: FormData) {
  const supabase = await createClient()

  // 1. Estrai i dati semplificati
  const sponsor_referral = (formData.get('sponsor_referral') as string)?.trim().toUpperCase()
  const first_name = formData.get('first_name') as string
  const last_name = formData.get('last_name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const country_code = formData.get('country_code') as string
  const username = formData.get('username') as string
  const privacy_accepted = formData.get('privacy_accepted')

  // 2. VALIDAZIONE: Il codice sponsor è ORA OBBLIGATORIO
  if (!sponsor_referral || sponsor_referral.length < 5) {
    return { error: "Il Codice Referral dello Sponsor è obbligatorio per registrarsi." }
  }

  if (!privacy_accepted) {
    return { error: "Devi accettare i Termini e Condizioni e l'Informativa Privacy." }
  }

  // 3. Crea l'utente in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        first_name,
        last_name,
        country_code,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`,
    },
  })

  if (authError) {
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'Registrazione fallita: utente non creato.' }
  }

  // 4. Chiama la funzione RPC per creare il profilo e il nodo nella matrice
  // Passiamo stringhe vuote per i campi che verranno compilati dopo nel profilo
  const { error: rpcError } = await supabase.rpc('register_user_with_matrix', {
    p_user_id: authData.user.id,
    p_email: email,
    p_username: username,
    p_first_name: first_name,
    p_last_name: last_name,
    p_dob: '2000-01-01', // Valore placeholder, l'utente lo aggiornerà nel profilo
    p_gender: 'O',       // Valore placeholder
    p_country: country_code,
    p_city: '',
    p_address: '',
    p_postal_code: '',
    p_sponsor_referral: sponsor_referral, // ORA OBBLIGATORIO
  })

  if (rpcError) {
    console.error('Errore RPC Matrice:', rpcError)
    // Se lo sponsor non esiste, la RPC fallirà. Gestiamo l'errore in modo chiaro.
    if (rpcError.message.includes('sponsor')) {
      return { error: "Il Codice Referral dello Sponsor non è valido o non esiste." }
    }
    return { error: `Errore nella creazione della matrice: ${rpcError.message}` }
  }

  // 5. Successo!
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}