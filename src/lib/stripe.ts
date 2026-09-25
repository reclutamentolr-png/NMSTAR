import Stripe from 'stripe'

// Client Stripe creato solo alla prima richiesta, non al caricamento del
// modulo: durante `next build` Next importa le route per raccoglierne la
// configurazione, e se STRIPE_SECRET_KEY non è disponibile in quella fase
// (es. su Vercel) un `new Stripe(...)` a livello di modulo fa fallire
// l'intero deploy con "Neither apiKey nor config.authenticator provided".
let client: Stripe | null = null

export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiVersion: '2024-06-20' as any, // versione API fissata come prima del refactor
    })
  }
  return client
}
