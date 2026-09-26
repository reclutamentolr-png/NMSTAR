import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

export async function POST(request: Request) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/register', base))
    }

    // Piano scelto: Base (49 €/anno, default) o Pro (149 €/anno, ?plan=pro).
    const plan = new URL(request.url).searchParams.get('plan') === 'pro' ? 'pro' : 'base'
    const priceId = plan === 'pro' ? process.env.STRIPE_PRICE_ID_PRO : process.env.STRIPE_PRICE_ID
    if (!priceId) {
      return NextResponse.redirect(new URL(plan === 'pro' ? '/pro?error=unavailable' : '/billing?error=true', base), 303)
    }

    // Chi paga già con carta non apre un secondo abbonamento: passa a Pro
    // dalla pagina Pro (Stripe calcola la differenza sull'abbonamento attuale).
    const { data: current } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_source, subscription_expires_at')
      .eq('id', user.id)
      .maybeSingle()
    const hasStripeSubscription =
      current?.subscription_status === 'active' &&
      current?.subscription_source === 'stripe' &&
      (!current?.subscription_expires_at || new Date(current.subscription_expires_at) > new Date())
    if (hasStripeSubscription) {
      return NextResponse.redirect(new URL(plan === 'pro' ? '/pro' : '/billing', base), 303)
    }

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        plan,
      },
      // Propaga lo stesso userId anche sull'oggetto Subscription (non solo
      // sulla Checkout Session): senza questo, gli eventi successivi
      // customer.subscription.updated/deleted nel webhook non riescono a
      // risalire all'utente e non aggiornano lo stato dell'abbonamento.
      subscription_data: {
        metadata: {
          userId: user.id,
          plan,
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