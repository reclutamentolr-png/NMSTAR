import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation' // ✅ CORRETTO (con l'apice chiuso!)
import Link from '@/components/LocalizedLink' // ✅ Sostituisci 'next/link'
import MarketplaceCard from '@/components/MarketplaceCard'
import { Tag, ArrowRight, Sparkles } from 'lucide-react'

export default async function MarketplacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: toolsSettings } = await supabase
    .from('marketplace_settings')
    .select('tool_name, is_enabled')

  const toolsStatus: Record<string, boolean> = {}
  toolsSettings?.forEach((tool: any) => {
    toolsStatus[tool.tool_name] = tool.is_enabled
  })

  const isToolEnabled = (toolName: string): boolean => {
    return toolsStatus[toolName] !== false
  }

  const tools = [
    {
      toolName: 'qr-generator',
      href: '/marketplace/qr-generator',
      gradient: 'bg-gradient-to-br from-indigo-500 to-purple-600',
      iconName: 'Smartphone',
      title: 'QR Code Dinamico',
      description: 'Genera QR code personalizzati che puntano direttamente al tuo link di referral.',
      color: 'indigo',
    },
    {
      toolName: 'link-in-bio',
      href: '/marketplace/link-in-bio',
      gradient: 'bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400',
      iconName: 'Link2',
      title: 'Link in Bio',
      description: 'Crea la tua landing page personale stile Linktree con tutti i tuoi social.',
      color: 'pink',
    },
    {
      toolName: 'whatsapp-messages',
      href: '/marketplace/whatsapp-messages',
      gradient: 'bg-gradient-to-br from-green-400 to-emerald-600',
      iconName: 'MessageCircle',
      title: 'Messaggi WhatsApp',
      description: 'Template pronti per inviare il tuo link referral via WhatsApp in pochi secondi.',
      color: 'green',
    },
    {
      toolName: 'memolife',
      href: '/marketplace/memolife',
      gradient: 'bg-gradient-to-br from-purple-500 via-pink-500 to-red-500',
      iconName: 'Brain',
      title: 'MemoLife',
      description: 'Organizza la tua vita quotidiana. Gestisci appuntamenti, task, bollette, contatti e note in modo semplice e veloce.',
      color: 'purple',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-gray-900 hover:text-indigo-600 transition-colors">
            ← Torna alla Dashboard
          </Link>
          <h1 className="text-xl font-semibold text-gray-800">Marketplace Servizi Digitali</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Strumenti per far crescere la tua rete</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Utilizza i nostri strumenti gratuiti per promuovere il tuo codice referral.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tools.map((tool) => (
            <MarketplaceCard
              key={tool.toolName}
              toolName={tool.toolName}
              isEnabled={isToolEnabled(tool.toolName)}
              href={tool.href}
              gradient={tool.gradient}
              iconName={tool.iconName}
              title={tool.title}
              description={tool.description}
              color={tool.color}
            />
          ))}
          {/* CARD: BACHECA ANNUNCI - Separata dagli altri tools */}
<Link 
  href="/marketplace/listings"
  className="group bg-white p-6 rounded-xl border-2 border-yellow-200 shadow-sm hover:shadow-xl hover:border-yellow-400 transition-all duration-300 hover:scale-105 relative overflow-hidden"
>
  <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-100 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-yellow-200 transition-colors"></div>
  <div className="absolute bottom-0 left-0 w-16 h-16 bg-orange-100 rounded-full translate-y-1/2 -translate-x-1/2 group-hover:bg-orange-200 transition-colors"></div>
  
  <div className="relative z-10">
    <div className="flex items-center justify-between mb-3">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-md">
        <Tag className="w-6 h-6 text-white" />
      </div>
      <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2.5 py-1 rounded-full border border-yellow-200 flex items-center gap-1">
        <Sparkles className="w-3 h-3" /> 10 Punti
      </span>
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-1">Bacheca Annunci</h3>
    <p className="text-gray-600 text-sm mb-4">
      Pubblica i tuoi servizi, prodotti o cerca collaborazioni nella community. Accumula punti con gli accessi giornalieri!
    </p>
    <div className="flex items-center text-yellow-700 font-semibold text-sm group-hover:translate-x-1 transition-transform">
      Vai alla Bacheca
      <ArrowRight className="w-4 h-4 ml-1" />
    </div>
  </div>
</Link>

        </div>
      </main>
    </div>
  )
}