import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ReferralPage({ params }: { params: Promise<{ code: string }> }) {
  // 1. Attendi i params (obbligatorio in Next.js 15)
  const { code } = await params
  const normalizedCode = code.toUpperCase()
  
  const supabase = await createClient()

    // 2. Usa la funzione sicura per cercare lo sponsor
  const { data: sponsorData, error } = await supabase
    .rpc('get_public_profile_by_referral', { p_referral_code: normalizedCode })
    .single() as { data: { referral_code: string; country_code: string; first_name: string; last_name: string } | null, error: any }

  // 3. Se il codice non esiste o c'è un errore, mostra messaggio
  if (error || !sponsorData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-gray-100 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Codice Non Valido</h1>
          <p className="text-gray-600 mb-6">
            Il codice referral "<span className="font-mono font-bold text-gray-800">{code}</span>" non esiste o non è attivo.
          </p>
          <Link 
            href="/register" 
            className="inline-block bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Torna alla registrazione
          </Link>
        </div>
      </div>
    )
  }

  // 4. Se esiste, mostra la landing page (sponsorData contiene ora i 4 campi sicuri)
  const registerUrl = `/register?sponsor=${encodeURIComponent(sponsorData.referral_code)}`

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-indigo-100">
        
        {/* Bandiera / Icona Nazione */}
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">
            {sponsorData.country_code === 'IT' ? '🇮🇹' : 
             sponsorData.country_code === 'US' ? '🇺🇸' : 
             sponsorData.country_code === 'DE' ? '🇩🇪' : '🌍'}
          </span>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Unisciti al team di {sponsorData.first_name} {sponsorData.last_name}
        </h1>
        <p className="text-gray-600 mb-8">
          Sei stato invitato a far parte del Network Marketing Program. 
          Registrati ora per entrare nella matrice e iniziare a crescere.
        </p>

        {/* Box Codice Sponsor */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-8">
          <p className="text-sm text-gray-500 mb-1">Il tuo sponsor è:</p>
          <p className="text-2xl font-mono font-bold text-indigo-600 tracking-wider">
            {sponsorData.referral_code}
          </p>
        </div>

        {/* Pulsante di azione */}
        <Link 
          href={registerUrl}
          className="w-full block bg-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
        >
          Registrati Ora
        </Link>
        
        <p className="text-xs text-gray-400 mt-6">
          Già registrato? <Link href="/dashboard" className="text-indigo-600 hover:underline font-medium">Accedi alla dashboard</Link>
        </p>
      </div>
    </div>
  )
}