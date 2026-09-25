import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation' // ✅ CORRETTO per i Server Component
import Link from 'next/link' // ✅ Corretto
import { getStripe } from '@/lib/stripe'

type BillingPageProps = {
  searchParams: Promise<{ success?: string; session_id?: string; canceled?: string; error?: string }>
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { success, session_id } = await searchParams

  let { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, email')
    .eq('id', user.id)
    .single()

  // Fallback: l'attivazione "normale" avviene tramite il webhook Stripe
  // (checkout.session.completed), ma quel webhook non può raggiungere
  // localhost senza `stripe listen` in ascolto, e in produzione può comunque
  // arrivare in ritardo. Se Stripe ci ha appena rimandati qui con successo e
  // il profilo non risulta ancora attivo, verifichiamo la sessione
  // direttamente con l'API di Stripe e attiviamo subito — evitando che
  // l'utente resti bloccato su "Completa il tuo abbonamento" nonostante il
  // pagamento sia andato a buon fine.
  if (success === 'true' && session_id && profile?.subscription_status !== 'active') {
    try {
      const session = await getStripe().checkout.sessions.retrieve(session_id)
      const isPaidForThisUser = session.payment_status === 'paid' && session.metadata?.userId === user.id

      if (isPaidForThisUser) {
        const supabaseAdmin = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const expiresAt = new Date()
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)

        const { data: updated, error } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: 'active',
            subscription_expires_at: expiresAt.toISOString(),
            subscription_source: 'stripe',
          })
          .eq('id', user.id)
          .select('subscription_status, email')
          .single()

        if (error) {
          console.error('❌ Errore attivazione abbonamento (fallback /billing):', error.message)
        } else if (updated) {
          profile = updated
        }
      }
    } catch (err: any) {
      console.error('❌ Errore verifica sessione Stripe su /billing:', err.message)
    }
  }

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
            : `Attiva il tuo piano a soli 49€/anno per sbloccare QR Code illimitati, statistiche avanzate e molto altro.`
          }
        </p>

        {!isActive && (
          <form action="/api/checkout" method="POST">
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
            >
              Abbonati ora per 49€/anno
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
