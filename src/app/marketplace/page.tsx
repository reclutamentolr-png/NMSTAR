import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MarketplaceCard from '@/components/MarketplaceCard'

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
      iconName: 'Smartphone', // ✅ Stringa invece del componente
      title: 'QR Code Dinamico',
      description: 'Genera QR code personalizzati che puntano direttamente al tuo link di referral.',
      color: 'indigo',
    },
    {
      toolName: 'link-in-bio',
      href: '/marketplace/link-in-bio',
      gradient: 'bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400',
      iconName: 'Link2', // ✅ Stringa
      title: 'Link in Bio',
      description: 'Crea la tua landing page personale stile Linktree con tutti i tuoi social.',
      color: 'pink',
    },
    {
      toolName: 'nfc-smart-hub',
      href: '/marketplace/nfc-smart-hub',
      gradient: 'bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600',
      iconName: 'Wifi', // ✅ Stringa
      title: 'NFC Smart Hub',
      description: 'Trasforma il tuo tag NFC in un biglietto da visita magico. Un tap e salvano il tuo contatto!',
      color: 'cyan',
    },
    {
      toolName: 'whatsapp-messages',
      href: '/marketplace/whatsapp-messages',
      gradient: 'bg-gradient-to-br from-green-400 to-emerald-600',
      iconName: 'MessageCircle', // ✅ Stringa
      title: 'Messaggi WhatsApp',
      description: 'Template pronti per inviare il tuo link referral via WhatsApp in pochi secondi.',
      color: 'green',
    },
    {
      toolName: 'memolife',
      href: '/marketplace/memolife',
      gradient: 'bg-gradient-to-br from-purple-500 via-pink-500 to-red-500',
      iconName: 'Brain', // ✅ Stringa
      title: 'MemoLife',
      description: 'Il tuo assistente personale intelligente. Gestisci appuntamenti, task, bollette e contatti con input vocale.',
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
              iconName={tool.iconName} // ✅ Passa la stringa
              title={tool.title}
              description={tool.description}
              color={tool.color}
            />
          ))}
        </div>
      </main>
    </div>
  )
}