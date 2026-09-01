import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as any,
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  // QUESTO LOG DEVE APPARIRE PER FORZA SE LA RICHIESTA ARRIVA
  console.log('🚨🚨🚨 WEBHOOK POST CHIAMATO 🚨🚨🚨')
  console.log('URL richiesta:', req.url)
  
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  console.log('📏 Lunghezza body:', body.length)
  console.log('🔑 Firma presente:', !!sig)

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!)
    console.log('✅ Evento verificato:', event.type)
  } catch (err: any) {
    console.error('❌ Errore verifica webhook (firma sbagliata?):', err.message)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    console.log('💳 checkout.session.completed rilevato!')
    console.log('📦 Metadata:', JSON.stringify(session.metadata))
    
    const userId = session.metadata?.userId
    console.log('👤 userId estratto:', userId)

    if (userId) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({ subscription_status: 'active' })
        .eq('id', userId)
        .select()
      
      if (error) {
        console.error('❌ Errore Supabase:', error.message)
      } else {
        if (data && data.length > 0) {
          console.log('✅ SUCCESSO! Righe aggiornate:', data.length)
        } else {
          console.error('⚠️ NESSUNA RIGA AGGIORNATA! UserId non trovato.')
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}