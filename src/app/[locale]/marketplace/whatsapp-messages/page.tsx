import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from '@/components/LocalizedLink'
import { 
  MessageCircle, 
  ArrowLeft, 
  Sparkles,
  Users,
  TrendingUp,
  Send
} from 'lucide-react'
import WhatsAppTemplates from '@/components/WhatsAppTemplates'

// ✅ Aggiunto params per ottenere la lingua corrente
export default async function WhatsAppPage({ params }: { params: Promise<{ locale: string }> }) {
  // ✅ Ottieni la lingua dall'URL (es. 'it', 'en', 'fr')
  const { locale } = await params
  
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
  
  // ✅ URL CORRETTO: include la lingua dinamica (es. /it/ref/CODICE)
  const referralUrl = `${baseUrl}/${locale}/ref/${profile.referral_code}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link 
            href="/marketplace" 
            className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Torna al Marketplace
          </Link>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-green-400 to-emerald-600 p-2 rounded-lg">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">Messaggi WhatsApp</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Template pronti all'uso
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-3">
            Invia il tuo link in pochi secondi
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Scegli un template, personalizzalo e invialo. Il tuo link referral è già incluso.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <Users className="w-8 h-8 text-green-600 mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">4 Template</h3>
            <p className="text-sm text-gray-600">Per ogni situazione</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <Send className="w-8 h-8 text-emerald-600 mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Invio Rapido</h3>
            <p className="text-sm text-gray-600">Copia e incolla in WhatsApp</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <TrendingUp className="w-8 h-8 text-teal-600 mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Link Integrato</h3>
            <p className="text-sm text-gray-600">Referral già incluso</p>
          </div>
        </div>

        {/* Templates Component */}
        <WhatsAppTemplates referralUrl={referralUrl} />

        {/* Tips */}
        <div className="mt-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Consigli per messaggi efficaci
          </h3>
          <ul className="space-y-2 text-green-50 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-white font-bold">•</span>
              <span>Personalizza sempre il messaggio con il nome del destinatario</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white font-bold">•</span>
              <span>Non inviare lo stesso messaggio a troppe persone contemporaneamente</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white font-bold">•</span>
              <span>Segui sempre con una chiamata o un messaggio vocale</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
}