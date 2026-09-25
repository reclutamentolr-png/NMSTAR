import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'

// Creato alla richiesta e non al caricamento del modulo: così `next build`
// non fallisce se le variabili d'ambiente non sono disponibili in build.
const getSupabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('❌ Errore verifica webhook (firma sbagliata?):', err.message)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.userId

    // Calculate subscription expiry: 1 year from activation (annual plan,
    // 49€/anno). This is an immediate estimate shown right after checkout;
    // it self-corrects to Stripe's real current_period_end once the
    // customer.subscription.updated event arrives below.
    const now = new Date()
    const expiresAt = new Date(now.setFullYear(now.getFullYear() + 1))

    if (userId) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_status: 'active',
          subscription_expires_at: expiresAt.toISOString(),
          subscription_source: 'stripe',
        })
        .eq('id', userId)
        .select()
      
      if (error) {
        console.error('❌ Errore Supabase:', error.message)
      } else if (!data || data.length === 0) {
        console.error('⚠️ NESSUNA RIGA AGGIORNATA! UserId non trovato.')
      }
    }
  }

  // Handle subscription deletion/cancellation
  if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as any
    const userId = subscription.metadata?.userId
    if (userId) {
      const newStatus = subscription.status === 'active' ? 'active' : 'inactive'

      const updateData: Record<string, any> = {
        subscription_status: newStatus,
        subscription_source: newStatus === 'active' ? 'stripe' : null,
      }

      // Calculate next billing date
      if (subscription.current_period_end) {
        updateData.subscription_expires_at = new Date(subscription.current_period_end * 1000).toISOString()
      }

      const { error } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', userId)

      if (error) {
        console.error('❌ Errore aggiornamento subscription:', error.message)
      }
    }
  }

  return NextResponse.json({ received: true })
}