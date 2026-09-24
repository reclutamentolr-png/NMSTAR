import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as any, // ✅ FIX: 'as any' previene errori di versione API
})

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/register', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'))
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
      },
      // Propaga lo stesso userId anche sull'oggetto Subscription (non solo
      // sulla Checkout Session): senza questo, gli eventi successivi
      // customer.subscription.updated/deleted nel webhook non riescono a
      // risalire all'utente e non aggiornano lo stato dell'abbonamento.
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
      // session_id nell'URL permette a /billing di verificare e attivare
      // l'abbonamento anche se il webhook non arriva (es. in locale senza
      // `stripe listen` in ascolto).
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/billing?canceled=true`,
      customer_email: user.email,
    })

    // Controllo esplicito per evitare l'errore "string | null" di TypeScript
    if (!session.url) {
      throw new Error('Impossibile ottenere l\'URL di reindirizzamento da Stripe')
    }
    
    return NextResponse.redirect(session.url, 303)
    
  } catch (error: any) {
    console.error('❌ Errore Stripe Checkout:', error)
    return NextResponse.redirect(new URL('/billing?error=true', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'))
  }
}