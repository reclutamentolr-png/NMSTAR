import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as any, // ✅ FIX: 'as any' previene errori di versione API
})

export async function POST() {
  console.log('🔍 DEBUG CHECKOUT INIZIATO')
  console.log('STRIPE_PRICE_ID:', process.env.STRIPE_PRICE_ID)
  console.log('STRIPE_SECRET_KEY presente:', !!process.env.STRIPE_SECRET_KEY)
  
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.redirect(new URL('/register', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'))
    }

    console.log('👤 Utente loggato:', user.id)
    console.log('📦 Creazione sessione con PRICE_ID:', process.env.STRIPE_PRICE_ID)

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
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/billing?canceled=true`,
      customer_email: user.email,
    })

    console.log('✅ Sessione creata con successo:', session.id)
    
    // ✅ FIX: Controllo esplicito per evitare l'errore "string | null" di TypeScript
    if (!session.url) {
      throw new Error('Impossibile ottenere l\'URL di reindirizzamento da Stripe')
    }
    
    return NextResponse.redirect(session.url, 303)
    
  } catch (error: any) {
    console.error('❌ Errore Stripe Checkout:', error)
    return NextResponse.redirect(new URL('/billing?error=true', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'))
  }
}