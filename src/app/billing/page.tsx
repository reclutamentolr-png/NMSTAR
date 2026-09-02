import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next-intl/client'
import Link from 'next/link' // ✅ Corretto

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, email')
    .eq('id', user.id)
    .single()

  const isActive = profile?.subscription_status === 'active'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
        
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
          <span className="text-4xl">{isActive ? '✅' : '💳'}</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isActive ? 'Abbonamento Attivo' : 'Completa il tuo Abbonamento'}
        </h1>
        
        <p className="text-gray-600 mb-8">
          {isActive 
            ? `Grazie! Il tuo piano Base è attivo. Hai accesso a tutti i servizi del Marketplace.`
            : `Attiva il tuo piano a soli 1€/mese per sbloccare QR Code illimitati, statistiche avanzate e molto altro.`
          }
        </p>

        {!isActive && (
          <form action="/api/checkout" method="POST">
            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
            >
              Abbonati ora per 1€/mese
            </button>
          </form>
        )}

        {isActive && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
            <p>Stato: <strong>Attivo</strong></p>
            <p className="text-xs mt-1">Email fatturazione: {profile?.email}</p>
          </div>
        )}

        <Link href="/dashboard" className="mt-6 inline-block text-sm text-indigo-600 hover:underline font-medium">
          ← Torna alla Dashboard
        </Link>
      </div>
    </div>
  )
}