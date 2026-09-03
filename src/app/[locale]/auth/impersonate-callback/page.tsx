'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

function ImpersonateCallbackContent() {
  const searchParams = useSearchParams()
  const locale = useLocale()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      const adminId = searchParams.get('impersonating')
      const isRestore = searchParams.get('restore') === '1'

      // ✅ I token arrivano nell'hash dell'URL (#access_token=...)
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      const supabase = createClient()

      if (accessToken && refreshToken) {
        console.log('🔑 [CALLBACK] Salvo la sessione nei cookie...')
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })

        if (sessionError) {
          console.error('❌ [CALLBACK] Errore setSession:', sessionError)
          setError(sessionError.message)
          return
        }
        console.log('✅ [CALLBACK] Sessione salvata correttamente')
      }

      // ✅ Ora i cookie sono pronti: il Server Component vedrà la sessione
      const dest = isRestore
        ? `/${locale}/admin`
        : `/${locale}/dashboard${adminId ? `?impersonating=${adminId}` : ''}`

      console.log('🚀 [CALLBACK] Redirect a:', dest)
      window.location.replace(dest)
    }

    run()
  }, [searchParams, locale])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <div className="text-red-600 text-xl font-bold mb-2">❌ Errore di accesso</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Accesso in corso...</p>
      </div>
    </div>
  )
}

export default function ImpersonateCallbackPage() {
  return (
    <Suspense fallback={null}>
      <ImpersonateCallbackContent />
    </Suspense>
  )
}