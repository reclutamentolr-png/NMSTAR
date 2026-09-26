'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

const getServiceClient = () =>
  createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

// Passaggio da Base a Pro per chi paga già con carta: si cambia il prezzo
// dell'abbonamento Stripe esistente e Stripe addebita subito solo la
// differenza per il periodo che resta (niente secondo abbonamento).
// Chi non ha un abbonamento con carta passa dal checkout (?plan=pro).
export async function upgradeToPro(): Promise<{ success: boolean; reason?: 'not_logged' | 'not_stripe' | 'unavailable' | 'already_pro' | 'stripe_error' }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, reason: 'not_logged' }

  const proPrice = process.env.STRIPE_PRICE_ID_PRO
  if (!proPrice) return { success: false, reason: 'unavailable' }

  const service = getServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('subscription_status, subscription_source, subscription_plan')
    .eq('id', user.id)
    .single()
  if (profile?.subscription_plan === 'pro' && profile.subscription_status === 'active') return { success: false, reason: 'already_pro' }
  if (profile?.subscription_status !== 'active' || profile.subscription_source !== 'stripe') {
    return { success: false, reason: 'not_stripe' }
  }

  try {
    const stripe = getStripe()
    const found = await stripe.subscriptions.search({ query: `metadata['userId']:'${user.id}' AND status:'active'`, limit: 1 })
    const subscription = found.data[0]
    const item = subscription?.items.data[0]
    if (!subscription || !item) return { success: false, reason: 'not_stripe' }

    const updated = await stripe.subscriptions.update(subscription.id, {
      items: [{ id: item.id, price: proPrice }],
      proration_behavior: 'always_invoice',
      metadata: { ...subscription.metadata, plan: 'pro' },
    })

    // Il webhook customer.subscription.updated fa lo stesso: qui si aggiorna
    // subito per non far aspettare l'utente.
    await service
      .from('profiles')
      .update({ subscription_plan: 'pro', subscription_status: updated.status === 'active' ? 'active' : profile.subscription_status })
      .eq('id', user.id)

    revalidatePath('/dashboard')
    revalidatePath('/pro')
    return { success: true }
  } catch (err) {
    console.error('Errore passaggio a Pro:', err)
    return { success: false, reason: 'stripe_error' }
  }
}
