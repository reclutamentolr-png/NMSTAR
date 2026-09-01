import { createClient } from '@/lib/supabase/server'
import { Sparkles } from 'lucide-react'

type User = {
  id: string
  first_name: string | null
  last_name: string | null
  referral_code: string | null
  country_code: string | null
  created_at: string
  username: string | null
}

export default async function LatestUsersServer() {
  // ✅ Fetch diretto dal server, nessun useEffect, nessun useState
  const supabase = await createClient()
  
  const { data: users, error } = await supabase
    .rpc('get_public_latest_users', { p_limit: 10 })

  if (error) {
    console.error('Errore caricamento ultimi utenti:', error)
    return (
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 w-full">
        <p className="text-red-300 text-sm text-center">Errore nel caricamento</p>
      </div>
    )
  }

  if (!users || users.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 w-full text-center">
        <p className="text-gray-400 text-sm">Nessun utente registrato</p>
      </div>
    )
  }

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-white/10 w-full">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-yellow-400" />
        <h3 className="text-lg font-bold text-white">
          Ultimi Entrati ({users.length})
        </h3>
      </div>

      {/* ✅ Scroll orizzontale nativo CSS (no JS, no React) */}
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide">
        {(users as User[]).map((user) => (
          <div
            key={user.id}
            className="flex-shrink-0 snap-center w-[280px] sm:w-[300px] bg-white/10 hover:bg-white/15 rounded-xl p-4 border border-white/10 transition-all"
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                <span className="text-white font-bold text-lg">
                  {user.first_name?.[0] || user.username?.[0] || 'U'}
                  {user.last_name?.[0] || ''}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate text-base">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-indigo-300 font-mono truncate">
                  {user.referral_code}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400 bg-white/10 px-2 py-0.5 rounded">
                    {user.country_code || 'IT'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Indicatore scroll */}
      <p className="text-xs text-gray-500 text-center mt-3">
        ← Scorri per vedere altri →
      </p>
    </div>
  )
}