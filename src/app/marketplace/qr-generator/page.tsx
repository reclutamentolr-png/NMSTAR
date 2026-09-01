import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import QRGeneratorTool from '@/components/QRGeneratorTool'
import { 
  QrCode, 
  ArrowLeft, 
  Share2, 
  Download, 
  Sparkles,
  Smartphone
} from 'lucide-react'

export default async function QRGeneratorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code, first_name, last_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/dashboard')

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const referralUrl = `${baseUrl}/ref/${profile.referral_code}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link 
            href="/marketplace" 
            className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Torna al Marketplace
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">QR Code Dinamico</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Strumento Gratuito
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-3">
            Crea il tuo QR Code Virale
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Genera un QR code personalizzato che punta al tuo link di referral. 
            Chiunque lo scannerizzerà verrà diretto alla tua pagina personale.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <Smartphone className="w-8 h-8 text-indigo-600 mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Scansione Istantanea</h3>
            <p className="text-sm text-gray-600">Compatibile con tutti i smartphone moderni</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <Share2 className="w-8 h-8 text-purple-600 mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Condividi Ovunque</h3>
            <p className="text-sm text-gray-600">Stampa, condividi sui social o via email</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <Download className="w-8 h-8 text-pink-600 mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Download HD</h3>
            <p className="text-sm text-gray-600">Scarica in alta risoluzione per la stampa</p>
          </div>
        </div>

        {/* Tool */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <QRGeneratorTool 
            referralCode={profile.referral_code}
            referralUrl={referralUrl}
            userName={`${profile.first_name} ${profile.last_name}`}
          />
        </div>

        {/* Tips */}
        <div className="mt-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Consigli per massimizzare le conversioni
          </h3>
          <ul className="space-y-2 text-indigo-100 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-white font-bold">•</span>
              <span>Stampa il QR code su biglietti da visita e volantini</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white font-bold">•</span>
              <span>Condividilo sui social media con un messaggio accattivante</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white font-bold">•</span>
              <span>Inseriscilo nella firma delle tue email</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
}