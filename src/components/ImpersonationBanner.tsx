'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, Shield } from 'lucide-react'

function ImpersonationBannerContent() {
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [adminName, setAdminName] = useState<string>('')

  useEffect(() => {
    setMounted(true)

    const imp = searchParams.get('impersonating')
    if (imp) {
      setIsVisible(true)
      localStorage.setItem('impersonatingAdmin', imp)
      fetchAdminName(imp)
    } else {
      const saved = localStorage.getItem('impersonatingAdmin')
      if (saved) {
        setIsVisible(true)
        fetchAdminName(saved)
      }
    }
  }, [searchParams])

  const fetchAdminName = async (adminId: string) => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', adminId)
        .single()

      if (data) setAdminName(`${data.first_name} ${data.last_name}`)
    } catch (e) {}
  }

  // ✅ ESCI E TORNA ADMIN: usa il magic link di ripristino
  const handleExit = async () => {
    if (!confirm('Vuoi uscire dalla modalità impersonificazione e tornare al tuo account admin?')) return

    const restoreUrl = localStorage.getItem('impersonation_restore')
    localStorage.removeItem('impersonation_restore')
    localStorage.removeItem('impersonatingAdmin')

    const supabase = createClient()
    await supabase.auth.signOut()

    // ✅ Ripristina la sessione admin senza rifare il login
    window.location.href = restoreUrl || '/login'
  }

  if (!mounted || !isVisible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="bg-white/20 p-2 rounded-full flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm">⚠️ Modalità Impersonificazione Attiva</p>
            <p className="text-xs text-amber-50 truncate">
              Stai navigando come un altro utente.
              {adminName && <> Account admin: <strong>{adminName}</strong></>}
            </p>
          </div>
        </div>
        <button
          onClick={handleExit}
          className="flex items-center gap-2 px-4 py-2 bg-white text-orange-600 hover:bg-orange-50 rounded-lg text-sm font-bold transition-colors shadow-md flex-shrink-0"
        >
          <Shield className="w-4 h-4" />
          Torna Admin
        </button>
      </div>
    </div>
  )
}

export default function ImpersonationBanner() {
  return (
    <Suspense fallback={null}>
      <ImpersonationBannerContent />
    </Suspense>
  )
}