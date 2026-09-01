'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react'

type User = {
  id: string
  first_name: string | null
  last_name: string | null
  referral_code: string | null
  country_code: string | null
  created_at: string
  username: string | null
}

type State = {
  users: User[]
  loading: boolean
  error: string | null
  attempt: number
}

export default function NewUsersCarousel() {
  const [state, setState] = useState<State>({
    users: [],
    loading: true,
    error: null,
    attempt: 1,
  })
  const mountedRef = useRef(true)

  const fetchData = async (attempt: number) => {
    console.log(`🔄 [Carousel] Tentativo ${attempt}/3...`)
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_public_latest_users', {
        p_limit: 10,
      })

      if (!mountedRef.current) {
        console.log('⚠️ Componente smontato, ignoro risposta')
        return
      }

      if (error) {
        console.error('❌ Errore RPC:', error)
        if (attempt < 3) {
          console.log(`🔄 Retry tra 2 secondi...`)
          setTimeout(() => fetchData(attempt + 1), 2000)
        } else {
          setState({ users: [], loading: false, error: error.message, attempt })
        }
      } else {
        console.log('✅ Dati ricevuti:', data?.length || 0)
        setState({
          users: (data as User[]) || [],
          loading: false,
          error: null,
          attempt,
        })
      }
    } catch (err: any) {
      console.error('❌ Eccezione:', err)
      if (attempt < 3) {
        setTimeout(() => fetchData(attempt + 1), 2000)
      } else {
        setState({ users: [], loading: false, error: err.message, attempt })
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true
    fetchData(1)

    return () => {
      mountedRef.current = false
    }
  }, [])

  // Debug log
  console.log('[Carousel] Render:', {
    loading: state.loading,
    users: state.users.length,
    error: state.error,
    attempt: state.attempt
  })

  // Loading con retry button
  if (state.loading) {
    return (
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-white/10 w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
            <h3 className="text-lg font-bold text-white">Ultimi Entrati</h3>
          </div>
          <button
            onClick={() => fetchData(state.attempt + 1)}
            className="text-xs text-white/70 hover:text-white flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
        <div className="h-24 bg-white/10 rounded-xl animate-pulse"></div>
        <p className="text-xs text-white/50 mt-3 text-center">
          Tentativo {state.attempt}/3...
        </p>
      </div>
    )
  }

  // Errore con retry button
  if (state.error) {
    return (
      <div className="bg-red-500/10 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-red-500/30 w-full">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">Errore</h3>
            <p className="text-red-300 text-xs break-all mb-3">{state.error}</p>
            <button
              onClick={() => fetchData(1)}
              className="bg-red-500/20 hover:bg-red-500/30 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Riprova
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Nessun utente
  if (state.users.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 w-full text-center">
        <p className="text-gray-400 text-sm">Nessun utente registrato</p>
      </div>
    )
  }

  // Lista utenti (semplice griglia verticale)
  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-white/10 w-full">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-yellow-400" />
        <h3 className="text-lg font-bold text-white">
          Ultimi Entrati ({state.users.length})
        </h3>
      </div>

      <div className="space-y-3">
        {state.users.map(user => (
          <div
            key={user.id}
            className="bg-white/10 rounded-xl p-3 border border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">
                  {user.first_name?.[0] || 'U'}
                  {user.last_name?.[0] || ''}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate text-sm">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-indigo-300 font-mono truncate">
                  {user.referral_code}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}