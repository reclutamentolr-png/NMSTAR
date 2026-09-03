'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function ImpersonateRedirectContent() {
  const searchParams = useSearchParams()
  const magicLinkUrl = searchParams.get('url')
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState('Inizializzazione...')

  useEffect(() => {
    const processImpersonation = async () => {
      if (!magicLinkUrl) {
        setError('URL magic link mancante')
        setTimeout(() => window.location.href = '/login', 2000)
        return
      }

      const supabase = createClient()

      try {
        console.log('🔄 Step 1: Logout dalla sessione corrente...')
        setStep('Logout dalla sessione admin...')
        
        // ✅ Usa signOut() SENZA scope: 'global' 
        // Questo pulisce solo la sessione corrente, non invalida tutte le sessioni
        await supabase.auth.signOut()

        console.log('🔄 Step 2: Pulizia storage client...')
        setStep('Pulizia cache...')
        
        // Pulisci solo lo storage client (non i cookie globali)
        localStorage.clear()
        sessionStorage.clear()

        console.log('🔄 Step 3: Redirect al magic link...')
        setStep('Accesso come utente impersonato...')
        
        // Naviga al magic link che creerà la nuova sessione
        window.location.href = magicLinkUrl
      } catch (err: any) {
        console.error('❌ Errore impersonificazione:', err)
        setError(err.message || 'Errore sconosciuto')
        setTimeout(() => window.location.href = '/login', 3000)
      }
    }

    processImpersonation()
  }, [magicLinkUrl])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-2">❌ Errore</div>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-500 mt-2">Redirect al login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">{step}</p>
        <p className="text-sm text-gray-400 mt-2">Attendere prego...</p>
      </div>
    </div>
  )
}

export default function ImpersonateRedirectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <ImpersonateRedirectContent />
    </Suspense>
  )
}