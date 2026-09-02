'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl' // ✅ Aggiunto per ottenere la lingua corrente
import Link from '@/components/LocalizedLink'
import { Mail, Lock, AlertCircle, Loader2, Rocket, Home } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const locale = useLocale() // ✅ Ottiene 'it', 'en', 'fr', ecc.
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Email o password non corretti.')
      setLoading(false)
      return
    }

    if (authData.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_blocked')
        .eq('id', authData.user.id)
        .single()

      if (profileError) {
        console.error('Errore nel controllo profilo:', profileError)
      }

      if (profile?.is_blocked) {
        await supabase.auth.signOut()
        setError('🚫 Il tuo account è stato bloccato dall\'amministratore. Contatta il supporto.')
        setLoading(false)
        return
      }
    }

    // ✅ REINDIRIZZAMENTO CORRETTO: aggiunge la lingua davanti a /dashboard
    router.push(`/${locale}/dashboard`)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      
      {/* Link per tornare alla Home */}
      <Link 
        href="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors font-semibold"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Rocket className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg hidden sm:inline">Network Marketing Program</span>
        <Home className="w-4 h-4 sm:hidden" />
      </Link>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Accedi al tuo account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Per gestire il tuo abbonamento e la tua rete
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          {error && (
            <div className={`mb-4 border-l-4 p-4 rounded-r ${
              error.includes('bloccato') ? 'bg-orange-50 border-orange-400' : 'bg-red-50 border-red-400'
            }`}>
              <p className={`text-sm font-medium ${error.includes('bloccato') ? 'text-orange-700' : 'text-red-700'}`}>
                {error}
              </p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/register" className="text-sm text-indigo-600 hover:underline font-medium">
              Non hai un account? Registrati qui (solo su invito)
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}