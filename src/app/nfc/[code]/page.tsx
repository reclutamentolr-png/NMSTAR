import { createClient } from '@/lib/supabase/server'
import NfcMagicButtons from '@/components/NfcMagicButtons'
import Link from 'next/link'

export default async function NfcPublicPage({ params }: { params: Promise<{ code: string }> }) {
  // Next.js 15: params è una Promise
  const resolvedParams = await params
  const code = resolvedParams.code
  
  console.log("🔍 NFC Public Page caricata con codice:", code) // DEBUG
  
  const supabase = await createClient()

  // 1. Trova il profilo
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, referral_code, email')
    .eq('referral_code', code)
    .single()

  if (error || !profile) {
    console.error("🚨 ERRORE SUPABASE O PROFILO NON TROVATO:", error?.message)
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profilo non trovato</h1>
          <p className="text-gray-600 mb-4">
            Il codice <strong className="text-red-600 font-mono bg-red-50 px-2 py-1 rounded">{code || 'VUOTO'}</strong> non è associato a nessun utente.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Assicurati che l'utente abbia un <code>referral_code</code> valido nel database e che le Policy RLS permettano la lettura pubblica.
          </p>
          <Link 
            href="/marketplace" 
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
          >
            ← Torna al Marketplace
          </Link>
        </div>
      </div>
    )
  }

  // 2. Trova la bio (opzionale)
  const { data: linkInBio } = await supabase
    .from('link_in_bio')
    .select('bio_text')
    .eq('user_id', profile.id)
    .single()

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const referralUrl = `${baseUrl}/ref/${code}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl animate-in fade-in zoom-in duration-500">
        
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-white text-indigo-600 flex items-center justify-center text-4xl font-bold shadow-lg mb-4 border-4 border-white/30">
            {(profile.first_name || 'U').charAt(0).toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {profile.first_name} {profile.last_name}
          </h1>
          {linkInBio?.bio_text ? (
            <p className="text-white/80 text-sm mb-6">{linkInBio.bio_text}</p>
          ) : (
            <p className="text-white/60 text-sm mb-6">Network Marketing Professional</p>
          )}
        </div>

        {/* Componente che gestisce i pulsanti (Salva Contatto, ecc.) */}
        <NfcMagicButtons profile={profile} referralUrl={referralUrl} />

        <div className="mt-8 text-center">
          <p className="text-xs text-white/40">
            Powered by Network Marketing Program
          </p>
        </div>
      </div>
    </div>
  )
}