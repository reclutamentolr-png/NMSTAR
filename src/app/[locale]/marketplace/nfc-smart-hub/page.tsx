import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next-intl/client
import Link from 'next-intl/link'
import { 
  Wifi, 
  ArrowLeft, 
  Smartphone, 
  Download, 
  Share2,
  Sparkles,
  Zap,
  Contact,
  AlertTriangle
} from 'lucide-react'

export default async function NFCPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code, first_name, last_name, email')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/dashboard')

  // ✅ CONTROLLO CRUCIALE: Se non ha un referral code, non possiamo generare il link NFC
  if (!profile.referral_code) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/marketplace" className="flex items-center gap-2 text-gray-600 hover:text-cyan-600 font-medium">
              <ArrowLeft className="w-5 h-5" /> Torna al Marketplace
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 max-w-md text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Codice Referral Mancante</h2>
            <p className="text-gray-600 mb-6">
              Per utilizzare l'NFC Smart Hub, devi prima avere un codice referral attivo. 
              Completa il tuo profilo nella Dashboard.
            </p>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition-colors"
            >
              Vai alla Dashboard
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const nfcUrl = `${baseUrl}/nfc/${profile.referral_code}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/marketplace" className="flex items-center gap-2 text-gray-600 hover:text-cyan-600 transition-colors font-medium">
            <ArrowLeft className="w-5 h-5" /> Torna al Marketplace
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-lg">
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">NFC Smart Hub</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-cyan-100 text-cyan-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" /> Biglietto da visita digitale
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-3">Un tap e condividi il tuo contatto</h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Trasforma il tuo tag NFC in un biglietto da visita magico. Avvicina il telefono e salva automaticamente il tuo contatto.
          </p>
        </div>

        {/* NFC Preview Card */}
        <div className="bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 rounded-3xl p-8 text-white mb-8 shadow-xl">
          <div className="max-w-sm mx-auto text-center">
            <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4 border-4 border-white/30">
              <Wifi className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-1">{profile.first_name} {profile.last_name}</h3>
            <p className="text-white/80 text-sm mb-6">Tocca il telefono per salvare il contatto</p>
            
            <a 
              href={nfcUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-cyan-700 px-6 py-3 rounded-full font-bold hover:bg-white/90 transition shadow-lg"
            >
              <Download className="w-5 h-5" />
              Apri la tua pagina NFC
            </a>
            <p className="text-xs text-white/60 mt-3 font-mono break-all">{nfcUrl}</p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <Zap className="w-8 h-8 text-cyan-600 mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Condivisione Istantanea</h3>
            <p className="text-sm text-gray-600">Basta un tap per salvare il contatto</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <Contact className="w-8 h-8 text-blue-600 mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">vCard Automatica</h3>
            <p className="text-sm text-gray-600">Scarica il contatto con un click</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <Share2 className="w-8 h-8 text-indigo-600 mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Link Referral Integrato</h3>
            <p className="text-sm text-gray-600">Ogni contatto riceve il tuo codice</p>
          </div>
        </div>
      </main>
    </div>
  )
}