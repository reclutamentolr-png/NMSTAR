import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  Link2, 
  ArrowLeft, 
  Globe, 
  Camera, 
  AtSign,
  Share2,
  Sparkles,
  Palette,
  ExternalLink,
  AlertTriangle
} from 'lucide-react'
import LinkInBioEditor from '@/components/LinkInBioEditor'
import CopyLinkButton from '@/components/CopyLinkButton'

export default async function LinkInBioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, referral_code, first_name, last_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/dashboard')

  // ✅ FIX PROBLEMA 1: Se non ha un referral code, mostriamo un avviso invece di un link rotto
  if (!profile.referral_code) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link href="/marketplace" className="flex items-center gap-2 text-gray-600 hover:text-pink-600 font-medium">
              <ArrowLeft className="w-5 h-5" /> Torna al Marketplace
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 max-w-md text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Codice Referral Mancante</h2>
            <p className="text-gray-600 mb-6">
              Per creare la tua pagina Link in Bio, devi prima avere un codice referral attivo. 
              Completa il tuo profilo nella Dashboard per generarne uno.
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
  const bioUrl = `${baseUrl}/ref/${profile.referral_code}/bio`

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link 
            href="/marketplace" 
            className="flex items-center gap-2 text-gray-600 hover:text-pink-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Torna al Marketplace
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-pink-500 to-orange-400 p-2 rounded-lg">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">Link in Bio</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-pink-100 text-pink-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            La tua landing page personale
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-3">
            Crea e gestisci la tua pagina
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Personalizza la tua bio, aggiungi i tuoi link e condividi questa pagina sui tuoi social.
          </p>
        </div>

        {/* ✅ FIX PROBLEMA 2: L'EDITOR REALE */}
        <LinkInBioEditor userId={user.id} />

        {/* URL della Bio con pulsante copia */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Il tuo Link in Bio (condividilo ovunque)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              readOnly
              value={bioUrl}
              className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-sm font-mono text-gray-700 focus:outline-none"
            />
            <CopyLinkButton url={bioUrl} />
          </div>
        </div>

        {/* Preview Mockup (Aggiornato con i dati reali se possibile, o placeholder) */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5 text-pink-600" />
            Anteprima di come apparirà
          </h3>
          <div className="max-w-sm mx-auto">
            <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 rounded-2xl p-6 text-white text-center">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-3 text-3xl font-bold border-2 border-white/30">
                {profile.first_name?.charAt(0) || 'U'}
              </div>
              <h3 className="text-xl font-bold mb-1">{profile.first_name} {profile.last_name}</h3>
              <p className="text-white/80 text-sm mb-4">Network Marketing Professional</p>
              
              <div className="space-y-2">
                <div className="block bg-white/20 backdrop-blur rounded-lg py-3 px-4 text-sm font-medium">
                  🚀 Unisciti al mio team
                </div>
                <div className="flex justify-center gap-3 mt-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <AtSign className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-10 text-center">
          <a
            href={bioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-700 hover:to-orange-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <ExternalLink className="w-5 h-5" />
            Visita la tua Link in Bio
          </a>
          <p className="text-sm text-gray-500 mt-3">
            Assicurati di aver cliccato "Salva Pagina" prima di condividere il link!
          </p>
        </div>
      </main>
    </div>
  )
}